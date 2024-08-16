import type { Step, StepWithAttr, StepperProps } from "./types";

import * as React from "react";

import { StepperContext } from "./context";
import { getStepById as getStepByIdHelper } from "./helpers";

//#region Stepper

export const Stepper = <
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
>({
	steps,
	initialStep,
	expandable = false,
	metadata,
	onChangeMetadata,
	children,
}: StepperProps<Steps, Metadata>) => {
	const initialCounter = React.useMemo(
		() => steps.findIndex((step) => step.id === (initialStep ?? steps[0].id)),
		[steps, initialStep],
	);

	const [counter, setCounter] = React.useState(initialCounter);

	const currentStep = steps[counter];
	const isLastStep = counter === steps.length - 1;
	const isFirstStep = counter === 0;

	const stepsCount = steps.length;

	function goToNextStep() {
		if (!isLastStep) {
			setCounter((counter) => counter + 1);
		}
	}

	function goToPrevStep() {
		if (!isFirstStep) {
			setCounter((counter) => counter - 1);
		}
	}

	function goToStep(id: Step["id"]) {
		const index = steps.findIndex((step) => step.id === id);
		setCounter(index);
	}

	function reset() {
		setCounter(initialCounter);
	}

	function getStepById(id: Step["id"]) {
		return getStepByIdHelper(steps, id);
	}

	const getAttributesById = (id: Step["id"]) => {
		const step = getStepById(id);
		const isActive = step.id === currentStep.id;
		return {
			dataAttr: {
				"data-step": step.id,
				"data-optional": step.isOptional ?? false,
				"data-disabled": step.isDisabled ?? false,
				"data-completed": currentStep.id > step.id,
				"data-active": isActive,
				"data-last": isLastStep,
			},
			ariaAttr: {
				role: "tab",
				"aria-disabled": step.isDisabled ?? false,
				"aria-selected": isActive,
				"aria-controls": step.id,
				"aria-label": step.title ?? step.id,
				"aria-current": isActive ? "step" : undefined,
				"aria-posinset": counter + 1,
				"aria-setsize": stepsCount,
				"aria-labelledby": `${step.id}-label`,
				"aria-describedby": step.description ?? step.id,
				"aria-expanded": expandable,
			},
		};
	};

	const when = (id: Step["id"]) => {
		const step = {
			...steps[counter],
			...getAttributesById(id),
		};

		return {
			render(fn: (step: StepWithAttr<Step>) => React.ReactNode) {
				if (expandable || step.id === id) {
					return fn(step as StepWithAttr<Step>);
				}
				return null;
			},
		};
	};

	return (
		<StepperContext.Provider
			value={{
				steps,
				metadata,
				onChangeMetadata,
				currentStep,
				isLastStep,
				isFirstStep,
				goToNextStep,
				goToPrevStep,
				goToStep,
				getStepById,
				reset,
				stepsCount,
				when,
			}}
		>
			{children}
		</StepperContext.Provider>
	);
};

//#endregion
