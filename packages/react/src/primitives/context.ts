import type { Step, StepStatus } from "@stepperize/core";
import React from "react";
import type { StepperContext } from "../context";

export type StepItemValue<S extends Step = Step> = {
	data: S;
	index: number;
	status: StepStatus;
	complete: boolean;
	isActive: boolean;
	canGoTo: boolean;
	count: number;
};

/** Each definition owns its context. Nesting a different flow cannot redirect its actions. */
export function createStepperScope<Steps extends readonly Step[]>(context: StepperContext<Steps>) {
	const StepItemContext = React.createContext<StepItemValue | null>(null);
	const AutoStepContext = React.createContext<{ step: Step; index: number } | null>(null);
	const OrientationContext = React.createContext<"horizontal" | "vertical">("horizontal");

	function useStepItem<S extends Step = Step>(): StepItemValue<S> {
		const item = React.useContext(StepItemContext);
		if (!item) throw new Error("Missing Stepper.Item.");
		return item as StepItemValue<S>;
	}

	return {
		...context,
		useStepItem,
		ItemContext: StepItemContext,
		AutoContext: AutoStepContext,
		OrientationContext,
	};
}

export type StepperScope<Steps extends readonly Step[]> = ReturnType<typeof createStepperScope<Steps>>;

export const triggerDomId = (instance: string, step: string) => `${instance}step-${step}`;
export const panelDomId = (instance: string, step: string) => `${instance}step-panel-${step}`;
