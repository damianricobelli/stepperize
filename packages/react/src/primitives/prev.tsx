import type { Step, Stepper } from "@stepperize/core";
import React from "react";
import type { PrevProps } from "./types";

export function createPrev<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
) {
  return function Prev(props: PrevProps) {
    const { render, children, ...rest } = props;
    const stepper = React.useContext(StepperContext);
    if (!stepper) {
      throw new Error("Stepper.Prev must be used within Stepper.Root.");
    }
    const domProps = {
      "data-component": "stepper-prev",
      type: "button" as const,
      disabled: stepper.state.isFirst,
      "aria-disabled": stepper.state.isFirst,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        rest.onClick?.(e);
        if (e.defaultPrevented) return;
        stepper.navigation.prev();
      },
      ...rest,
    };
    if (render) return render(domProps);
    return <button {...domProps}>{children}</button>;
  };
}
