import * as React from "react";
import type { Get, Step, Stepper } from "@stepperize/core";
import type { ItemProps, StepStatus } from "./types";
import { StepItemProvider } from "./context";

export function createItem<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
	utils: { getIndex: (id: Get.Id<Steps>) => number },
) {
	return function Item(props: ItemProps<Steps>) {
		const { step, render, children, ...rest } = props;
		const stepper = React.useContext(StepperContext);
		if (!stepper) {
			throw new Error("Stepper.Item must be used within Stepper.Root.");
		}
		const stepIndex = utils.getIndex(step);
		const currentIndex = utils.getIndex(stepper.current.id);
		const status: StepStatus =
			stepIndex < currentIndex ? "success" : stepIndex === currentIndex ? "active" : "inactive";
		const stepData = stepper.all[stepIndex];
		const itemValue = React.useMemo(
			() => ({ status, data: stepData }),
			[status, stepData],
		);
		const merged = {
			"data-component": "stepper-item",
			"data-status": status,
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"li">) : children;
		return React.createElement(
			StepItemProvider,
			{ value: itemValue, children: React.createElement("li", merged, content) },
		);
	};
}
