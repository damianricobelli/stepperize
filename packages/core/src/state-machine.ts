import type {
	BaseStepStatus,
	Get,
	HistoryEntry,
	Initial,
	InitialState,
	Step,
	StepMetadata,
	StepperConfig,
	StepStatuses,
	TransitionContext,
	TransitionDirection,
} from "./types";

// =============================================================================
// STATE MACHINE TYPES
// =============================================================================

/**
 * Internal state of the stepper state machine.
 * @internal
 */
export type StepperState<Steps extends Step[]> = {
	/** Current step index. */
	currentIndex: number;
	/** Status of each step. */
	statuses: StepStatuses<Steps>;
	/** Metadata for each step. */
	metadata: StepMetadata<Steps>;
	/** Navigation history for undo/redo. */
	history: HistoryEntry<Steps>[];
	/** Current position in history (for redo). */
	historyIndex: number;
	/** Whether the state machine is initialized. */
	initialized: boolean;
};

/**
 * Actions that can be dispatched to the state machine.
 * @internal
 */
export type StepperAction<Steps extends Step[]> =
	| { type: "GO_TO"; index: number }
	| { type: "SET_STATUS"; stepId: Get.Id<Steps>; status: BaseStepStatus }
	| { type: "SET_METADATA"; stepId: Get.Id<Steps>; metadata: StepMetadata<Steps>[Get.Id<Steps>] }
	| { type: "RESET_METADATA"; keepInitial: boolean; initialMetadata?: Partial<StepMetadata<Steps>> }
	| { type: "RESET"; initialIndex: number; initialMetadata?: Partial<StepMetadata<Steps>>; initialStatuses?: Partial<StepStatuses<Steps>> }
	| { type: "UNDO" }
	| { type: "REDO" }
	| { type: "INITIALIZE"; state: InitialState<Steps> };

// =============================================================================
// INITIAL CONFIG HELPERS
// =============================================================================

/**
 * Check if the initial config is a function.
 * @internal
 */
export function isInitialFunction<Steps extends Step[]>(
	initial: Initial<Steps> | undefined,
): initial is () => InitialState<Steps> | Promise<InitialState<Steps>> {
	return typeof initial === "function";
}

/**
 * Extract the sync initial state from the config.
 * Returns undefined for async functions (will be resolved later).
 * @internal
 */
export function getSyncInitialState<Steps extends Step[]>(
	initial: Initial<Steps> | undefined,
): InitialState<Steps> | undefined {
	if (!initial) return undefined;
	if (isInitialFunction(initial)) return undefined;
	return initial;
}

// =============================================================================
// INITIAL STATE FACTORY
// =============================================================================

/**
 * Create the initial state for the state machine.
 *
 * @param steps - The step definitions.
 * @param config - The stepper configuration.
 * @returns The initial state.
 * @internal
 */
export function createInitialState<Steps extends Step[]>(
	steps: Steps,
	config?: StepperConfig<Steps>,
): StepperState<Steps> {
	// Get sync initial state (undefined if initial is a function)
	const syncInitial = getSyncInitialState(config?.initial);

	const initialIndex = getInitialIndex(steps, syncInitial?.step);

	return {
		currentIndex: initialIndex,
		statuses: createInitialStatuses(steps, syncInitial?.statuses),
		metadata: createInitialMetadata(steps, syncInitial?.metadata),
		history: [createHistoryEntry(steps, initialIndex)],
		historyIndex: 0,
		initialized: !isInitialFunction(config?.initial), // Not initialized if initial is a function
	};
}

/**
 * Get the initial step index.
 */
function getInitialIndex<Steps extends Step[]>(
	steps: Steps,
	initialStep?: Get.Id<Steps>,
): number {
	if (!initialStep) return 0;
	const index = steps.findIndex((step) => step.id === initialStep);
	return Math.max(index, 0);
}

/**
 * Create initial statuses for all steps.
 */
function createInitialStatuses<Steps extends Step[]>(
	steps: Steps,
	initialStatuses?: Partial<StepStatuses<Steps>>,
): StepStatuses<Steps> {
	return steps.reduce((acc, step) => {
		const stepId = step.id as Get.Id<Steps>;
		acc[stepId] = initialStatuses?.[stepId] ?? "incomplete";
		return acc;
	}, {} as StepStatuses<Steps>);
}

/**
 * Create initial metadata for all steps.
 */
function createInitialMetadata<Steps extends Step[]>(
	steps: Steps,
	initialMetadata?: Partial<StepMetadata<Steps>>,
): StepMetadata<Steps> {
	return steps.reduce((acc, step) => {
		const stepId = step.id as keyof StepMetadata<Steps>;
		acc[stepId] = (initialMetadata?.[stepId] ?? null) as StepMetadata<Steps>[typeof stepId];
		return acc;
	}, {} as StepMetadata<Steps>);
}

/**
 * Create a history entry for the current state.
 */
function createHistoryEntry<Steps extends Step[]>(
	steps: Steps,
	index: number,
): HistoryEntry<Steps> {
	return {
		step: steps[index],
		index,
		timestamp: Date.now(),
	};
}

// =============================================================================
// STATE MACHINE REDUCER
// =============================================================================

/**
 * State machine reducer for stepper state.
 *
 * @param state - Current state.
 * @param action - Action to dispatch.
 * @param steps - Step definitions.
 * @param config - Stepper configuration.
 * @returns New state.
 * @internal
 */
export function stepperReducer<Steps extends Step[]>(
	state: StepperState<Steps>,
	action: StepperAction<Steps>,
	steps: Steps,
	config?: StepperConfig<Steps>,
): StepperState<Steps> {
	switch (action.type) {
		case "GO_TO": {
			const { index } = action;

			// Validate index bounds
			if (index < 0 || index >= steps.length) {
				return state;
			}

			// Check if navigation is allowed
			if (!canNavigate(steps, state, index, config?.mode ?? "free")) {
				return state;
			}

			// Add to history (truncate any "future" history if we navigated back)
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				createHistoryEntry(steps, index),
			];

			return {
				...state,
				currentIndex: index,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}

		case "SET_STATUS": {
			const { stepId, status } = action;

			return {
				...state,
				statuses: {
					...state.statuses,
					[stepId]: status,
				},
			};
		}

		case "SET_METADATA": {
			const { stepId, metadata } = action;

			return {
				...state,
				metadata: {
					...state.metadata,
					[stepId]: metadata,
				},
			};
		}

		case "RESET_METADATA": {
			const { keepInitial, initialMetadata } = action;

			return {
				...state,
				metadata: createInitialMetadata(
					steps,
					keepInitial ? initialMetadata : undefined,
				),
			};
		}

		case "RESET": {
			const { initialIndex, initialMetadata, initialStatuses } = action;

			return {
				...state,
				currentIndex: initialIndex,
				statuses: createInitialStatuses(steps, initialStatuses),
				metadata: createInitialMetadata(steps, initialMetadata),
				history: [createHistoryEntry(steps, initialIndex)],
				historyIndex: 0,
			};
		}

		case "UNDO": {
			if (state.historyIndex <= 0) {
				return state;
			}

			const newIndex = state.historyIndex - 1;
			const entry = state.history[newIndex];

			return {
				...state,
				currentIndex: entry.index,
				historyIndex: newIndex,
			};
		}

		case "REDO": {
			if (state.historyIndex >= state.history.length - 1) {
				return state;
			}

			const newIndex = state.historyIndex + 1;
			const entry = state.history[newIndex];

			return {
				...state,
				currentIndex: entry.index,
				historyIndex: newIndex,
			};
		}

		case "INITIALIZE": {
			const { state: initialState } = action;

			const newIndex = initialState.step
				? getInitialIndex(steps, initialState.step)
				: state.currentIndex;

			return {
				...state,
				currentIndex: newIndex,
				metadata: {
					...state.metadata,
					...(initialState.metadata ?? {}),
				} as StepMetadata<Steps>,
				statuses: {
					...state.statuses,
					...(initialState.statuses ?? {}),
				} as StepStatuses<Steps>,
				history: [createHistoryEntry(steps, newIndex)],
				historyIndex: 0,
				initialized: true,
			};
		}

		default:
			return state;
	}
}

// =============================================================================
// NAVIGATION VALIDATION
// =============================================================================

/**
 * Check if navigation to a target index is allowed.
 *
 * @param steps - Step definitions.
 * @param state - Current state.
 * @param targetIndex - Target index to navigate to.
 * @param mode - Navigation mode.
 * @returns `true` if navigation is allowed.
 */
export function canNavigate<Steps extends Step[]>(
	steps: Steps,
	state: StepperState<Steps>,
	targetIndex: number,
	mode: "linear" | "free",
): boolean {
	const targetStep = steps[targetIndex];
	if (!targetStep) return false;

	// In linear mode, can only go forward one step or back to any previous step
	if (mode === "linear") {
		const { currentIndex } = state;

		// Can always go back
		if (targetIndex < currentIndex) return true;

		// Can only go forward one step at a time
		if (targetIndex > currentIndex + 1) return false;

		// If going forward, current step must be completed
		const currentStep = steps[currentIndex];
		const currentStatus = state.statuses[currentStep.id as Get.Id<Steps>];
		if (currentStatus !== "success") return false;
	}

	return true;
}

// =============================================================================
// TRANSITION CONTEXT FACTORY
// =============================================================================

/**
 * Create a transition context object.
 *
 * @param steps - Step definitions.
 * @param state - Current state.
 * @param targetIndex - Target index.
 * @param direction - Transition direction.
 * @returns The transition context.
 * @internal
 */
export function createTransitionContext<Steps extends Step[]>(
	steps: Steps,
	state: StepperState<Steps>,
	targetIndex: number,
	direction: TransitionDirection,
): TransitionContext<Steps> {
	return {
		from: steps[state.currentIndex],
		to: steps[targetIndex],
		metadata: state.metadata,
		statuses: state.statuses,
		direction,
		fromIndex: state.currentIndex,
		toIndex: targetIndex,
	};
}

// =============================================================================
// COMPUTED VALUES
// =============================================================================

/**
 * Check if a specific step is completed.
 *
 * @param stepId - Step ID to check.
 * @param statuses - Step statuses.
 * @returns `true` if the step status is "success".
 */
export function isStepCompleted<Steps extends Step[]>(
	stepId: Get.Id<Steps>,
	statuses: StepStatuses<Steps>,
): boolean {
	return statuses[stepId] === "success";
}

/**
 * Check if user can access a specific step.
 *
 * @param steps - Step definitions.
 * @param state - Current state.
 * @param stepId - Step ID to check.
 * @param mode - Navigation mode.
 * @returns `true` if the step can be accessed.
 * @internal
 */
export function canAccessStep<Steps extends Step[]>(
	steps: Steps,
	state: StepperState<Steps>,
	stepId: Get.Id<Steps>,
	mode: "linear" | "free",
): boolean {
	const targetIndex = steps.findIndex((s) => s.id === stepId);
	if (targetIndex === -1) return false;

	return canNavigate(steps, state, targetIndex, mode);
}

// =============================================================================
// HISTORY HELPERS
// =============================================================================

/**
 * Check if undo is available.
 * @internal
 */
export function canUndo<Steps extends Step[]>(state: StepperState<Steps>): boolean {
	return state.historyIndex > 0;
}

/**
 * Check if redo is available.
 * @internal
 */
export function canRedo<Steps extends Step[]>(state: StepperState<Steps>): boolean {
	return state.historyIndex < state.history.length - 1;
}


