import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { runClickHandler, useStepperContextOrThrow } from "./helpers";
import type { PrevProps } from "./types";

export function createPrev<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
) {
  return function Prev(props: PrevProps) {
    const { render, children, ...rest } = props;
    const stepper = useStepperContextOrThrow(StepperContext);
    const domProps = {
      "data-component": "stepper-prev",
      type: "button" as const,
      disabled: stepper.state.isFirst,
      "aria-disabled": stepper.state.isFirst,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        runClickHandler(e, rest.onClick, () => stepper.navigation.prev());
      },
      ...rest,
    };
    if (render) return render(domProps);
    return <button {...domProps}>{children}</button>;
  };
}
