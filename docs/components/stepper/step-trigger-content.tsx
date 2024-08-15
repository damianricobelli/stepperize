import { type Step, useStepper, useStepperConfig } from "@stepperize/react";
import { cva } from "class-variance-authority";
import { Check, Loader2, X } from "lucide-react";

export const StepTriggerContent = ({
	index,
	icon: StepIcon,
}: {
	index: number;
	icon: Step["icon"];
}) => {
	const {
		successIcon: CustomSuccessIcon = Check,
		errorIcon: CustomErrorIcon = X,
		loadingIcon: CustomLoadingIcon = Loader2,
	} = useStepperConfig<Step[]>();

	const { state, currentActiveStepIndex, isStepperFinished } = useStepper();

	const isCompletedStep = currentActiveStepIndex > index || isStepperFinished;
	const isActiveStep = currentActiveStepIndex === index && !isCompletedStep;
	const isLoading = state === "loading" && isActiveStep;
	const isError = state === "error" && isActiveStep;

	if (isCompletedStep) {
		return (
			<CustomSuccessIcon className={iconVariants({ variant: "success" })} />
		);
	}

	if (isActiveStep) {
		if (isError) {
			return <CustomErrorIcon className={iconVariants({ variant: "error" })} />;
		}
		if (isLoading) {
			return (
				<CustomLoadingIcon className={iconVariants({ variant: "loading" })} />
			);
		}
	}

	if (StepIcon) {
		return <StepIcon className={iconVariants({ variant: "custom" })} />;
	}

	return index + 1;
};

const iconVariants = cva("size-4", {
	variants: {
		variant: {
			success: "",
			error: "",
			loading: "animate-spin",
			custom: "",
		},
	},
});
