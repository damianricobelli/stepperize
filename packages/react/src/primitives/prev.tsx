import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { runClickHandler, useStepperContextOrThrow } from "./helpers";
import type { PrevProps, PrimitiveComponent } from "./types";

export function createPrev<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<PrevProps> {
	return function Prev(props: PrevProps) {
		const { render, children, ...rest } = props;
		const stepper = useStepperContextOrThrow(StepperContext);
		const disabled = rest.disabled || !stepper.canPrev;
		const domProps = {
			...rest,
			"data-component": "stepper-prev",
			type: "button" as const,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				runClickHandler(e, rest.onClick, () => {
					void stepper.prev();
				});
			},
			disabled,
			"aria-disabled": disabled,
		};
		if (render) return render(domProps);
		return <button {...domProps}>{children}</button>;
	};
}
