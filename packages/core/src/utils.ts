import type { Step, Stepper, Get, Utils } from "./types";

export function generateStepperUtils<const Steps extends Step[]>(
  ...steps: Steps
) {
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

export function getInitialStepIndex<Steps extends Step[]>(
  steps: Steps,
  initialStep?: Get.Id<Steps>
) {
  return Math.max(
    steps.findIndex((step) => step.id === initialStep),
    0
  );
}

export function generateCommonStepperUseFns<const Steps extends Step[]>(
  steps: Steps,
  currentStep: Steps[number],
  stepIndex: number
) {
  return {
    switch(when) {
      const whenFn = when[currentStep.id as keyof typeof when];
      return whenFn?.(
        currentStep as Get.StepById<typeof steps, (typeof currentStep)["id"]>
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
      const matchFn = matches[state as keyof typeof matches];
      return matchFn?.(state as any);
    },
  } as Pick<Stepper<Steps>, "switch" | "when" | "match">;
}
