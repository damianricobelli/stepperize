import * as React from "react";
import type { Step, Stepper } from "@stepperize/core";
import type { RootProps } from "./types";

export function createRoot<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
) {
	return function Root(props: RootProps<Steps>) {
		const { children, orientation, ...rest } = props;
		const stepper = React.useContext(StepperContext);
		if (!stepper) {
			throw new Error("Stepper.Root must be used within Scoped.");
		}
		return React.createElement(
			"div",
			{
				"data-component": "stepper",
				"data-orientation": orientation,
				...rest,
			},
			typeof children === "function" ? children({ stepper }) : children,
		);
	};
}
