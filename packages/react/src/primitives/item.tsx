import type { Get, Step, Stepper } from "@stepperize/core";
import React from "react";
import { StepItemProvider, type StepItemValue, useAutoStep } from "./context";
import { useStepperContextOrThrow } from "./helpers";
import type { ItemProps, PrimitiveComponent } from "./types";

export function createItem<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<ItemProps<Steps>> {
	return function Item(props: ItemProps<Steps>) {
		const { step: explicitStep, render, children, ...rest } = props;
		const autoStep = useAutoStep<Steps[number]>();
		const stepId = explicitStep ?? (autoStep?.id as Get.Id<Steps> | undefined);

		if (!stepId) {
			throw new Error("Stepper.Item needs a step prop or must be used inside Stepper.Items.");
		}

		const stepper = useStepperContextOrThrow(StepperContext);
		const stepIndex = stepper.steps.findIndex((s) => s.id === stepId);
		const status = stepper.status(stepId);
		const stepData = stepper.steps.find((s) => s.id === stepId) as Get.StepById<Steps, Get.Id<Steps>> | undefined;

		if (!stepData) {
			throw new Error(`Step "${stepId}" not found.`);
		}

		const itemValue = React.useMemo(
			(): StepItemValue<Get.StepById<Steps, Get.Id<Steps>>> => ({
				data: stepData as Get.StepById<Steps, Get.Id<Steps>>,
				index: stepIndex,
				status,
			}),
			[stepData, stepIndex, status],
		);

		const domProps = {
			"data-component": "stepper-item",
			"data-status": status,
			...rest,
		};

		return (
			<StepItemProvider value={itemValue}>
				{render ? render(domProps) : <li {...domProps}>{children}</li>}
			</StepItemProvider>
		);
	};
}
