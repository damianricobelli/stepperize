import { Get, Step } from "@stepperize/core";
import { StepStatus } from "./primitives/types";

export function getStatuses<Steps extends Step[]>(
  steps: Steps,
  currentIndex: number,
): Record<Get.Id<Steps>, StepStatus> {
  return steps.reduce(
    (acc, step, i) => {
      acc[step.id as Get.Id<Steps>] =
        i < currentIndex ? "success" : i === currentIndex ? "active" : "inactive";
      return acc;
    },
    {} as Record<Get.Id<Steps>, StepStatus>,
  );
}
