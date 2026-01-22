import type {
	Get,
	Step,
	StepMetadata,
	StepStatuses,
	Stepper,
	TransitionDirection,
	Utils,
} from "./types";

// =============================================================================
// STEPPER UTILS GENERATOR
// =============================================================================

/**
 * Generate stepper utility functions.
 * These are pure functions that don't depend on React state.
 *
 * @param steps - The steps to generate the utils for.
 * @returns The stepper utils object.
 */
export function generateStepperUtils<const Steps extends Step[]>(...steps: Steps): Utils<Steps> {
	return {
		getAll() {
			return steps;
		},
		get(id) {
			const step = steps.find((step) => step.id === id);
			if (!step) {
				throw new Error(`Step with id "${String(id)}" not found.`);
			}
			return step as Get.StepById<Steps, typeof id>;
		},
		getIndex(id) {
			const index = steps.findIndex((step) => step.id === id);
			if (index === -1) {
				throw new Error(`Step with id "${String(id)}" not found.`);
			}
			return index;
		},
		getByIndex(index) {
			const step = steps[index];
			if (!step) {
				throw new Error(`Step at index ${index} not found.`);
			}
			return step;
		},
		getFirst() {
			return steps[0];
		},
		getLast() {
			return steps[steps.length - 1];
		},
		getNext(id) {
			const index = steps.findIndex((step) => step.id === id);
			return steps[index + 1];
		},
		getPrev(id) {
			const index = steps.findIndex((step) => step.id === id);
			return steps[index - 1];
		},
		getNeighbors(id) {
			const index = steps.findIndex((step) => step.id === id);
			return {
				prev: index > 0 ? steps[index - 1] : undefined,
				next: index < steps.length - 1 ? steps[index + 1] : undefined,
			};
		},
		has(id): id is Get.Id<Steps> {
			return steps.some((step) => step.id === id);
		},
		count() {
			return steps.length;
		},
	};
}

// =============================================================================
// INITIAL STATE HELPERS
// =============================================================================

/**
 * Get the initial step index for the stepper.
 *
 * @param steps - The steps to get the initial step index for.
 * @param initialStep - The initial step to use.
 * @returns The initial step index (defaults to 0 if not found).
 */
export function getInitialStepIndex<Steps extends Step[]>(
	steps: Steps,
	initialStep?: Get.Id<Steps>,
): number {
	if (!initialStep) return 0;
	const index = steps.findIndex((step) => step.id === initialStep);
	return Math.max(index, 0);
}

/**
 * Get the initial metadata for all steps.
 *
 * @param steps - The steps to get the initial metadata for.
 * @param initialMetadata - The initial metadata to use (partial).
 * @returns A complete metadata record with null defaults.
 */
export function getInitialMetadata<Steps extends Step[]>(
	steps: Steps,
	initialMetadata?: Partial<StepMetadata<Steps>>,
): StepMetadata<Steps> {
	return steps.reduce(
		(acc, step) => {
			const stepId = step.id as keyof StepMetadata<Steps>;
			acc[stepId] = (initialMetadata?.[stepId] ?? null) as StepMetadata<Steps>[typeof stepId];
			return acc;
		},
		{} as StepMetadata<Steps>,
	);
}

/**
 * Get the initial status for all steps.
 *
 * @param steps - The steps to get the initial statuses for.
 * @param initialStatuses - The initial statuses to use (partial).
 * @returns A complete statuses record with "idle" defaults.
 */
export function getInitialStatuses<Steps extends Step[]>(
	steps: Steps,
	initialStatuses?: Partial<StepStatuses<Steps>>,
): StepStatuses<Steps> {
	return steps.reduce(
		(acc, step) => {
			const stepId = step.id as Get.Id<Steps>;
			acc[stepId] = initialStatuses?.[stepId] ?? "idle";
			return acc;
		},
		{} as StepStatuses<Steps>,
	);
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Generate common stepper rendering functions.
 * These are used for conditional rendering based on current step.
 *
 * @param steps - The steps array.
 * @param currentStep - The current step object.
 * @param stepIndex - The index of the current step.
 * @returns Object with when, switch, and match functions.
 */
export function generateCommonStepperUseFns<const Steps extends Step[]>(
	steps: Steps,
	currentStep: Steps[number],
	stepIndex: number,
): Pick<Stepper<Steps>, "switch" | "when" | "match"> {
	return {
		switch<R>(cases: Get.Switch<Steps, R>): R | undefined {
			const caseFn = cases[currentStep.id as keyof typeof cases];
			return caseFn?.(currentStep as Get.StepById<Steps, (typeof currentStep)["id"]>);
		},

		when<Id extends Get.Id<Steps>, R1, R2 = undefined>(
			id: Id | [Id, ...boolean[]],
			whenFn: (step: Get.StepById<Steps, Id>) => R1,
			elseFn?: (step: Get.StepSansId<Steps, Id>) => R2,
		): R1 | R2 {
			const current = steps[stepIndex];
			const matchesId = Array.isArray(id)
				? current.id === id[0] && id.slice(1).every(Boolean)
				: current.id === id;

			if (matchesId) {
				return whenFn(current as Get.StepById<Steps, Id>);
			}
			return elseFn?.(current as Get.StepSansId<Steps, Id>) as R2;
		},

		match<State extends Get.Id<Steps>, R>(
			state: State,
			matches: Get.Switch<Steps, R>,
		): R | null {
			const step = steps.find((s) => s.id === state);
			if (!step) return null;
			const matchFn = matches[state as keyof typeof matches] as
				| ((step: Steps[number]) => R)
				| undefined;
			return matchFn?.(step) ?? null;
		},
	};
}

// =============================================================================
// TRANSITION HELPERS
// =============================================================================

/**
 * Execute a step callback and return whether to proceed.
 *
 * @param callback - The callback to execute.
 * @param isBefore - Whether this is a "before" callback.
 * @returns `true` to proceed, `false` to cancel.
 */
async function executeStepCallback(
	callback: (() => Promise<boolean> | boolean) | (() => Promise<void> | void),
	isBefore: boolean,
): Promise<boolean> {
	const result = await callback();
	if (isBefore) {
		return result !== false;
	}
	return true;
}

/**
 * Execute a transition with before/after callbacks.
 *
 * @param params - The transition parameters.
 * @param params.stepper - The stepper instance.
 * @param params.direction - The transition direction.
 * @param params.callback - The callback to execute.
 * @param params.before - Whether the callback is before the transition.
 * @param params.targetId - The target step ID (for goTo).
 */
export async function executeTransition<Steps extends Step[]>({
	stepper,
	direction,
	callback,
	before,
	targetId,
}: {
	stepper: Stepper<Steps>;
	direction: TransitionDirection;
	callback: (() => Promise<boolean> | boolean) | (() => Promise<void> | void);
	before: boolean;
	targetId?: Get.Id<Steps>;
}): Promise<void> {
	const shouldProceed = before ? await executeStepCallback(callback, true) : true;
	if (shouldProceed) {
		if (direction === "next") stepper.next();
		else if (direction === "prev") stepper.prev();
		else if (direction === "goTo" && targetId) stepper.goTo(targetId);
		if (!before) await executeStepCallback(callback, false);
	}
}

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

/**
 * Validate and update the step index.
 *
 * @param steps - The steps array.
 * @param newIndex - The new index to set.
 * @param setter - The state setter function.
 * @throws Error if navigation is not allowed.
 */
export function updateStepIndex<Steps extends Step[]>(
	steps: Steps,
	newIndex: number,
	setter: (index: number) => void,
): void {
	if (newIndex < 0) {
		throwNavigationError({
			steps,
			newIndex,
			direction: "prev",
			reason: "already at the first step",
		});
	}
	if (newIndex >= steps.length) {
		throwNavigationError({
			steps,
			newIndex,
			direction: "next",
			reason: "already at the last step",
		});
	}
	setter(newIndex);
}

/**
 * Throw a navigation error with a descriptive message.
 */
function throwNavigationError({
	steps,
	newIndex,
	direction,
	reason,
}: {
	steps: Step[];
	newIndex: number;
	direction: "next" | "prev";
	reason: string;
}): never {
	const stepId = steps[Math.max(0, Math.min(newIndex, steps.length - 1))]?.id ?? `index ${newIndex}`;
	throw new Error(`Cannot navigate ${direction} from step "${stepId}": ${reason}`);
}

