import type {
	Get,
	HistoryEntry,
	InitialState,
	Step,
	StepMetadata,
	StepperConfig,
	StepStatus,
	StepStatuses,
	TransitionContext,
	TransitionDirection,
} from "./types";
import type { StandardSchemaV1 } from "./standard-schema";

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
	| { type: "SET_STATUS"; stepId: Get.Id<Steps>; status: StepStatus }
	| { type: "SET_METADATA"; stepId: Get.Id<Steps>; metadata: StepMetadata<Steps>[Get.Id<Steps>] }
	| { type: "RESET_METADATA"; keepInitial: boolean; initialMetadata?: Partial<StepMetadata<Steps>> }
	| { type: "RESET"; initialIndex: number; initialMetadata?: Partial<StepMetadata<Steps>>; initialStatuses?: Partial<StepStatuses<Steps>> }
	| { type: "UNDO" }
	| { type: "REDO" }
	| { type: "INITIALIZE"; state: InitialState<Steps> };

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
	const initialIndex = getInitialIndex(steps, config?.initialStep);

	return {
		currentIndex: initialIndex,
		statuses: createInitialStatuses(steps, config?.initialStatuses),
		metadata: createInitialMetadata(steps, config?.initialMetadata),
		history: [createHistoryEntry(steps, initialIndex)],
		historyIndex: 0,
		initialized: !config?.initialData, // Not initialized if initialData is pending
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
		acc[stepId] = initialStatuses?.[stepId] ?? "idle";
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

	// Check dependencies
	if (!areDependenciesSatisfied(targetStep, state.statuses)) {
		return false;
	}

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

/**
 * Check if a step's dependencies are satisfied.
 *
 * @param step - The step to check.
 * @param statuses - Current step statuses.
 * @returns `true` if all dependencies are completed.
 */
export function areDependenciesSatisfied<Steps extends Step[]>(
	step: Steps[number],
	statuses: StepStatuses<Steps>,
): boolean {
	const requires = step.requires;
	if (!requires || requires.length === 0) return true;

	return requires.every((requiredId) => {
		const status = statuses[requiredId as Get.Id<Steps>];
		return status === "success";
	});
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

// =============================================================================
// STEP SKIPPING
// =============================================================================

/**
 * Check if a step should be skipped.
 *
 * @param step - The step to check.
 * @param metadata - Current metadata.
 * @returns `true` if the step should be skipped.
 */
export function shouldSkipStep<Steps extends Step[]>(
	step: Steps[number],
	metadata: StepMetadata<Steps>,
): boolean {
	if (!step.skip) return false;

	// The skip function receives metadata as unknown since we can't
	// guarantee the shape at the core level
	return step.skip(metadata as Record<string, unknown>);
}

/**
 * Find the next non-skipped step index.
 *
 * @param steps - Step definitions.
 * @param currentIndex - Current index.
 * @param direction - Direction to search (1 for forward, -1 for backward).
 * @param metadata - Current metadata.
 * @returns The next valid index, or -1 if none found.
 */
export function findNextValidStepIndex<Steps extends Step[]>(
	steps: Steps,
	currentIndex: number,
	direction: 1 | -1,
	metadata: StepMetadata<Steps>,
): number {
	let index = currentIndex + direction;

	while (index >= 0 && index < steps.length) {
		const step = steps[index];
		if (!shouldSkipStep(step, metadata)) {
			return index;
		}
		index += direction;
	}

	return -1; // No valid step found
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Type guard to check if a value is a valid Standard Schema.
 */
function isStandardSchema(value: unknown): value is StandardSchemaV1 {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const obj = value as Record<string, unknown>;

	// Check for ~standard property
	if (!("~standard" in obj)) {
		return false;
	}

	const standard = obj["~standard"];

	// Check that ~standard is an object with required properties
	if (typeof standard !== "object" || standard === null) {
		return false;
	}

	const standardObj = standard as Record<string, unknown>;

	// Check for required properties: version, vendor, validate
	return (
		standardObj.version === 1 &&
		typeof standardObj.vendor === "string" &&
		typeof standardObj.validate === "function"
	);
}

/**
 * Validate step metadata against its schema.
 *
 * @param step - The step with optional schema.
 * @param metadata - The metadata to validate.
 * @returns Validation result (synchronous or asynchronous).
 */
export function validateStepMetadata(
	step: Step,
	metadata: unknown,
): { success: true; data: unknown } | { success: false; error: unknown } | Promise<{ success: true; data: unknown } | { success: false; error: unknown }> {
	const schema: unknown = step.schema;

	if (!isStandardSchema(schema)) {
		return { success: true, data: metadata };
	}

	const result = schema["~standard"].validate(metadata);

	// Handle both synchronous and asynchronous validation
	if (result instanceof Promise) {
		return result.then((resolvedResult) => {
			// Standard Schema returns { value, issues?: undefined } on success
			// or { issues: ReadonlyArray<Issue> } on failure
			if ("issues" in resolvedResult && resolvedResult.issues !== undefined) {
				return { success: false, error: resolvedResult.issues } as const;
			}

			// Success case: result has value and no issues
			return { success: true, data: resolvedResult.value } as const;
		});
	}

	// Synchronous validation
	if ("issues" in result && result.issues !== undefined) {
		return { success: false, error: result.issues };
	}

	// Success case: result has value and no issues
	return { success: true, data: result.value };
}
