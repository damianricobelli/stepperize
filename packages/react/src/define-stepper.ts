import type {
	BaseStepStatus,
	Get,
	HistoryEntry,
	Initial,
	InitialState,
	PersistManager,
	Step,
	StepMetadata,
	StepStatuses,
	TransitionContext,
} from "@stepperize/core";
import type { StepInfo } from "./types";
import {
	createPersistedState,
	createPersistManager,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStatuses,
	getInitialStepIndex,
	getSyncInitialState,
	isInitialFunction,
	isStepCompleted,
	persistedStateToInitialState,
	resolveStepStatus,
} from "@stepperize/core";
import * as React from "react";
import {
	Actions,
	Content,
	Description,
	Indicator,
	Item,
	List,
	Next,
	Prev,
	Root,
	Separator,
	Title,
	Trigger,
} from "./primitives";
import type {
	ScopedProps,
	StepperConfigOptions,
	StepperDefinition,
	StepperError,
	StepperInstance,
	StepperStatus,
	TypedStepperPrimitives,
	UseStepperProps,
} from "./types";

// =============================================================================
// DEFINE STEPPER
// =============================================================================

/**
 * Creates a stepper definition with steps and utility functions.
 *
 * @param steps - The steps to be included in the stepper.
 * @param config - Optional configuration options.
 * @returns A StepperDefinition with hooks, utilities and components.
 *
 * @example
 * ```ts
 * // Basic usage (no config)
 * const { useStepper, Scoped } = defineStepper([
 *   { id: "step-1", title: "Step 1" },
 *   { id: "step-2", title: "Step 2" }
 * ]);
 *
 * // With initial state
 * const { useStepper, Scoped } = defineStepper(
 *   [
 *     { id: "step-1", title: "Step 1" },
 *     { id: "step-2", title: "Step 2" }
 *   ],
 *   {
 *     initial: { step: "step-1" },
 *     mode: "linear",
 *     onBeforeTransition: (ctx) => {
 *       console.log(`${ctx.from.id} -> ${ctx.to.id}`);
 *       return true;
 *     }
 *   }
 * );
 *
 * // With async initial data
 * const { useStepper } = defineStepper(steps, {
 *   initial: async () => {
 *     const saved = await fetchProgress();
 *     return { step: saved.step, metadata: saved.data };
 *   }
 * });
 * ```
 */
export function defineStepper<const Steps extends Step[]>(
	steps: Steps,
	config: StepperConfigOptions<Steps> = {},
): StepperDefinition<Steps> {
	return createStepperDefinition(steps, config);
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
		// Get sync initial state from config (undefined if async function)
		const configSyncInitial = getSyncInitialState(configOptions.initial);

		// Merge initial state: props.initial takes precedence over config sync initial
		const mergedInitial = React.useMemo<InitialState<Steps>>(() => {
			const base = configSyncInitial ?? {};
			const override = props.initial ?? {};
			return {
				step: override.step ?? base.step,
				metadata: { ...base.metadata, ...override.metadata },
				statuses: { ...base.statuses, ...override.statuses },
			};
		}, [props.initial, configSyncInitial]);

		// Check if config has async initial function
		const hasAsyncInitial = isInitialFunction(configOptions.initial);

		// Merged config for other options
		const mergedConfig = React.useMemo(
			() => ({
				mode: configOptions.mode ?? "free",
				initial: configOptions.initial,
				persist: configOptions.persist,
				onBeforeTransition: configOptions.onBeforeTransition,
				onAfterTransition: configOptions.onAfterTransition,
			}),
			[],
		);

		// Calculate initial values from sync initial state
		const initialStepIndex = React.useMemo(
			() => getInitialStepIndex(steps, mergedInitial.step),
			[mergedInitial.step],
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
		// STATUS STATE
		// ==========================================================================

		const hasPersist = Boolean(persistManager);

		// Start as pending if we have async initial OR persistence to load
		const [status, setStatus] = React.useState<StepperStatus>(
			hasAsyncInitial || hasPersist ? "pending" : "success",
		);
		const [error, setError] = React.useState<StepperError | null>(null);

		// Track if we need to re-run initialization (for retry)
		const [initTrigger, setInitTrigger] = React.useState(0);

		// State
		const [currentIndex, setCurrentIndex] = React.useState(initialStepIndex);
		const [metadata, setMetadata] = React.useState<StepMetadata<Steps>>(() =>
			getInitialMetadata(steps, mergedInitial.metadata),
		);
		const [statuses, setStatuses] = React.useState<StepStatuses<Steps>>(() =>
			getInitialStatuses(steps, mergedInitial.statuses),
		);
		const [history, setHistory] = React.useState<HistoryEntry<Steps>[]>(() => [
			{ step: steps[initialStepIndex], index: initialStepIndex, timestamp: Date.now() },
		]);
		const [historyIndex, setHistoryIndex] = React.useState(0);
		const [isTransitioning, setIsTransitioning] = React.useState(false);
		const transitioningRef = React.useRef(0);

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
			// If no persistence and no async initial, nothing to do
			if (!persistManager && !hasAsyncInitial) return;

			let isCancelled = false;
			setStatus("pending");
			setError(null);

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

							// If no async initial, we're done
							if (!hasAsyncInitial) {
								setStatus("success");
								return;
							}
						} else {
							setIsHydrated(true);
						}
					}

					// Step 2: Run async initial if configured
					// Note: async initial takes precedence over persisted state
					if (hasAsyncInitial && isInitialFunction(mergedConfig.initial)) {
						const result = await mergedConfig.initial();

						if (isCancelled) return;

						// Apply async result (takes precedence)
						applyInitialState(result);
					}

					if (!isCancelled) {
						setStatus("success");
					}
				} catch (err) {
					if (isCancelled) return;

					setError({ error: err, timestamp: Date.now() });
					setStatus("error");
					setIsHydrated(true); // Mark as hydrated even on error
				}
			};

			runInitialization();

			return () => {
				isCancelled = true;
			};
		}, [initTrigger, persistManager, hasAsyncInitial, mergedConfig.initial, applyInitialState]);

		// ==========================================================================
		// AUTO-SAVE EFFECT (Persistence)
		// ==========================================================================

		// Track the current step ID for persistence
		const currentStepId = steps[currentIndex].id as Get.Id<Steps>;

		React.useEffect(() => {
			// Don't save until we've hydrated (to avoid overwriting with initial state)
			if (!persistManager || !isHydrated) return;

			// Don't save while pending
			if (status === "pending") return;

			// Save state
			const stateToSave = createPersistedState<Steps>(currentStepId, metadata, statuses);
			persistManager.save(stateToSave);
		}, [persistManager, isHydrated, status, currentStepId, metadata, statuses]);

		// ==========================================================================
		// RETRY FUNCTION
		// ==========================================================================

		// Retry function for initialization
		const retry = React.useCallback(() => {
			if (!hasAsyncInitial && !persistManager) return;
			setInitTrigger((prev) => prev + 1);
		}, [hasAsyncInitial, persistManager]);

		// ==========================================================================
		// CLEAR PERSISTENCE HELPER
		// ==========================================================================

		const clearPersistedState = React.useCallback(async () => {
			if (persistManager) {
				await persistManager.clear();
			}
		}, [persistManager]);

		// Helper to create StepInfo for any step
		const createStepInfo = React.useCallback(
			<Id extends Get.Id<Steps>>(id: Id): StepInfo<Steps, Id> => {
				const stepIndex = steps.findIndex((s) => s.id === id);
				const step = steps[stepIndex];
				if (!step) {
					throw new Error(`Step with id "${String(id)}" not found.`);
				}
				const baseStatus = statuses[id];
				const stepMetadata = metadata[id];
				// Resolve the status based on base status and navigation position
				const resolvedStatus = resolveStepStatus(baseStatus, stepIndex, currentIndex);
				return {
					data: step as Get.StepById<Steps, Id>,
					status: resolvedStatus,
					metadata: stepMetadata,
					isCompleted: resolvedStatus === "success",
					setStatus: (newStatus: BaseStepStatus) => {
						setStatuses((prev) => {
							if (prev[id] === newStatus) return prev;
							return { ...prev, [id]: newStatus };
						});
					},
					setMetadata: (values: StepMetadata<Steps>[Id]) => {
						setMetadata((prev) => {
							if (prev[id as keyof typeof prev] === values) return prev;
							return { ...prev, [id]: values };
						});
					},
				};
			},
			[steps, statuses, metadata, currentIndex],
		);

		// Create array of all StepInfo - this is the source of truth
		const stepsArray = React.useMemo<StepInfo<Steps, Get.Id<Steps>>[]>(() => {
			return steps.map((step) => createStepInfo(step.id as Get.Id<Steps>));
		}, [steps, createStepInfo]);

		// Derived state - all computed from stepsArray
		const current = stepsArray[currentIndex];
		const isFirst = currentIndex === 0;
		const isLast = currentIndex === steps.length - 1;
		const progress = React.useMemo(() => {
			const completed = stepsArray.filter((s) => s.isCompleted).length;
			return steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;
		}, [stepsArray, steps.length]);
		const completedSteps = React.useMemo(() => {
			return stepsArray.filter((s) => s.isCompleted);
		}, [stepsArray]);

		// Step lookup map for O(1) access
		const stepsMap = React.useMemo(() => {
			const map = new Map<Get.Id<Steps>, StepInfo<Steps, Get.Id<Steps>>>();
			stepsArray.forEach((stepInfo) => {
				map.set(stepInfo.data.id as Get.Id<Steps>, stepInfo);
			});
			return map;
		}, [stepsArray]);

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
					const currentStep = steps[currentIndex];
					throw new Error(
						`Cannot navigate ${errorDirection} from step "${currentStep.id}": already at the ${targetIndex < 0 ? "first" : "last"} step`,
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

				transitioningRef.current += 1;
				if (transitioningRef.current === 1) {
					setIsTransitioning(true);
				}
				try {
					// Execute onBeforeTransition callback
					if (mergedConfig.onBeforeTransition) {
						const ctx = createContext(targetIndex, direction);
						const shouldProceed = await mergedConfig.onBeforeTransition(ctx);
						if (shouldProceed === false) {
							transitioningRef.current -= 1;
							if (transitioningRef.current === 0) {
								setIsTransitioning(false);
							}
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
				} finally {
					transitioningRef.current -= 1;
					if (transitioningRef.current === 0) {
						setIsTransitioning(false);
					}
				}
			},
			[currentIndex, statuses, historyIndex, createContext, mergedConfig, currentStepId],
		);

		// Build the stepper instance
		const stepper = React.useMemo<StepperInstance<Steps>>(() => {
			return {
				// State - steps array is the source of truth
				steps: stepsArray,
				current,
				currentIndex,
				isFirst,
				isLast,
				progress,
				completedSteps,

				// Navigation
				next() {
					return navigateTo(currentIndex + 1, "next");
				},
				prev() {
					return navigateTo(currentIndex - 1, "prev");
				},
				goTo(id) {
					const index = steps.findIndex((s) => s.id === id);
					if (index === -1) {
						throw new Error(`Step with id "${String(id)}" not found.`);
					}
					return navigateTo(index, "goTo");
				},
				reset(options = {}) {
					const newIndex = initialStepIndex;
					setCurrentIndex(newIndex);

					if (!options.keepMetadata) {
						setMetadata(getInitialMetadata(steps, mergedInitial.metadata));
					}
					if (!options.keepStatuses) {
						setStatuses(getInitialStatuses(steps, mergedInitial.statuses));
					}

					// Clear persisted state if requested
					if (options.clearPersisted && persistManager) {
						persistManager.clear();
					}

					setHistory([{ step: steps[newIndex], index: newIndex, timestamp: Date.now() }]);
					setHistoryIndex(0);
				},

				// Step access
				step: <Id extends Get.Id<Steps>>(id: Id) => {
					return createStepInfo(id);
				},

				// Metadata management
				resetMetadata(keepInitialMetadata) {
					setMetadata(
						getInitialMetadata(steps, keepInitialMetadata ? mergedInitial.metadata : undefined),
					);
				},

				// Transition callbacks
				async beforeNext(callback) {
					transitioningRef.current += 1;
					if (transitioningRef.current === 1) {
						setIsTransitioning(true);
					}
					try {
						const shouldProceed = await callback();
						if (shouldProceed !== false) {
							await this.next();
						}
					} finally {
						transitioningRef.current -= 1;
						if (transitioningRef.current === 0) {
							setIsTransitioning(false);
						}
					}
				},
				async afterNext(callback) {
					transitioningRef.current += 1;
					if (transitioningRef.current === 1) {
						setIsTransitioning(true);
					}
					try {
						await this.next();
						await callback();
					} finally {
						transitioningRef.current -= 1;
						if (transitioningRef.current === 0) {
							setIsTransitioning(false);
						}
					}
				},
				async beforePrev(callback) {
					transitioningRef.current += 1;
					if (transitioningRef.current === 1) {
						setIsTransitioning(true);
					}
					try {
						const shouldProceed = await callback();
						if (shouldProceed !== false) {
							await this.prev();
						}
					} finally {
						transitioningRef.current -= 1;
						if (transitioningRef.current === 0) {
							setIsTransitioning(false);
						}
					}
				},
				async afterPrev(callback) {
					transitioningRef.current += 1;
					if (transitioningRef.current === 1) {
						setIsTransitioning(true);
					}
					try {
						await this.prev();
						await callback();
					} finally {
						transitioningRef.current -= 1;
						if (transitioningRef.current === 0) {
							setIsTransitioning(false);
						}
					}
				},
				async beforeGoTo(id, callback) {
					transitioningRef.current += 1;
					if (transitioningRef.current === 1) {
						setIsTransitioning(true);
					}
					try {
						const shouldProceed = await callback();
						if (shouldProceed !== false) {
							await this.goTo(id);
						}
					} finally {
						transitioningRef.current -= 1;
						if (transitioningRef.current === 0) {
							setIsTransitioning(false);
						}
					}
				},
				async afterGoTo(id, callback) {
					transitioningRef.current += 1;
					if (transitioningRef.current === 1) {
						setIsTransitioning(true);
					}
					try {
						await this.goTo(id);
						await callback();
					} finally {
						transitioningRef.current -= 1;
						if (transitioningRef.current === 0) {
							setIsTransitioning(false);
						}
					}
				},

				// Conditional rendering
				...generateCommonStepperUseFns(steps, current.data, currentIndex),

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

				// Initialization Status
				initStatus: status,
				error,
				retry,

				// Transition Status
				isTransitioning,

				// Persistence
				clearPersistedState,
			};
		}, [
			stepsArray,
			current,
			currentIndex,
			isFirst,
			isLast,
			progress,
			completedSteps,
			history,
			historyIndex,
			navigateTo,
			initialStepIndex,
			mergedInitial,
			status,
			error,
			retry,
			isTransitioning,
			stepsMap,
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
		initial,
		children,
	}: ScopedProps<Steps>): React.ReactElement {
		const stepper = useStepperInternal({ initial });

		return React.createElement(Context.Provider, { value: stepper }, children);
	}

	// ==========================================================================
	// TYPED PRIMITIVES
	// ==========================================================================

	/**
	 * Create type-safe primitives bound to this specific stepper definition.
	 */
	function createTypedPrimitives(): TypedStepperPrimitives<Steps> {
		// Root that internally uses Scoped (like Provider custom)
		const TypedRoot = React.forwardRef<
			HTMLDivElement,
			Omit<React.ComponentPropsWithoutRef<typeof Root>, "stepper" | "stepperContext" | "children"> &
				Omit<ScopedProps<Steps>, "children"> & {
					orientation?: "horizontal" | "vertical";
					tracking?: boolean;
					children?:
						| React.ReactNode
						| ((props: { stepper: StepperInstance<Steps> }) => React.ReactNode);
				}
		>((props, ref) => {
			const {
				initial,
				orientation,
				tracking,
				children,
				...rootProps
			} = props;

			// Handle children as function - will get stepper from Scoped context
			const RootContent = () => {
				const stepper = useStepper();
				const resolvedChildren =
					typeof children === "function" ? children({ stepper }) : children;

				return React.createElement(Root, {
					...rootProps,
					children: resolvedChildren,
					orientation,
					tracking,
					stepperContext: Context as React.Context<StepperInstance<Step[]> | null>,
					ref,
				});
			};

			// Internally use Scoped, just like Provider custom
			return React.createElement(Scoped, {
				initial,
				children: React.createElement(RootContent),
			});
		});
		TypedRoot.displayName = "Stepper.Root";

		// Item with typed step prop
		const TypedItem = React.forwardRef<
			HTMLLIElement,
			Omit<React.ComponentPropsWithoutRef<typeof Item<Steps>>, "step"> & {
				step: Get.Id<Steps>;
			}
		>((props, ref) => {
			return React.createElement(Item, { ...props, ref });
		});
		TypedItem.displayName = "Stepper.Item";

		// Content with typed step prop
		const TypedContent = React.forwardRef<
			HTMLDivElement,
			Omit<React.ComponentPropsWithoutRef<typeof Content<Steps>>, "step"> & {
				step?: Get.Id<Steps>;
			}
		>((props, ref) => {
			return React.createElement(Content, { ...props, ref });
		});
		TypedContent.displayName = "Stepper.Content";

		return {
			Root: TypedRoot,
			List: List as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof List> &
					React.RefAttributes<HTMLOListElement>
			>,
			Item: TypedItem,
			Trigger: Trigger as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Trigger> &
					React.RefAttributes<HTMLButtonElement>
			>,
			Indicator: Indicator as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Indicator> &
					React.RefAttributes<HTMLSpanElement>
			>,
			Separator: Separator as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Separator> &
					React.RefAttributes<HTMLHRElement>
			>,
			Title: Title as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Title> &
					React.RefAttributes<HTMLSpanElement>
			>,
			Description: Description as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Description> &
					React.RefAttributes<HTMLSpanElement>
			>,
			Content: TypedContent,
			Actions: Actions as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Actions> &
					React.RefAttributes<HTMLDivElement>
			>,
			Prev: Prev as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Prev> &
					React.RefAttributes<HTMLButtonElement>
			>,
			Next: Next as React.ForwardRefExoticComponent<
				React.ComponentPropsWithoutRef<typeof Next> &
					React.RefAttributes<HTMLButtonElement>
			>,
		};
	}

	return {
		steps,
		utils,
		Scoped,
		useStepper,
		Stepper: createTypedPrimitives(),
	};
}

// =============================================================================
// ASYNC INIT HELPERS
// =============================================================================

/**
 * Type guard to check if stepper is ready.
 * Use this to narrow the stepper type and ensure safe access.
 *
 * @param stepper - The stepper instance.
 * @returns `true` if stepper status is "ready".
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const stepper = useStepper();
 *
 *   if (!isStepperReady(stepper)) {
 *     if (stepper.initStatus === "error") {
 *       return <ErrorDisplay error={stepper.error} onRetry={stepper.retry} />;
 *     }
 *     return <LoadingSpinner />;
 *   }
 *
 *   // Stepper is ready (initStatus === "success")
 *   return <StepContent step={stepper.current.step} />;
 * }
 * ```
 */
export function isStepperReady<Steps extends Step[]>(
	stepper: StepperInstance<Steps>,
): boolean {
	return stepper.initStatus === "success";
}

// =============================================================================
// RE-EXPORT FOR CONVENIENCE
// =============================================================================

export type { StepperConfigOptions, StepperDefinition, StepperInstance };
export type { StepperError, StepperStatus } from "./types";
