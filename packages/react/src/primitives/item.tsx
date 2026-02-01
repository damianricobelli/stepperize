import * as React from "react";
import type { Get, Step, Stepper } from "@stepperize/core";
import type { ItemProps, StepStatus } from "./types";
import { StepItemProvider } from "./context";

export function createItem<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
) {
	return function Item(props: ItemProps<Steps>) {
		const { step, render, children, ...rest } = props;
		const stepper = React.useContext(StepperContext);
		if (!stepper) {
			throw new Error("Stepper.Item must be used within Stepper.Root.");
		}
		const stepIndex = stepper.query.getIndex(step);
		const currentIndex = stepper.state.current.index;
		const status: StepStatus =
			stepIndex < currentIndex ? "success" : stepIndex === currentIndex ? "active" : "inactive";
		const stepData = stepper.query.get(step as Get.Id<Steps>);
		const itemValue = React.useMemo(() => ({ status, data: stepData }), [status, stepData]);
		const domProps = {
			"data-component": "stepper-item",
			"data-status": status,
			...rest,
		};
		if (render) {
			return React.createElement(StepItemProvider, {
				value: itemValue,
				children: render(domProps)
			});
		}
		return React.createElement(
			StepItemProvider,
			{ value: itemValue, children: React.createElement("li", domProps, children) },
		);
	};
}
