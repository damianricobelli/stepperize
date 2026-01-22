import type {
	Get,
	HistoryEntry,
	Step,
	StepMetadata,
	StepStatus,
	StepStatuses,
	TransitionContext,
} from "@stepperize/core";
import {
	areDependenciesSatisfied,
	calculateProgress,
	findNextValidStepIndex,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getCompletedSteps,
	getInitialMetadata,
	getInitialStatuses,
	getInitialStepIndex,
	isStepCompleted,
} from "@stepperize/core";
import * as React from "react";
import type {
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
		const mergedConfig = {
			initialStep: props.initialStep ?? configOptions.initialStep,
			initialMetadata: { ...configOptions.initialMetadata, ...props.initialMetadata },
			initialStatuses: { ...configOptions.initialStatuses, ...props.initialStatuses },
			mode: configOptions.mode ?? "free",
			onBeforeTransition: configOptions.onBeforeTransition,
			onAfterTransition: configOptions.onAfterTransition,
		};

		// Calculate initial values
		const initialStepIndex = React.useMemo(
			() => getInitialStepIndex(steps, mergedConfig.initialStep),
			[mergedConfig.initialStep],
		);

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
// RE-EXPORT FOR CONVENIENCE
// =============================================================================

export type { StepperBuilder, StepperConfigOptions, StepperDefinition, StepperInstance };
