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
			const matchFn = matches[state as keyof typeof matches];
			return matchFn?.(state as any);
		},
	} as Pick<Stepper<Steps>, "switch" | "when" | "match">;
}

export async function executeStepCallback(
	callback: (() => Promise<boolean> | boolean) | (() => Promise<void> | void),
	isBefore: boolean,
): Promise<boolean> {
	const result = await callback();
	return isBefore ? result === true : true;
}
