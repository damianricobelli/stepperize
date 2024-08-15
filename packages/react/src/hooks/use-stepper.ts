import type { UseStepActions } from "../context";
import type { Step } from "../stepper";

import * as React from "react";

import { StepContext } from "../context";
import { useStepperConfig } from "./use-stepper-config";

export interface ExtendedStep<StepId extends string> extends Step<StepId> {
	triggerProps: JSX.IntrinsicElements["a"];
	dataAttr: Record<string, any>;
	index: number;
}

/**
 * Hook to access the stepper actions. Must be used within a StepperProvider.
 * @returns The stepper values and actions.
 */
export function useStepper<
	T extends readonly Step[],
	Metadata = Record<string, any>,
>(): Omit<UseStepActions<T[number]["id"], Metadata>, "steps"> & {
	steps: readonly ExtendedStep<T[number]["id"]>[];
} {
	const context = React.useContext(StepContext);

	const { clickable, orientation } = useStepperConfig();

	if (!context) {
		throw new Error("useStepper must be used within a StepperProvider");
	}

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLAnchorElement>, stepIndex: number) => {
			const steps = context.steps;
			const currentStep = steps[stepIndex];

			const allSteps = Array.from(
				document.querySelectorAll("a[aria-controls]"),
			);

			const findNextEnabledStep = (currentIndex: number) => {
				for (let i = currentIndex + 1; i < steps.length; i++) {
					if (!steps[i].isDisabled) {
						return i;
					}
				}
				return null;
			};

			const findPreviousEnabledStep = (currentIndex: number) => {
				for (let i = currentIndex - 1; i >= 0; i--) {
					if (!steps[i].isDisabled) {
						return i;
					}
				}
				return null;
			};

			const nextStepIndex = findNextEnabledStep(stepIndex);
			const previousStepIndex = findPreviousEnabledStep(stepIndex);

			if (
				nextStepIndex !== null &&
				nextStepIndex !== undefined &&
				((e.key === "ArrowRight" && orientation === "horizontal") ||
					(e.key === "ArrowDown" && orientation === "vertical"))
			) {
				const nextLink = allSteps[nextStepIndex] as HTMLAnchorElement;
				nextLink.focus();
				e.preventDefault();
			}

			if (
				previousStepIndex !== null &&
				previousStepIndex !== undefined &&
				((e.key === "ArrowLeft" && orientation === "horizontal") ||
					(e.key === "ArrowUp" && orientation === "vertical"))
			) {
				const previousLink = allSteps[previousStepIndex] as HTMLAnchorElement;
				previousLink.focus();
				e.preventDefault();
			}

			if (e.key === "Enter" || e.key === " ") {
				if (!currentStep.isDisabled && clickable) {
					if (currentStep.onClick) {
						currentStep.onClick(currentStep);
						return;
					}
					context.setStep(currentStep.id);
				}
			}

			if (e.key === "Escape") {
				(e.target as HTMLElement).blur();
			}
		},
		[clickable, context.setStep, context.steps, orientation],
	);

	const extendedSteps = context.steps.map((step, i) => {
		const currentStep = { ...step } as ExtendedStep<T[number]["id"]>;

		const isCompletedStep =
			context.currentActiveStepIndex > i || context.isStepperFinished;
		const isActiveStep =
			context.currentActiveStepIndex === i && !isCompletedStep;
		const isLoading = context.state === "loading" && isActiveStep;
		const isError = context.state === "error" && isActiveStep;
		const isLastStep = i === context.steps.length - 1;

		currentStep.triggerProps = {
			role: "tab",
			"aria-selected": isActiveStep,
			"aria-controls": currentStep.id,
			"aria-label": currentStep.title,
			"aria-describedby": currentStep.description,
			"aria-disabled": isLoading || currentStep.isDisabled,
			"aria-expanded": isActiveStep,
			"aria-posinset": i + 1,
			"aria-setsize": context.steps.length,
			"aria-labelledby": `${currentStep.id}-label`,
			"aria-current": isActiveStep ? "step" : undefined,
			tabIndex: clickable ? (isActiveStep ? 0 : -1) : undefined,
			onKeyDown: (e: React.KeyboardEvent<HTMLAnchorElement>) =>
				handleKeyDown(e, i),
			onClick: () => {
				if (!currentStep.isDisabled && clickable) {
					if (currentStep.onClick) {
						currentStep.onClick(currentStep);
					} else {
						context.setStep(currentStep.id);
					}
				}
			},
		};

		currentStep.dataAttr = {
			"data-step": currentStep.id,
			"data-optional": currentStep.isOptional,
			"data-disabled": isLoading || currentStep.isDisabled,
			"data-completed": isCompletedStep,
			"data-active": isActiveStep,
			"data-clickable": clickable,
			"data-loading": isLoading,
			"data-error": isError,
			"data-last": isLastStep,
		};

		currentStep.index = i;

		return currentStep;
	}) as readonly ExtendedStep<T[number]["id"]>[];

	return {
		...context,
		steps: extendedSteps,
	};
}
