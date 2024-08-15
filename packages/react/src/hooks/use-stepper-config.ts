import * as React from "react";
import { StepperProviderContext } from "../context";
import type { Step, StepperProviderProps } from "../stepper";

/**
 *  Hook to access the stepper configuration. Must be used within a StepperProvider.
 * @returns The stepper configuration.
 */
export function useStepperConfig<Steps extends readonly Step[]>() {
	const context = React.useContext<StepperProviderProps<Steps>>(
		StepperProviderContext,
	);

	if (!context) {
		throw new Error("useStepperConfig must be used within a StepperProvider");
	}

	return context;
}
