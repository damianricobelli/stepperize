import type {
	Get,
	HistoryEntry,
	InitialState,
	PersistConfig,
	PersistManager,
	Step,
	StepMetadata,
	StepStatus,
	StepStatuses,
	TransitionContext,
} from "@stepperize/core";
import {
	areDependenciesSatisfied,
	calculateProgress,
	createPersistedState,
	createPersistManager,
	findNextValidStepIndex,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getCompletedSteps,
	getInitialMetadata,
	getInitialStatuses,
	getInitialStepIndex,
	isStepCompleted,
	persistedStateToInitialState,
} from "@stepperize/core";
import * as React from "react";
import type {
	AsyncInitState,
	AsyncInitStatus,
	ScopedProps,
	StepperBuilder,
	StepperConfigOptions,
	StepperDefinition,
	StepperInstance,
	UseStepperProps,
} from "./types";

// =============================================================================
// DEFINE STEPPER
// =============================================================================

/**
 * Creates a stepper definition with steps and utility functions.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns A StepperBuilder that can be used directly or configured with .config()
 *
 * @example
 * ```ts
 * // Basic usage (no config)
 * const { useStepper, Scoped } = defineStepper(
 *   { id: "step-1", title: "Step 1" },
 *   { id: "step-2", title: "Step 2" }
 * );
 *
 * // With configuration
 * const { useStepper, Scoped } = defineStepper(
 *   { id: "step-1", title: "Step 1" },
 *   { id: "step-2", title: "Step 2" }
 * ).config({
 *   initialStep: "step-1",
 *   mode: "linear",
 *   onBeforeTransition: (ctx) => {
 *     console.log(`${ctx.from.id} -> ${ctx.to.id}`);
 *     return true;
 *   }
 * });
 * ```
 */
export function defineStepper<const Steps extends Step[]>(
	...steps: Steps
): StepperBuilder<Steps> {
	// Create the base definition without config
	const baseDefinition = createStepperDefinition(steps, {});

	// Return builder with .config() method
	return {
		...baseDefinition,
		config(options: StepperConfigOptions<Steps>): StepperDefinition<Steps> {
			return createStepperDefinition(steps, options);
		},
	};
}

// =============================================================================
// INTERNAL IMPLEMENTATION
// =============================================================================

/**
 * Creates the stepper definition with the given configuration.
 */
function createStepperDefinition<Steps extends Step[]>(
	steps: Steps,
	configOptions: StepperConfigOptions<Steps>,
): StepperDefinition<Steps> {
	const Context = React.createContext<StepperInstance<Steps> | null>(null);
	const utils = generateStepperUtils(...steps);

	/**
	 * Internal hook that creates the stepper instance.
	 */
	function useStepperInternal(props: UseStepperProps<Steps> = {}): StepperInstance<Steps> {
		// Merge props with config options (props take precedence)
		const mergedConfig = React.useMemo(
			() => ({
				initialStep: props.initialStep ?? configOptions.initialStep,
				initialMetadata: { ...configOptions.initialMetadata, ...props.initialMetadata },
				initialStatuses: { ...configOptions.initialStatuses, ...props.initialStatuses },
				mode: configOptions.mode ?? "free",
				getInitialState: configOptions.getInitialState,
				persist: configOptions.persist,
				onBeforeTransition: configOptions.onBeforeTransition,
				onAfterTransition: configOptions.onAfterTransition,
			}),
			[props.initialStep, props.initialMetadata, props.initialStatuses],
		);

		// Calculate initial values
		const initialStepIndex = React.useMemo(
			() => getInitialStepIndex(steps, mergedConfig.initialStep),
			[mergedConfig.initialStep],
		);

		// ==========================================================================
		// PERSISTENCE SETUP
		// ==========================================================================

		const persistManager = React.useMemo<PersistManager<Steps> | null>(
			() => (mergedConfig.persist ? createPersistManager(mergedConfig.persist) : null),
			[mergedConfig.persist],
		);

		// Track if we've hydrated from storage
		const [isHydrated, setIsHydrated] = React.useState(!persistManager);

		// ==========================================================================
		// ASYNC INITIALIZATION STATE
		// ==========================================================================

		const hasAsyncInit = Boolean(mergedConfig.getInitialState);
		const hasPersist = Boolean(persistManager);

		// Start as pending if we have async init OR persistence to load
		const [asyncInitStatus, setAsyncInitStatus] = React.useState<AsyncInitStatus>(
			hasAsyncInit || hasPersist ? "pending" : "success",
		);
		const [asyncInitError, setAsyncInitError] = React.useState<{
			error: unknown;
			timestamp: number;
		} | null>(null);

		// Track if we need to re-run async init (for retry)
		const [asyncInitTrigger, setAsyncInitTrigger] = React.useState(0);

		// State
		const [currentIndex, setCurrentIndex] = React.useState(initialStepIndex);
		const [metadata, setMetadata] = React.useState<StepMetadata<Steps>>(() =>
			getInitialMetadata(steps, mergedConfig.initialMetadata),
		);
		const [statuses, setStatuses] = React.useState<StepStatuses<Steps>>(() =>
			getInitialStatuses(steps, mergedConfig.initialStatuses),
		);
		const [history, setHistory] = React.useState<HistoryEntry<Steps>[]>(() => [
			{ step: steps[initialStepIndex], index: initialStepIndex, timestamp: Date.now() },
		]);
		const [historyIndex, setHistoryIndex] = React.useState(0);

		// ==========================================================================
		// APPLY INITIAL STATE HELPER
		// ==========================================================================

		/**
		 * Apply the initial state from async initialization or persistence.
		 * Merges with sync initial values (loaded values take precedence).
		 */
		const applyInitialState = React.useCallback(
			(state: InitialState<Steps>) => {
				// Update step if provided
				if (state.step) {
					const newIndex = getInitialStepIndex(steps, state.step);
					setCurrentIndex(newIndex);
					setHistory([{ step: steps[newIndex], index: newIndex, timestamp: Date.now() }]);
					setHistoryIndex(0);
				}

				// Merge metadata (loaded values take precedence)
				if (state.metadata) {
					setMetadata((prev) => ({
						...prev,
						...state.metadata,
					}) as StepMetadata<Steps>);
				}

				// Merge statuses (loaded values take precedence)
				if (state.statuses) {
					setStatuses((prev) => ({
						...prev,
						...state.statuses,
					}) as StepStatuses<Steps>);
				}
			},
			[],
		);

		// ==========================================================================
		// INITIALIZATION EFFECT (Persistence + Async)
		// ==========================================================================

		React.useEffect(() => {
			// If no persistence and no async init, nothing to do
			if (!persistManager && !mergedConfig.getInitialState) return;

			let isCancelled = false;
			setAsyncInitStatus("pending");
			setAsyncInitError(null);

			const runInitialization = async () => {
				try {
					// Step 1: Try to load from persistence first
					if (persistManager) {
						const loadResult = await persistManager.load();

						if (!isCancelled && loadResult.success) {
							// Apply persisted state
							const initialState = persistedStateToInitialState(loadResult.state);
							applyInitialState(initialState);
							setIsHydrated(true);

							// If no async init, we're done
							if (!mergedConfig.getInitialState) {
								setAsyncInitStatus("success");
								return;
							}
						} else {
							setIsHydrated(true);
						}
					}

					// Step 2: Run async init if configured
					// Note: Async init takes precedence over persisted state
					if (mergedConfig.getInitialState) {
						const result = await mergedConfig.getInitialState();

						if (isCancelled) return;

						// Apply async init result (takes precedence)
						applyInitialState(result);
					}

					if (!isCancelled) {
						setAsyncInitStatus("success");
					}
				} catch (error) {
					if (isCancelled) return;

					setAsyncInitError({ error, timestamp: Date.now() });
					setAsyncInitStatus("error");
					setIsHydrated(true); // Mark as hydrated even on error
				}
			};

			runInitialization();

			return () => {
				isCancelled = true;
			};
		}, [asyncInitTrigger, persistManager, mergedConfig.getInitialState, applyInitialState]);

		// ==========================================================================
		// AUTO-SAVE EFFECT (Persistence)
		// ==========================================================================

		// Track the current step ID for persistence
		const currentStepId = steps[currentIndex].id as Get.Id<Steps>;

		React.useEffect(() => {
			// Don't save until we've hydrated (to avoid overwriting with initial state)
			if (!persistManager || !isHydrated) return;

			// Don't save while async init is pending
			if (asyncInitStatus === "pending") return;

			// Save state
			const stateToSave = createPersistedState<Steps>(currentStepId, metadata, statuses);
			persistManager.save(stateToSave);
		}, [persistManager, isHydrated, asyncInitStatus, currentStepId, metadata, statuses]);

		// ==========================================================================
		// RETRY & ASYNC INIT STATE
		// ==========================================================================

		// Retry function for async init
		const retryAsyncInit = React.useCallback(() => {
			if (!mergedConfig.getInitialState && !persistManager) return;
			setAsyncInitTrigger((prev) => prev + 1);
		}, [mergedConfig.getInitialState, persistManager]);

		// Build async init state object
		const asyncInitState = React.useMemo<AsyncInitState<Steps>>(
			() => ({
				status: asyncInitStatus,
				isLoading: asyncInitStatus === "pending",
				isSuccess: asyncInitStatus === "success",
				isError: asyncInitStatus === "error",
				error: asyncInitError,
				retry: retryAsyncInit,
			}),
			[asyncInitStatus, asyncInitError, retryAsyncInit],
		);

		// ==========================================================================
		// CLEAR PERSISTENCE HELPER
		// ==========================================================================

		const clearPersistedState = React.useCallback(async () => {
			if (persistManager) {
				await persistManager.clear();
			}
		}, [persistManager]);

		// Derived state
		const current = steps[currentIndex];
		const isLast = currentIndex === steps.length - 1;
		const isFirst = currentIndex === 0;
		const progress = calculateProgress(statuses, steps.length);
		const completedSteps = getCompletedSteps(steps, statuses);

		// Create transition context for callbacks
		const createContext = React.useCallback(
			(targetIndex: number, direction: "next" | "prev" | "goTo"): TransitionContext<Steps> => ({
				from: steps[currentIndex],
				to: steps[targetIndex],
				metadata,
				statuses,
				direction,
				fromIndex: currentIndex,
				toIndex: targetIndex,
			}),
			[currentIndex, metadata, statuses],
		);

		// Navigation with callbacks
		const navigateTo = React.useCallback(
			async (targetIndex: number, direction: "next" | "prev" | "goTo") => {
				// Validate bounds
				if (targetIndex < 0 || targetIndex >= steps.length) {
					const errorDirection = targetIndex < 0 ? "prev" : "next";
					throw new Error(
						`Cannot navigate ${errorDirection} from step "${current.id}": already at the ${targetIndex < 0 ? "first" : "last"} step`,
					);
				}

				// Check mode restrictions
				if (mergedConfig.mode === "linear") {
					// In linear mode, can only go back or forward one step at a time
					if (direction === "goTo" && targetIndex > currentIndex + 1) {
						// Check if all intermediate steps are completed
						for (let i = currentIndex; i < targetIndex; i++) {
							if (statuses[steps[i].id as Get.Id<Steps>] !== "success") {
								throw new Error(
									`Cannot skip to step "${steps[targetIndex].id}" in linear mode: step "${steps[i].id}" is not completed`,
								);
							}
						}
					}
				}

				// Check dependencies
				const targetStep = steps[targetIndex];
				if (!areDependenciesSatisfied(targetStep, statuses)) {
					const missingDeps = targetStep.requires?.filter(
						(reqId: string) => statuses[reqId as Get.Id<Steps>] !== "success",
					);
					throw new Error(
						`Cannot access step "${targetStep.id}": required steps not completed: ${missingDeps?.join(", ")}`,
					);
				}

				// Execute onBeforeTransition callback
				if (mergedConfig.onBeforeTransition) {
					const ctx = createContext(targetIndex, direction);
					const shouldProceed = await mergedConfig.onBeforeTransition(ctx);
					if (shouldProceed === false) {
						return; // Navigation cancelled
					}
				}

				// Update state
				setCurrentIndex(targetIndex);

				// Update history
				setHistory((prev) => {
					const newHistory = [
						...prev.slice(0, historyIndex + 1),
						{ step: steps[targetIndex], index: targetIndex, timestamp: Date.now() },
					];
					return newHistory;
				});
				setHistoryIndex((prev) => prev + 1);

				// Execute onAfterTransition callback
				if (mergedConfig.onAfterTransition) {
					const ctx = createContext(targetIndex, direction);
					await mergedConfig.onAfterTransition(ctx);
				}
			},
			[currentIndex, statuses, historyIndex, createContext, mergedConfig, current.id],
		);

		// Build the stepper instance
		const stepper = React.useMemo<StepperInstance<Steps>>(() => {
			return {
				// State
				all: steps,
				current,
				currentIndex,
				isLast,
				isFirst,
				metadata,
				statuses,
				progress,
				completedSteps,

				// Navigation
				next() {
					const nextIndex = findNextValidStepIndex(steps, currentIndex, 1, metadata);
					if (nextIndex === -1) {
						navigateTo(currentIndex + 1, "next"); // Will throw appropriate error
					} else {
						navigateTo(nextIndex, "next");
					}
				},
				prev() {
					const prevIndex = findNextValidStepIndex(steps, currentIndex, -1, metadata);
					if (prevIndex === -1) {
						navigateTo(currentIndex - 1, "prev"); // Will throw appropriate error
					} else {
						navigateTo(prevIndex, "prev");
					}
				},
				goTo(id) {
					const index = steps.findIndex((s) => s.id === id);
					if (index === -1) {
						throw new Error(`Step with id "${String(id)}" not found.`);
					}
					navigateTo(index, "goTo");
				},
				reset(options = {}) {
					const newIndex = initialStepIndex;
					setCurrentIndex(newIndex);

					if (!options.keepMetadata) {
						setMetadata(getInitialMetadata(steps, mergedConfig.initialMetadata));
					}
					if (!options.keepStatuses) {
						setStatuses(getInitialStatuses(steps, mergedConfig.initialStatuses));
					}

					// Clear persisted state if requested
					if (options.clearPersisted && persistManager) {
						persistManager.clear();
					}

					setHistory([{ step: steps[newIndex], index: newIndex, timestamp: Date.now() }]);
					setHistoryIndex(0);
				},

				// Step retrieval
				get(id) {
					const step = steps.find((s) => s.id === id);
					if (!step) {
						throw new Error(`Step with id "${String(id)}" not found.`);
					}
					return step as Get.StepById<Steps, typeof id>;
				},

				// Status management
				getStatus(id) {
					return statuses[id];
				},
				setStatus(id, status) {
					setStatuses((prev) => {
						if (prev[id] === status) return prev;
						return { ...prev, [id]: status };
					});
				},
				isCompleted(id) {
					return isStepCompleted(id, statuses);
				},
				canAccess(id) {
					const step = steps.find((s) => s.id === id);
					if (!step) return false;
					return areDependenciesSatisfied(step, statuses);
				},

				// Metadata management
				setMetadata(id, values) {
					setMetadata((prev) => {
						if (prev[id as keyof typeof prev] === values) return prev;
						return { ...prev, [id]: values };
					});
				},
				getMetadata<Id extends Get.Id<Steps>>(id: Id): StepMetadata<Steps>[Id] {
					return metadata[id] as StepMetadata<Steps>[Id];
				},
				resetMetadata(keepInitialMetadata) {
					setMetadata(
						getInitialMetadata(steps, keepInitialMetadata ? mergedConfig.initialMetadata : undefined),
					);
				},

				// Transition callbacks
				async beforeNext(callback) {
					const shouldProceed = await callback();
					if (shouldProceed !== false) {
						this.next();
					}
				},
				async afterNext(callback) {
					this.next();
					await callback();
				},
				async beforePrev(callback) {
					const shouldProceed = await callback();
					if (shouldProceed !== false) {
						this.prev();
					}
				},
				async afterPrev(callback) {
					this.prev();
					await callback();
				},
				async beforeGoTo(id, callback) {
					const shouldProceed = await callback();
					if (shouldProceed !== false) {
						this.goTo(id);
					}
				},
				async afterGoTo(id, callback) {
					this.goTo(id);
					await callback();
				},

				// Conditional rendering
				...generateCommonStepperUseFns(steps, current, currentIndex),

				// History
				canUndo: historyIndex > 0,
				canRedo: historyIndex < history.length - 1,
				undo() {
					if (historyIndex > 0) {
						const newHistoryIndex = historyIndex - 1;
						const entry = history[newHistoryIndex];
						setCurrentIndex(entry.index);
						setHistoryIndex(newHistoryIndex);
					}
				},
				redo() {
					if (historyIndex < history.length - 1) {
						const newHistoryIndex = historyIndex + 1;
						const entry = history[newHistoryIndex];
						setCurrentIndex(entry.index);
						setHistoryIndex(newHistoryIndex);
					}
				},
				history,

				// Async initialization
				asyncInit: asyncInitState,

				// Persistence
				clearPersistedState,
			};
		}, [
			current,
			currentIndex,
			isLast,
			isFirst,
			metadata,
			statuses,
			progress,
			completedSteps,
			history,
			historyIndex,
			navigateTo,
			initialStepIndex,
			mergedConfig.initialMetadata,
			mergedConfig.initialStatuses,
			asyncInitState,
		]);

		return stepper;
	}

	/**
	 * Public hook that uses context if available, otherwise creates new instance.
	 */
	function useStepper(props: UseStepperProps<Steps> = {}): StepperInstance<Steps> {
		const contextValue = React.useContext(Context);
		// If we're inside a Scoped provider, use the context value
		// Otherwise, create a new stepper instance
		if (contextValue !== null) {
			return contextValue;
		}
		return useStepperInternal(props);
	}

	/**
	 * Scoped provider component.
	 */
	function Scoped({
		initialStep,
		initialMetadata,
		initialStatuses,
		children,
	}: ScopedProps<Steps>): React.ReactElement {
		const stepper = useStepperInternal({
			initialStep,
			initialMetadata,
			initialStatuses,
		});

		return React.createElement(Context.Provider, { value: stepper }, children);
	}

	return {
		steps,
		utils,
		Scoped,
		useStepper,
	};
}

// =============================================================================
// ASYNC INIT HELPERS
// =============================================================================

/**
 * Type guard to check if async initialization is ready.
 * Use this to narrow the stepper type and ensure safe access.
 *
 * @param stepper - The stepper instance.
 * @returns `true` if async initialization is complete (success or no async init).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const stepper = useStepper();
 *
 *   if (!isStepperReady(stepper)) {
 *     if (stepper.asyncInit.isError) {
 *       return <ErrorDisplay error={stepper.asyncInit.error} onRetry={stepper.asyncInit.retry} />;
 *     }
 *     return <LoadingSpinner />;
 *   }
 *
 *   // Stepper is ready to use
 *   return <StepContent step={stepper.current} />;
 * }
 * ```
 */
export function isStepperReady<Steps extends Step[]>(
	stepper: StepperInstance<Steps>,
): boolean {
	return stepper.asyncInit.isSuccess;
}

/**
 * Hook that waits for async initialization to complete.
 * Returns a tuple with loading state and the stepper.
 *
 * @param stepper - The stepper instance.
 * @returns Tuple of [isReady, stepper].
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const stepper = useStepper();
 *   const [isReady] = useWaitForAsyncInit(stepper);
 *
 *   if (!isReady) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return <StepContent step={stepper.current} />;
 * }
 * ```
 */
export function useWaitForAsyncInit<Steps extends Step[]>(
	stepper: StepperInstance<Steps>,
): [isReady: boolean, stepper: StepperInstance<Steps>] {
	return [stepper.asyncInit.isSuccess, stepper];
}

// =============================================================================
// RE-EXPORT FOR CONVENIENCE
// =============================================================================

export type { StepperBuilder, StepperConfigOptions, StepperDefinition, StepperInstance };
export type { AsyncInitState, AsyncInitStatus, GetInitialStateFn } from "./types";
