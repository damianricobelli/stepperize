"use client";

import * as React from "react";

import { StepContext, StepperProviderContext } from "./context";
import { useSearchParams } from "./hooks/use-search-params";

//#region Types

/**
 * Type representing an icon that can be used in the stepper.
 */
type IconType = React.ComponentType<any> | undefined;

/**
 * Props for each step in the Stepper.
 */
type Step<StepId extends string = string> = {
	/**
	 * Unique identifier for the step. This is used to identify the step in the stepper.
	 */
	id: StepId;
	/**
	 * Component to be displayed for the step. This is optional (as you can simply render different components in the function that exists as children in <Stepper />) and can be used to render custom content for the step
	 */
	component?: React.ReactNode;
	/**
	 * Icon to be displayed for the step.
	 */
	icon?: IconType;
	/**
	 * Title of the step.
	 */
	title?: string;
	/**
	 * Description of the step.
	 */
	description?: string;
	/**
	 * Whether the step is disabled.
	 */
	isDisabled?: boolean;
	/**
	 * Whether the step is optional.
	 */
	isOptional?: boolean;
	/**
	 * Function to be called when the step is clicked.
	 */
	onClick?: (step: Step<StepId>) => void;
};

/**
 * Props for the Stepper component.
 */
type StepperProviderProps<Steps extends readonly Step[] = readonly Step[]> = {
	/**
	 * Number of steps in the stepper. Optional.
	 */
	stepsCount?: number;
	/**
	 * ID of the initial step to display. Optional.
	 */
	initialStep?: Steps[number]["id"];
	/**
	 * Orientation of the stepper. Can be "horizontal" or "vertical".
	 */
	orientation?: "horizontal" | "vertical";
	/**
	 * Whether the stepper is expandable.
	 */
	expandable?: boolean;
	/**
	 * Whether steps are clickable.
	 */
	clickable?: boolean;
	/**
	 * Icon to display when loading.
	 */
	loadingIcon?: IconType;
	/**
	 * Icon to display when a step is successful.
	 */
	successIcon?: IconType;
	/**
	 * Icon to display when a step encounters an error.
	 */
	errorIcon?: IconType;
};

type StepperProps<
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
> = Omit<StepperProviderProps<Steps>, "stepsCount"> & {
	steps: Steps;
	initialState?: "loading" | "error" | "idle";
	metadata?: Metadata;
	onChangeMetadata?: (data: Metadata) => void;
	searchParams?: boolean;
	ref?: React.Ref<HTMLDivElement>;
	children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

//#endregion

//#region Stepper

const Stepper = <
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
>({
	// Config props
	steps,
	initialStep: initialStepId,
	orientation = "horizontal",
	expandable = false,
	clickable = false,
	loadingIcon,
	successIcon,
	errorIcon,
	// Custom props
	initialState = "idle",
	metadata,
	onChangeMetadata,
	searchParams: searchParamsProp = false,
	// Common props
	className,
	ref,
	children,
	...props
}: StepperProps<Steps, Metadata>) => {
	type StepIds = Steps[number]["id"];

	/********** STATES **********/

	const [stepperState, setStepperState] = React.useState(initialState);
	const [searchParams, setSearchParams] = useSearchParams();

	const initialStep =
		steps.find((step) => step.id === initialStepId) || steps[0];

	const [currentActiveStep, setCurrentActiveStep] =
		React.useState<Step<StepIds>>(initialStep);

	const [isStepperFinished, setIsStepperFinished] = React.useState(false);

	const currentActiveStepIndex = steps.findIndex(
		(step) => step.id === currentActiveStep.id,
	);

	const maxStepIndex = steps.length - 1;
	const stepsCount = steps.length;

	const canGoToNextStep =
		currentActiveStepIndex < stepsCount && stepperState === "idle";

	const canGoToPrevStep = currentActiveStepIndex > 0 && stepperState === "idle";

	const isLastStep = currentActiveStepIndex === maxStepIndex;
	const isOptionalStep = currentActiveStep.isOptional || false;

	/********** FUNCTIONS **********/

	const getStepFromValue = React.useCallback(
		(value: StepIds) => steps.find((step) => step.id === value),
		[steps],
	);

	const setStep = React.useCallback<(step: StepIds) => void>(
		(step) => {
			const newStep = getStepFromValue(step);

			if (newStep) {
				setCurrentActiveStep(newStep);
				if (searchParamsProp) {
					setSearchParams({ step });
				}
				return;
			}

			throw new Error("Step not valid");
		},
		[getStepFromValue, searchParamsProp, setSearchParams],
	);

	const goToNextStep = React.useCallback(() => {
		if (canGoToNextStep) {
			if (isLastStep) {
				setIsStepperFinished(true);
			} else {
				const nextStep = steps[currentActiveStepIndex + 1];
				setCurrentActiveStep(nextStep);
				if (searchParamsProp) {
					setSearchParams({ step: nextStep.id });
				}
			}
		}
	}, [
		canGoToNextStep,
		currentActiveStepIndex,
		steps,
		isLastStep,
		searchParamsProp,
		setSearchParams,
	]);

	const goToPrevStep = React.useCallback(() => {
		if (canGoToPrevStep) {
			const prevStep = steps[currentActiveStepIndex - 1];
			setCurrentActiveStep(prevStep);
			if (searchParamsProp) {
				setSearchParams({ step: prevStep.id });
			}
		}
	}, [
		canGoToPrevStep,
		currentActiveStepIndex,
		steps,
		searchParamsProp,
		setSearchParams,
	]);

	const reset = React.useCallback(() => {
		setCurrentActiveStep(initialStep);
		if (searchParamsProp) {
			setSearchParams({ step: initialStep.id });
		}
		setIsStepperFinished(false);
	}, [initialStep, searchParamsProp, setSearchParams]);

	// Sync state with URL query param if searchParams prop is true
	React.useEffect(() => {
		if (searchParamsProp) {
			const stepFromQuery = searchParams.step as StepIds | undefined;
			if (!stepFromQuery) {
				setSearchParams({ step: currentActiveStep.id });
			} else if (stepFromQuery !== currentActiveStep.id) {
				const newStep = getStepFromValue(stepFromQuery);
				if (newStep) {
					setCurrentActiveStep(newStep);
				}
			}
		}
	}, [
		setSearchParams,
		searchParams.step,
		getStepFromValue,
		currentActiveStep.id,
		searchParamsProp,
	]);

	return (
		<StepperProviderContext.Provider
			value={{
				stepsCount,
				initialStep: initialStep.id,
				orientation,
				expandable,
				clickable,
				loadingIcon,
				successIcon,
				errorIcon,
			}}
		>
			<StepContext.Provider
				value={{
					goToNextStep,
					goToPrevStep,
					canGoToNextStep,
					canGoToPrevStep,
					setStep,
					reset,
					currentActiveStep,
					currentActiveStepIndex,
					steps: steps as any,
					isStepperFinished,
					isLastStep,
					isOptionalStep,
					state: stepperState,
					setState: setStepperState,
					metadata,
					onChangeMetadata,
				}}
			>
				<div ref={ref} className={className} {...props}>
					{children}
				</div>
			</StepContext.Provider>
		</StepperProviderContext.Provider>
	);
};

//#endregion

export { Stepper };
export type { StepperProviderProps, Step };

//#endregion
