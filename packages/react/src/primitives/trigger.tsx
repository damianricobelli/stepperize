import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { useStepItemContext } from "./context";
import { runClickHandler, useStepperContextOrThrow } from "./helpers";
import type { PrimitiveComponent, TriggerProps } from "./types";

export function createTrigger<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<TriggerProps> {
	return function Trigger(props: TriggerProps) {
		const { render, children, ...rest } = props;
		const stepper = useStepperContextOrThrow(StepperContext);
		const item = useStepItemContext();
		const stepId = item.data.id;
		const isActive = stepper.id === stepId;
		const canGoTo = stepper.canGoTo(stepId as import("@stepperize/core").Get.Id<Steps>);
		const disabled = rest.disabled || !canGoTo;
		const handleClick = () => {
			void stepper.goTo(stepId as import("@stepperize/core").Get.Id<Steps>);
		};
		const domProps = {
			...rest,
			id: `step-${stepId}`,
			"data-component": "stepper-trigger",
			"data-status": item.status,
			role: "tab" as const,
			tabIndex: disabled ? -1 : isActive ? 0 : -1,
			disabled,
			"aria-disabled": disabled,
			"aria-controls": `step-panel-${stepId}`,
			"aria-current": isActive ? ("step" as const) : undefined,
			"aria-posinset": item.index + 1,
			"aria-setsize": stepper.steps.length,
			"aria-selected": isActive,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				runClickHandler(e, rest.onClick, handleClick);
			},
		};
		if (render) {
			return render(domProps);
		}
		return <button {...domProps}>{children}</button>;
	};
}
