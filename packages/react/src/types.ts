import type { Get, Metadata, Step, Stepper, Utils } from "@stepperize/core";

export type ScopedProps<Steps extends Step[]> = React.PropsWithChildren<{
	/** The initial step to display. */
	initialStep?: Get.Id<Steps>;
	/** The initial metadata. */
	initialMetadata?: Record<Get.Id<Steps>, Metadata>;
}>;

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
	 * `Scoped` component is a wrapper that provides the stepper context to its children.
	 * It uses the `Context` to pass the stepper instance to the children.
	 *
	 * @param props - The props object containing `initialStep` and `children`.
	 * @param props.initialStep - The ID of the step to start with (optional).
	 * @param props.initialMetadata - The initial metadata (optional).
	 * @param props.children - The child elements to be wrapped by the `Scoped` component.
	 * @returns A React element that wraps the children with the stepper context.
	 */
	Scoped: (props: ScopedProps<Steps>) => React.ReactElement;
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
		/**
		 * Optional callback that returns the list of step IDs to include at runtime.
		 * Only steps whose IDs are returned here will be part of the stepper.
		 */
		stepFilter?: () => Get.Id<Steps>[];
	}) => Stepper<Steps>;
};
