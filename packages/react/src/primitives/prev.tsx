import * as React from "react";
import type { Step, Stepper } from "@stepperize/core";
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
			disabled: stepper.isFirst,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				stepper.prev();
				rest.onClick?.(e);
			},
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("button", domProps, children);
	};
}
