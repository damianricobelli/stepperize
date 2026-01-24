import type {
	Get,
	HistoryEntry,
	InitialState,
	PersistManager,
	Step,
	StepMetadata,
	StepStatus,
	StepStatuses,
	TransitionContext,
} from "@stepperize/core";
import type { StepInfo } from "./types";
import {
	areDependenciesSatisfied,
	createPersistedState,
	createPersistManager,
	findNextValidStepIndex,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStatuses,
	getInitialStepIndex,
	isStepCompleted,
	persistedStateToInitialState,
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
	StepperBuilder,
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
				initialData: configOptions.initialData,
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
		// STATUS STATE
		// ==========================================================================

		const hasInitialData = Boolean(mergedConfig.initialData);
		const hasPersist = Boolean(persistManager);

		// Start as pending if we have initialData OR persistence to load
		const [status, setStatus] = React.useState<StepperStatus>(
			hasInitialData || hasPersist ? "pending" : "success",
		);
		const [error, setError] = React.useState<StepperError | null>(null);

		// Track if we need to re-run initialization (for retry)
		const [initTrigger, setInitTrigger] = React.useState(0);

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
			// If no persistence and no initialData, nothing to do
			if (!persistManager && !mergedConfig.initialData) return;

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

							// If no initialData, we're done
							if (!mergedConfig.initialData) {
								setStatus("success");
								return;
							}
						} else {
							setIsHydrated(true);
						}
					}

					// Step 2: Run initialData if configured
					// Note: initialData takes precedence over persisted state
					if (mergedConfig.initialData) {
						const result = await mergedConfig.initialData();

						if (isCancelled) return;

						// Apply initialData result (takes precedence)
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
		}, [initTrigger, persistManager, mergedConfig.initialData, applyInitialState]);

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
			if (!mergedConfig.initialData && !persistManager) return;
			setInitTrigger((prev) => prev + 1);
		}, [mergedConfig.initialData, persistManager]);

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
				const step = steps.find((s) => s.id === id);
				if (!step) {
					throw new Error(`Step with id "${String(id)}" not found.`);
				}
				const stepStatus = statuses[id];
				const stepMetadata = metadata[id];
				return {
					data: step as Get.StepById<Steps, Id>,
					status: stepStatus,
					metadata: stepMetadata,
					isCompleted: isStepCompleted(id, statuses),
					canAccess: areDependenciesSatisfied(step, statuses),
					setStatus: (newStatus: StepStatus) => {
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
			[steps, statuses, metadata],
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
					const nextIndex = findNextValidStepIndex(steps, currentIndex, 1, metadata);
					if (nextIndex === -1) {
						return navigateTo(currentIndex + 1, "next"); // Will throw appropriate error
					} else {
						return navigateTo(nextIndex, "next");
					}
				},
				prev() {
					const prevIndex = findNextValidStepIndex(steps, currentIndex, -1, metadata);
					if (prevIndex === -1) {
						return navigateTo(currentIndex - 1, "prev"); // Will throw appropriate error
					} else {
						return navigateTo(prevIndex, "prev");
					}
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

				// Step access
				step: <Id extends Get.Id<Steps>>(id: Id) => {
					return createStepInfo(id);
				},

				// Metadata management
				resetMetadata(keepInitialMetadata) {
					setMetadata(
						getInitialMetadata(steps, keepInitialMetadata ? mergedConfig.initialMetadata : undefined),
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
			mergedConfig.initialMetadata,
			mergedConfig.initialStatuses,
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
				initialStep,
				initialMetadata,
				initialStatuses,
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
					ref,
				});
			};

			// Internally use Scoped, just like Provider custom
			return React.createElement(Scoped, {
				initialStep,
				initialMetadata,
				initialStatuses,
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

export type { StepperBuilder, StepperConfigOptions, StepperDefinition, StepperInstance };
export type { InitialDataFn, StepperError, StepperStatus } from "./types";
