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
	onBeforeStepChange,
	onAfterStepChange,
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

	async function changeStep(newCounter: number) {
		const nextStep = steps[newCounter];

		if (onBeforeStepChange) {
			const result = await onBeforeStepChange(currentStep, nextStep);
			if (result === false) {
				return;
			}
		}

		setCounter(newCounter);

		if (onAfterStepChange) {
			await onAfterStepChange(currentStep, nextStep);
		}
	}

	function goToNextStep() {
		if (!isLastStep) {
			changeStep(counter + 1);
		}
	}

	function goToPrevStep() {
		if (!isFirstStep) {
			changeStep(counter - 1);
		}
	}

	function goToStep(id: Step["id"]) {
		const index = steps.findIndex((step) => step.id === id);
		changeStep(index);
	}

	function reset() {
		changeStep(initialCounter);
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
				"data-completed": counter > steps.findIndex((s) => s.id === id),
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
				"aria-setsize": steps.length,
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
				when,
			}}
		>
			{children}
		</StepperContext.Provider>
	);
};

//#endregion
