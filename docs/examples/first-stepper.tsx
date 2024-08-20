import { Button } from "@/components/ui/button";
import { defineStepper } from "@stepperize/react";

const { useStepper } = defineStepper(
	{ id: "first", title: "First" },
	{ id: "second", title: "Second" },
	{ id: "third", title: "Third" },
	{ id: "last", title: "Last" },
);

export const MyFirstStepper = () => {
	const stepper = useStepper();

	return (
		<div className="flex flex-col gap-4 bg-gray-3 p-4 my-4 rounded-md">
			{stepper.when("first", (step) => (
				<p>This is the {step.title} step.</p>
			))}

			{stepper.when("second", (step) => (
				<p>This is the {step.title} step.</p>
			))}

			{stepper.when("third", (step) => (
				<p>This is the {step.title} step.</p>
			))}

			{stepper.when("last", (step) => (
				<p>You have reached the {step.title} step.</p>
			))}

			{!stepper.isLast ? (
				<div className="flex items-center gap-2">
					<Button onClick={stepper.prev} disabled={stepper.isFirst}>
						Previous
					</Button>

					<Button onClick={stepper.next}>
						{stepper.when(
							"third",
							() => "Finish",
							() => "Next",
						)}
					</Button>
				</div>
			) : (
				<div className="flex items-center gap-2">
					<Button onClick={stepper.reset}>Reset</Button>
				</div>
			)}
		</div>
	);
};
