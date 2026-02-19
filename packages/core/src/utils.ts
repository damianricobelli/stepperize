import type { Get, Metadata, Step, StepperFlow, StepperLookup } from "./types";

/**
 * Generate stepper utils.
 * @param steps - The steps to generate the utils for.
 * @returns The stepper utils.
 */
export function generateStepperUtils<const Steps extends Step[]>(
  ...steps: Steps
) {
  const getIndex = (id: Get.Id<Steps>) =>
    steps.findIndex((step) => step.id === id);

  const getByIndex = <Index extends number>(index: Index) => steps[index];

  return {
    getAll() {
      return steps;
    },
    get(id) {
      return getByIndex(getIndex(id)) as Get.StepById<Steps, typeof id>;
    },
    getIndex: (id) => getIndex(id),
    getByIndex,
    getFirst() {
      return getByIndex(0);
    },
    getLast() {
      return getByIndex(steps.length - 1);
    },
    getNext(id) {
      return getByIndex(getIndex(id) + 1);
    },
    getPrev(id) {
      return getByIndex(getIndex(id) - 1);
    },
    getNeighbors(id) {
      const index = getIndex(id);
      return {
        prev: index > 0 ? getByIndex(index - 1) : null,
        next: index < steps.length - 1 ? getByIndex(index + 1) : null,
      };
    },
  } satisfies StepperLookup<Steps>;
}

/**
 * Get the initial step index for the stepper.
 * @param steps - The steps to get the initial step index for.
 * @param initialStep - The initial step to use.
 * @returns The initial step index for the stepper.
 */
export function getInitialStepIndex<Steps extends Step[]>(
  steps: Steps,
  initialStep?: Get.Id<Steps>,
) {
  const index = steps.findIndex((step) => step.id === initialStep);
  return index === -1 ? 0 : index;
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
  const metadata = {} as Record<Get.Id<Steps>, Metadata>;

  for (const step of steps) {
    const id = step.id as Get.Id<Steps>;
    metadata[id] = initialMetadata?.[id] ?? null;
  }

  return metadata;
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
): StepperFlow<Steps> {
  return {
    switch(when) {
      const whenFn = when[currentStep.id as keyof typeof when];
      return whenFn?.(
        currentStep as Get.StepById<typeof steps, (typeof currentStep)["id"]>,
      );
    },
    when(id, whenFn, elseFn) {
      const currentStep = steps[stepIndex];
      const matchesId = Array.isArray(id)
        ? currentStep.id === id[0] && id.slice(1).every(Boolean)
        : currentStep.id === id;

      return matchesId
        ? whenFn?.(currentStep as any)
        : elseFn?.(currentStep as any);
    },
    match(state, matches) {
      const step = steps.find((s) => s.id === state);
      if (!step) return null;
      const matchFn = matches[state as keyof typeof matches];
      return matchFn?.(step as any) ?? null;
    },
    is(id) {
      return currentStep.id === id;
    },
  } as StepperFlow<Steps>;
}

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
  if (newIndex >= 0 && newIndex < steps.length) {
    setter(newIndex);
    return;
  }

  const direction = newIndex < 0 ? "prev" : "next";
  const reason = newIndex < 0 ? "first step" : "last step";
  throw new Error(`Cannot navigate ${direction}: ${reason}`);
};
