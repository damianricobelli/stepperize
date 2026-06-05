import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { useStepperContextOrThrow } from "./helpers";
import type { ContentProps, PrimitiveComponent } from "./types";

export function createContent<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<ContentProps<Steps>> {
	return function Content(props: ContentProps<Steps>) {
		const { step, render, children, ...rest } = props;
		const stepper = useStepperContextOrThrow(StepperContext);
		const isActive = stepper.id === step;
		if (!isActive) {
			return null;
		}
		const domProps = {
			id: `step-panel-${step}`,
			"data-component": "stepper-content",
			role: "tabpanel" as const,
			"aria-labelledby": `step-${step}`,
			tabIndex: 0,
			...rest,
		};
		if (render) return render(domProps);
		return <div {...domProps}>{children}</div>;
	};
}
