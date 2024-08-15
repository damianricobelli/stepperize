import * as React from "react";

import { useStepper } from "./hooks/use-stepper";
import { useStepperConfig } from "./hooks/use-stepper-config";

/**
 * Props for the StepperStep component, excluding 'id' and 'onClick'.
 */
type StepperStepProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"id" | "onClick"
> & {
	/**
	 * Index of the step.
	 */
	index: number;
};

/**
 * StepperStep component renders the content of a step.
 * It only renders the step content if the step is the current active step and the stepper is not finished
 */
const StepperStep = React.forwardRef<HTMLDivElement, StepperStepProps>(
	({ children, className, index, ...props }, ref) => {
		const { expandable, orientation } = useStepperConfig();
		const { isStepperFinished, currentActiveStepIndex } = useStepper();

		// Determine if the current step is active
		const isActiveStep = currentActiveStepIndex === index;

		if (
			isStepperFinished || // If the stepper is finished, don't render
			(!isActiveStep && !expandable) || // If not active and not expandable, don't render
			(!isActiveStep && orientation === "horizontal") // If not active and horizontal orientation, don't render
		) {
			return null;
		}

		return (
			<div ref={ref} className={className} {...props}>
				{children}
			</div>
		);
	},
);

StepperStep.displayName = "StepperStep";

export { StepperStep };
