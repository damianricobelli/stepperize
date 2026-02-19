import type { Step, Stepper } from "@stepperize/core";
import React from "react";

export function useStepperContextOrThrow<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
) {
  const stepper = React.useContext(StepperContext);
  if (!stepper) {
    throw new Error("Missing Stepper.Root.");
  }
  return stepper;
}

export function runClickHandler(
  event: React.MouseEvent<HTMLButtonElement>,
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined,
  action: () => void,
) {
  onClick?.(event);
  if (event.defaultPrevented) return;
  action();
}
