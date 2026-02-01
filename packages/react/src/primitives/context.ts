import * as React from "react";
import type { Step, StepperState } from "@stepperize/core";

/** Same shape as `useStepper().state.current` — data, index, status, metadata. */
export type StepItemValue<S extends Step = Step> = StepperState<[S]>["current"];

const StepItemContext = React.createContext<StepItemValue | null>(null);

export function StepItemProvider<S extends Step>({
	value,
	children,
}: {
	value: StepItemValue<S>;
	children: React.ReactNode;
}) {
	return React.createElement(StepItemContext.Provider, { value, children });
}

export function useStepItemContext<S extends Step = Step>(): StepItemValue<S> {
	const context = React.useContext(StepItemContext);
	if (!context) {
		throw new Error("useStepItemContext must be used within a Stepper.Item.");
	}
	return context as StepItemValue<S>;
}

export { StepItemContext };
