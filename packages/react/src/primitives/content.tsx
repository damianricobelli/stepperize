import * as React from "react";
import type { Step, Stepper } from "@stepperize/core";
import type { ContentProps } from "./types";

export function createContent<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
) {
	return function Content(props: ContentProps<Steps>) {
		const { step, render, children, ...rest } = props;
		const stepper = React.useContext(StepperContext);
		if (!stepper) {
			throw new Error("Stepper.Content must be used within Stepper.Root.");
		}
		const isActive = stepper.current.id === step;
		if (!isActive) {
			return null;
		}
		const domProps = {
			id: `step-panel-${step}`,
			"data-component": "stepper-content",
			role: "tabpanel" as const,
			"aria-labelledby": `step-${step}`,
			"aria-hidden": false,
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("div", domProps, children);
	};
}
