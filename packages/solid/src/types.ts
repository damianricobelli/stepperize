import type { Get, Metadata, Step, Stepper, Utils } from "@stepperize/core";

export type ScopedProps<Steps extends Step[]> = {
	/** The initial step to display. */
	initialStep?: Get.Id<Steps>;
	/** The initial metadata. */
	initialMetadata?: Record<Get.Id<Steps>, Metadata>;
};

export type StepperReturn<Steps extends Step[]> = {
	/** The steps of the stepper. */
	steps: Steps;
	/**
	 * `utils` provides helper functions to interact with steps in the stepper.
	 * These functions allow you to get steps by their ID or index, get the first and last steps,
	 * and navigate through the steps by retrieving neighbors or adjacent steps.
	 *
	 * @returns An object containing utility methods to interact with the steps
	 */
	utils: Utils<Steps>;
	/**
	 * `useStepper` hook returns an object that manages the current step in the stepper.
	 * You can use this hook to get the current step, navigate to the next or previous step,
	 * and reset the stepper to the initial state.
	 *
	 * @param initialStep - The ID of the step to start with (optional).
	 * @param initialMetadata - The initial metadata (optional).
	 * @returns An object containing properties and methods to interact with the stepper.
	 */
	useStepper: (props?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => Stepper<Steps>;
};
