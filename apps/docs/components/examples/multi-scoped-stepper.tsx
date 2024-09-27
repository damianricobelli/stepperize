import { Button } from "@/components/ui/button";
import { defineStepper } from "@stepperize/react";

const GlobalStepper = defineStepper(
	{ id: "first", title: "First" },
	{ id: "second", title: "Second" },
	{ id: "last", title: "Last" },
);

const LocalStepper = defineStepper(
	{ id: "first", title: "First" },
	{ id: "second", title: "Second" },
	{ id: "last", title: "Last" },
);

export function MultiScopedStepper() {
	return (
		<GlobalStepper.Scoped>
			<MySteps />
			<MyActions />
		</GlobalStepper.Scoped>
	);
}

const MySteps = () => {
	const stepper = GlobalStepper.useStepper();

	return (
		<div className="flex flex-col gap-4 bg-gray-3 p-4 rounded-md">
			{stepper.when("first", (step) => (
				<span>This is the global {step.id} step. So it begins.</span>
			))}

			<MyLocalStepper />

			{stepper.when("last", (step) => (
				<span>This is the {step.id} step. So it ends.</span>
			))}
		</div>
	);
};

const MyLocalStepper = () => {
	const globalStepper = GlobalStepper.useStepper();
	const localStepper = LocalStepper.useStepper();

	return (
		<>
			{globalStepper.when("second", (step) => (
				<div className="flex flex-col gap-4">
					<span>This is the global {step.id} step.</span>
					<div className="flex flex-col gap-4 border p-4 rounded-md">
						{localStepper.when("first", (step) => (
							<span>This is the local {step.id} step.</span>
						))}
						{localStepper.when("second", (step) => (
							<span>This is the local {step.id} step.</span>
						))}
						{localStepper.when("last", (step) => (
							<span>This is the local {step.id} step.</span>
						))}
						<MyLocalActions />
					</div>
				</div>
			))}
		</>
	);
};

const MyActions = () => {
	const stepper = GlobalStepper.useStepper();

	return !stepper.isLast ? (
		<div className="flex items-center gap-2">
			<Button onClick={stepper.prev} disabled={stepper.isFirst}>
				Previous
			</Button>

			<Button onClick={stepper.next}>
				{stepper.when(
					"second",
					() => "Finish",
					() => "Next",
				)}
			</Button>
		</div>
	) : (
		<div className="flex items-center gap-2">
			<Button onClick={stepper.reset}>Reset</Button>
		</div>
	);
};

const MyLocalActions = () => {
	const stepper = LocalStepper.useStepper();

	return !stepper.isLast ? (
		<div className="flex items-center gap-2">
			<Button onClick={stepper.prev} disabled={stepper.isFirst}>
				Previous
			</Button>

			<Button onClick={stepper.next}>
				{stepper.when(
					"second",
					() => "Finish",
					() => "Next",
				)}
			</Button>
		</div>
	) : (
		<div className="flex items-center gap-2">
			<Button onClick={stepper.reset}>Reset</Button>
		</div>
	);
};
