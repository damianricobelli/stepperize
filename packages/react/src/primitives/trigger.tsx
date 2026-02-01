import * as React from "react";
import type { Step, Stepper } from "@stepperize/core";
import type { TriggerProps } from "./types";
import { useStepItemContext } from "./context";

export function createTrigger<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
) {
	return function Trigger(props: TriggerProps) {
		const { render, children, ...rest } = props;
		const stepper = React.useContext(StepperContext);
		const item = useStepItemContext();
		if (!stepper) {
			throw new Error("Stepper.Trigger must be used within Stepper.Root.");
		}
		const stepId = item.data.id;
		const isActive = stepper.state.current.data.id === stepId;
		const stepIndex = stepper.state.all.findIndex((s) => s.id === stepId);
		const handleClick = () => stepper.navigation.goTo(stepId as import("@stepperize/core").Get.Id<Steps>);
		const domProps = {
			...rest,
			id: `step-${stepId}`,
			"data-component": "stepper-trigger",
			"data-status": item.status,
			role: "tab" as const,
			tabIndex: item.status === "inactive" ? -1 : 0,
			"aria-controls": `step-panel-${stepId}`,
			"aria-current": isActive ? ("step" as const) : undefined,
			"aria-posinset": stepIndex + 1,
			"aria-setsize": stepper.state.all.length,
			"aria-selected": isActive,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				handleClick();
				rest.onClick?.(e);
			},
		};
		const content = render ? render(domProps) : children;
		return React.createElement("button", { type: "button", ...domProps }, content);
	};
}
