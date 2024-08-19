import * as React from 'react'

import { Button } from "@/components/ui/button"
import { defineStepper } from "@stepperize/react"

const { useStepper, Scoped } = defineStepper(
	{ id: "first", title: "First" },
	{ id: "second", title: "Second" },
	{ id: "third", title: "Third" },
	{ id: "last", title: "Last" },
)

export const MyScopedStepper = () => {
	return (
		<Scoped>
			<MySteps />
			<MyActions />
		</Scoped>
	)
}

const MySteps = () => {
	const stepper = useStepper()

	return (
		<>
			{stepper.when("first", (step) => (
				<p>This is the {step.id} step. So it begins.</p>
			))}

			{stepper.when("second", (step) => (
				<p>This is the {step.id} step.</p>
			))}

			{stepper.when("third", (step) => (
				<p>This is the {step.id} step.</p>
			))}

			{stepper.when("last", (step) => (
				<p>This is the {step.id} step. So it ends.</p>
			))}
		</>
	)
}

const MyActions = () => {
	const stepper = useStepper()

	return !stepper.isLastStep ? (
		<div className="flex items-center gap-2">
			<Button onClick={stepper.goToPrevStep} disabled={stepper.isFirstStep}>
				Previous
			</Button>

			<Button onClick={stepper.goToNextStep}>
				{stepper.when("third", () => "Finish", () => "Next")}
			</Button>
		</div>
	) : (
		<div className="flex items-center gap-2">
			<Button onClick={stepper.reset}>Reset</Button>
		</div>
	)
}
