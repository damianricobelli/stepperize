"use client";

import type { Step, StepperProviderProps } from "./stepper";

import * as React from "react";

type UseStepActions<
	StepId extends string = string,
	Metadata = Record<string, any>,
> = {
	/**
	 * Allow to go to the next step
	 */
	goToNextStep: () => void;
	/**
	 * Allow to go to the previous step
	 */
	goToPrevStep: () => void;
	/**
	 * Reset the stepper to the first step or initial step
	 */
	reset: () => void;
	/**
	 * Check if the stepper can go to the next step
	 */
	canGoToNextStep: boolean;
	/**
	 * Check if the stepper can go to the previous step
	 */
	canGoToPrevStep: boolean;
	/**
	 * Set the current active step
	 */
	setStep: (step: StepId) => void;
	/**
	 * The current active step
	 */
	currentActiveStep: Step<StepId>;
	/**
	 * The index of the current active step
	 */
	currentActiveStepIndex: number;
	/**
	 * The array of steps
	 */
	steps: readonly Step<StepId>[];
	/**
	 * Check if the stepper is finished
	 */
	isStepperFinished: boolean;
	/**
	 * Check if the current step is the last step
	 */
	isLastStep: boolean;
	/**
	 * Check if the current step is an optional step
	 */
	isOptionalStep: boolean;
	/**
	 * The state of the stepper. This status is global for all steps, as once a step fails, we must prevent the user from advancing to the next steps.
	 */
	state: "loading" | "error" | "idle";
	/**
	 * Set the state of the stepper
	 */
	setState: (state: "loading" | "error" | "idle") => void;
	/**
	 * The metadata of the stepper. It can be used to store data between steps
	 */
	metadata?: Metadata;
	/**
	 * Callback to update the metadata
	 */
	onChangeMetadata?: (data: Metadata) => void;
};

const StepperProviderContext = React.createContext<StepperProviderProps<any>>(
	{},
);

const StepContext = React.createContext<UseStepActions<string, any>>({
	goToNextStep: () => {},
	goToPrevStep: () => {},
	reset: () => {},
	canGoToNextStep: false,
	canGoToPrevStep: false,
	setStep: () => {},
	currentActiveStep: { id: "" },
	currentActiveStepIndex: 0,
	steps: [],
	isStepperFinished: false,
	isLastStep: false,
	isOptionalStep: false,
	state: "idle",
	setState: () => {},
	metadata: {},
	onChangeMetadata: () => {},
});

export { StepperProviderContext, StepContext };
export type { UseStepActions };
