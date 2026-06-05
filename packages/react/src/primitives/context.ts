import type { Step, StepStatus } from "@stepperize/core";
import React from "react";

export type StepItemValue<S extends Step = Step> = {
	data: S;
	index: number;
	status: StepStatus;
};

const StepItemContext = React.createContext<StepItemValue | null>(null);
const AutoStepContext = React.createContext<Step | null>(null);

export function StepItemProvider<S extends Step>({
	value,
	children,
}: {
	value: StepItemValue<S>;
	children: React.ReactNode;
}) {
	return React.createElement(StepItemContext.Provider, { value, children });
}

export function AutoStepProvider<S extends Step>({ value, children }: { value: S; children: React.ReactNode }) {
	return React.createElement(AutoStepContext.Provider, { value, children });
}

export function useStepItemContext<S extends Step = Step>(): StepItemValue<S> {
	const context = React.useContext(StepItemContext);
	if (!context) {
		throw new Error("Missing Stepper.Item.");
	}
	return context as StepItemValue<S>;
}

export function useOptionalStepItemContext<S extends Step = Step>() {
	return React.useContext(StepItemContext) as StepItemValue<S> | null;
}

export function useAutoStep<S extends Step = Step>() {
	return React.useContext(AutoStepContext) as S | null;
}

export { AutoStepContext, StepItemContext };
