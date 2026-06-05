import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { runClickHandler, useStepperContextOrThrow } from "./helpers";
import type { NextProps, PrimitiveComponent } from "./types";

export function createNext<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<NextProps> {
	return function Next(props: NextProps) {
		const { render, children, ...rest } = props;
		const stepper = useStepperContextOrThrow(StepperContext);
		const disabled = rest.disabled || !stepper.canNext;
		const domProps = {
			...rest,
			"data-component": "stepper-next",
			type: "button" as const,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				runClickHandler(e, rest.onClick, () => {
					void stepper.next();
				});
			},
			disabled,
			"aria-disabled": disabled,
		};
		if (render) return render(domProps);
		return <button {...domProps}>{children}</button>;
	};
}
