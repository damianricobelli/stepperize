"use client";

import * as React from "react";

import { StepLabels } from "@/components/stepper/step-labels";
import { StepTriggerContent } from "@/components/stepper/step-trigger-content";
import { Button } from "@/components/ui/button";
import {
	Stepper,
	StepperStep,
	createSteps,
	useStepper,
	useStepperConfig,
	useStepperResponsive,
} from "@stepperize/react";
import { cva } from "class-variance-authority";

const steps = createSteps([
	{ id: "step-1", title: "Label 1", description: "Description 1" },
	{ id: "step-2", title: "Label 2", description: "Description 2" },
	{ id: "step-3", title: "Label 3", description: "Description 3" },
	{ id: "step-4", title: "Label 4", description: "Description 4" },
] as const);

type Steps = typeof steps;

export function Basic() {
	const isMobile = useStepperResponsive("(max-width: 768px)");

	const orientation = isMobile ? "vertical" : "horizontal";

	if (isMobile === null) {
		return null;
	}

	return (
		<div className="flex w-full flex-col gap-4 border rounded-lg p-4">
			<Stepper
				steps={steps}
				orientation={orientation}
				className="flex flex-col gap-4"
			>
				<StepperContent />
				<StepperActions />
			</Stepper>
		</div>
	);
}

//#region StepperContent

const StepperContent = () => {
	const { orientation } = useStepperConfig();
	const { steps } = useStepper<Steps>();

	const lastStepIndex = steps.length - 1;

	return (
		<nav
			role="tablist"
			aria-orientation={orientation}
			className="flex flex-col gap-4"
		>
			{orientation === "horizontal" ? (
				<React.Fragment>
					<ol className="flex w-full items-center gap-2">
						{steps.map((step, index) => (
							<li
								key={step.id}
								{...step?.dataAttr}
								className={`group flex gap-2 items-center ${index === lastStepIndex ? "flex-shrink-0" : "flex-grow"}`}
							>
								<a {...step?.triggerProps} className={classForStepTrigger()}>
									<StepTriggerContent index={index} icon={step.icon} />
								</a>
								<StepLabels title={step.title} description={step.description} />
								{index < steps.length - 1 && (
									<div className="flex-1">
										<hr className="border border-border group-data-[completed=true]:border-primary" />
									</div>
								)}
							</li>
						))}
					</ol>
					{steps.map((step, index) => (
						<StepperStep
							key={step.id}
							index={index}
							className="h-40 w-full flex items-center justify-center border bg-secondary text-primary rounded-md"
						>
							<h1 className="text-xl">{step.title}</h1>
						</StepperStep>
					))}
				</React.Fragment>
			) : (
				<ol className="w-full flex flex-col">
					{steps.map((step, index) => (
						<div key={step.id} {...step?.dataAttr} className="group">
							<li className="flex gap-2 items-center">
								<a {...step?.triggerProps} className={classForStepTrigger()}>
									<StepTriggerContent index={index} icon={step.icon} />
								</a>
								<StepLabels title={step.title} description={step.description} />
							</li>
							<div className="flex group-data-[last=false]:my-2 group-data-[last=true]:group-data-[completed=false]:mt-4">
								{index !== lastStepIndex && (
									<div className="ms-5 min-h-4">
										<hr className="border border-border group-data-[completed=true]:border-primary h-full" />
									</div>
								)}
								<StepperStep
									key={step.id}
									index={index}
									className="ms-4 group-data-[last=false]:my-3 h-40 w-full flex items-center justify-center border bg-secondary text-primary rounded-md"
								>
									<h1 className="text-xl">{step.title}</h1>
								</StepperStep>
							</div>
						</div>
					))}
				</ol>
			)}
		</nav>
	);
};

const classForStepTrigger = cva([
	// General styles
	"rounded-full p-0 pointer-events-none size-10",
	"border-2 flex justify-center items-center",
	"hover:cursor-pointer ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-4 focus:rounded-full",
	// Disabled
	"group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
	// Clickable
	"group-data-[clickable=true]:pointer-events-auto",
	// Completed
	"group-data-[completed=true]:bg-primary group-data-[completed=true]:border-primary group-data-[completed=true]:text-primary-foreground",
	// Active
	"group-data-[active=true]:border-primary group-data-[active=true]:bg-secondary",
	// Error
	"group-data-[error=true]:bg-destructive group-data-[error=true]:border-destructive group-data-[error=true]:text-destructive-foreground",
]);

//#endregion

//#region StepperActions

export const StepperActions = () => {
	const {
		isLastStep,
		isOptionalStep,
		goToNextStep,
		goToPrevStep,
		canGoToNextStep,
		canGoToPrevStep,
		reset,
		isStepperFinished,
	} = useStepper();

	return (
		<React.Fragment>
			{isStepperFinished && (
				<div className="h-40 w-full flex items-center justify-center border bg-secondary text-primary rounded-md">
					<h1 className="text-xl">Woohoo! All steps completed! 🎉</h1>
				</div>
			)}
			<div className="w-full flex justify-end gap-2">
				{isStepperFinished ? (
					<Button type="button" onClick={reset}>
						Reset
					</Button>
				) : (
					<>
						<Button
							variant="ghost"
							disabled={!canGoToPrevStep}
							onClick={goToPrevStep}
						>
							Prev
						</Button>
						<Button disabled={!canGoToNextStep} onClick={goToNextStep}>
							{isLastStep ? "Finish" : isOptionalStep ? "Skip" : "Next"}
						</Button>
					</>
				)}
			</div>
		</React.Fragment>
	);
};

//#endregion
