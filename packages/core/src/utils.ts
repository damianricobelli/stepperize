import type { Get, Metadata, Step, Stepper, Utils } from "./types";

/**
 * Generate stepper utils.
 * @param steps - The steps to generate the utils for.
 * @returns The stepper utils.
 */
export function generateStepperUtils<const Steps extends Step[]>(...steps: Steps) {
	return {
		getAll() {
			return steps;
		},
		get: (id) => {
			const step = steps.find((step) => step.id === id);
			return step as Get.StepById<Steps, typeof id>;
		},
		getIndex: (id) => steps.findIndex((step) => step.id === id),
		getByIndex: (index) => steps[index],
		getFirst() {
			return steps[0];
		},
		getLast() {
			return steps[steps.length - 1];
		},
		getNext(id) {
			return steps[steps.findIndex((step) => step.id === id) + 1];
		},
		getPrev(id) {
			return steps[steps.findIndex((step) => step.id === id) - 1];
		},
		getNeighbors(id) {
			const index = steps.findIndex((step) => step.id === id);
			return {
				prev: index > 0 ? steps[index - 1] : null,
				next: index < steps.length - 1 ? steps[index + 1] : null,
			};
		},
	} satisfies Utils<Steps>;
}

/**
 * Get the initial step index for the stepper.
 * @param steps - The steps to get the initial step index for.
 * @param initialStep - The initial step to use.
 * @returns The initial step index for the stepper.
 */
export function getInitialStepIndex<Steps extends Step[]>(steps: Steps, initialStep?: Get.Id<Steps>) {
	return Math.max(
		steps.findIndex((step) => step.id === initialStep),
		0,
	);
}

/**
 * Get the initial metadata for the stepper.
 * @param steps - The steps to get the initial metadata for.
 * @param initialMetadata - The initial metadata to use.
 * @returns The initial metadata for the stepper.
 */
export function getInitialMetadata<Steps extends Step[]>(
	steps: Steps,
	initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>,
) {
	return steps.reduce(
		(acc, step) => {
			acc[step.id as Get.Id<Steps>] = initialMetadata?.[step.id as Get.Id<Steps>] ?? null;
			return acc;
		},
		{} as Record<Get.Id<Steps>, Metadata>,
	);
}

/**
 * Generate common stepper use functions.
 * @param steps - The steps to generate the functions for.
 * @param currentStep - The current step.
 * @param stepIndex - The index of the current step.
 * @returns The common stepper use functions.
 */
export function generateCommonStepperUseFns<const Steps extends Step[]>(
	steps: Steps,
	currentStep: Steps[number],
	stepIndex: number,
) {
	return {
		switch(when) {
			const whenFn = when[currentStep.id as keyof typeof when];
			return whenFn?.(currentStep as Get.StepById<typeof steps, (typeof currentStep)["id"]>);
		},
		when(id, whenFn, elseFn) {
			const currentStep = steps[stepIndex];
			const matchesId = Array.isArray(id)
				? currentStep.id === id[0] && id.slice(1).every(Boolean)
				: currentStep.id === id;

			return matchesId ? whenFn?.(currentStep as any) : elseFn?.(currentStep as any);
		},
		match(state, matches) {
			const step = steps.find((s) => s.id === state);
			if (!step) return null;
			const matchFn = matches[state as keyof typeof matches];
			return matchFn?.(step as any) ?? null;
		},
	} as Pick<Stepper<Steps>, "switch" | "when" | "match">;
}

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
 * This function is used to execute a callback before or after a transition.
 * @param stepper - The stepper to execute the transition for.
 * @param direction - The direction to execute the transition for.
 * @param callback - The callback to execute the transition for.
 * @param before - Whether the callback is before the transition.
 * @param targetId - The target ID to execute the transition for.
 */
export const executeTransition = async <Steps extends Step[]>({
	stepper,
	direction,
	callback,
	before,
	targetId,
}: {
	stepper: Stepper<Steps>;
	direction: "next" | "prev" | "goTo";
	callback: (() => Promise<boolean> | boolean) | (() => Promise<void> | void);
	before: boolean;
	targetId?: Get.Id<Steps>;
}) => {
	const shouldProceed = before ? await executeStepCallback(callback, true) : true;
	if (shouldProceed) {
		if (direction === "next") stepper.next();
		else if (direction === "prev") stepper.prev();
		else if (direction === "goTo" && targetId) stepper.goTo(targetId);
		if (!before) await executeStepCallback(callback, false);
	}
};

/**
 * Update the step index.
 * @param steps - The steps to update the step index for.
 * @param newIndex - The new index to update the step index to.
 * @param setter - The setter to update the step index with.
 */
export const updateStepIndex = <Steps extends Step[]>(
	steps: Steps,
	newIndex: number,
	setter: (index: number) => void,
) => {
	if (newIndex < 0) throwNavigationError({ steps, newIndex, direction: "next", reason: "it is the first step" });
	if (newIndex >= steps.length)
		throwNavigationError({ steps, newIndex, direction: "prev", reason: "it is the last step" });
	setter(newIndex);
};

const throwNavigationError = ({
	steps,
	newIndex,
	direction,
	reason,
}: {
	steps: Step[];
	newIndex: number;
	direction: "next" | "prev";
	reason: string;
}) => {
	const stepId = steps[newIndex]?.id ?? `index ${newIndex}`;
	throw new Error(`Cannot navigate ${direction} from step "${stepId}": ${reason}`);
};
