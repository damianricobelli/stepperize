import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { runClickHandler, useStepperContextOrThrow } from "./helpers";
import type { NextProps } from "./types";

export function createNext<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
) {
  return function Next(props: NextProps) {
    const { render, children, ...rest } = props;
    const stepper = useStepperContextOrThrow(StepperContext);
    const domProps = {
      "data-component": "stepper-next",
      type: "button" as const,
      disabled: stepper.state.isLast,
      "aria-disabled": stepper.state.isLast,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        runClickHandler(e, rest.onClick, () => stepper.navigation.next());
      },
      ...rest,
    };
    if (render) return render(domProps);
    return <button {...domProps}>{children}</button>;
  };
}
