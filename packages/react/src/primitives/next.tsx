import * as React from "react";
import type { Step, Stepper } from "@stepperize/core";
import type { NextProps } from "./types";

export function createNext<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
) {
	return function Next(props: NextProps) {
		const { render, children, ...rest } = props;
		const stepper = React.useContext(StepperContext);
		if (!stepper) {
			throw new Error("Stepper.Next must be used within Stepper.Root.");
		}
		const domProps = {
			"data-component": "stepper-next",
			type: "button" as const,
			disabled: stepper.state.isLast,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				stepper.navigation.next();
				rest.onClick?.(e);
			},
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("button", domProps, children);
	};
}
