import { Button } from "@/components/ui/button";
import { Stepper, defineSteps, useStepper } from "@stepperize/react";

const steps = defineSteps(
	{ id: "first" },
	{ id: "second" },
	{ id: "third" },
	{ id: "last" },
);

type Steps = typeof steps;

export const MyFirstStepper = () => {
	return (
		<Stepper steps={steps}>
			<MySteps />
		</Stepper>
	);
};

const MySteps = () => {
	const {
		when,
		goToNextStep,
		goToPrevStep,
		isLastStep,
		reset,
		isFirstStep,
		currentStep,
	} = useStepper<Steps>();

	return (
		<div className="flex flex-col gap-4 bg-gray-3 p-4 my-4 rounded-md">
			{when("first").render((step) => (
				<p>This is the {step.id}</p>
			))}

			{when("second").render((step) => (
				<p>This is the {step.id}</p>
			))}

			{when("third").render((step) => (
				<p>This is the {step.id}</p>
			))}

			{when("last").render(() => (
				<p>You have reached the end of the stepper</p>
			))}

			{!isLastStep ? (
				<div className="flex items-center gap-2">
					<Button onClick={goToPrevStep} disabled={isFirstStep}>
						Previous
					</Button>
					<Button onClick={goToNextStep}>
						{currentStep.id === "third" ? "Finish" : "Next"}
					</Button>
				</div>
			) : (
				<div className="flex items-center gap-2">
					<Button onClick={reset}>Reset</Button>
				</div>
			)}
		</div>
	);
};
