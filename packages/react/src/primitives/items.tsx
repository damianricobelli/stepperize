import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { AutoStepProvider } from "./context";
import { useStepperContextOrThrow } from "./helpers";
import type { ItemsProps, PrimitiveComponent } from "./types";

export function createItems<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<ItemsProps<Steps>> {
	return function Items(props: ItemsProps<Steps>) {
		const stepper = useStepperContextOrThrow(StepperContext);

		return (
			<>
				{stepper.steps.map((step, index) => (
					<AutoStepProvider key={step.id} value={step}>
						{props.children(step, index)}
					</AutoStepProvider>
				))}
			</>
		);
	};
}
