import type { Step, Stepper } from "@stepperize/core";
import React from "react";
import type { PrimitiveComponent, RootProps } from "./types";

type RootStateKeys =
	| "defaultStep"
	| "step"
	| "onStepChange"
	| "onInvalidStep"
	| "defaultData"
	| "data"
	| "onDataChange"
	| "completed"
	| "onCompletedChange"
	| "linear"
	| "beforeStepChange";

export function createRoot<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
	Provider: (props: React.PropsWithChildren<any>) => React.ReactElement,
): PrimitiveComponent<RootProps<Steps>> {
	function RootInner({ children, orientation, ...rest }: Omit<RootProps<Steps>, RootStateKeys>) {
		const stepper = React.useContext(StepperContext);
		if (!stepper) {
			throw new Error("Missing Stepper.Provider.");
		}

		return React.createElement(
			"div",
			{
				"data-component": "stepper",
				"data-orientation": orientation,
				role: "group",
				"aria-label": "Stepper",
				...rest,
			},
			typeof children === "function" ? children({ stepper }) : children,
		);
	}

	return function Root(props: RootProps<Steps>) {
		const {
			defaultStep,
			step,
			onStepChange,
			onInvalidStep,
			defaultData,
			data,
			onDataChange,
			completed,
			onCompletedChange,
			linear,
			beforeStepChange,
			children,
			...rootInnerProps
		} = props;

		return (
			<Provider
				defaultStep={defaultStep}
				step={step}
				onStepChange={onStepChange}
				onInvalidStep={onInvalidStep}
				defaultData={defaultData}
				data={data}
				onDataChange={onDataChange}
				completed={completed}
				onCompletedChange={onCompletedChange}
				linear={linear}
				beforeStepChange={beforeStepChange}
			>
				<RootInner {...(rootInnerProps as Omit<RootProps<Steps>, RootStateKeys>)}>{children}</RootInner>
			</Provider>
		);
	};
}
