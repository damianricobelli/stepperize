import type { Step, Stepper, Get } from './types'

import * as React from "react"

export const defineStepper = <const Steps extends Step[]>(...steps: Steps) => {
	const Context = React.createContext(null as any as Stepper<Steps>)

	const useStepper = (initialStep?: Get.Id<Steps>) => {
		const initialCounter = React.useMemo(
			() => Math.max(steps.findIndex((step) => step.id === initialStep), 0),
			[initialStep],
		)

		const [counter, setCounter] = React.useState(initialCounter)

		const stepper = React.useMemo(() => ({
			currentStep: steps[counter],
			isLastStep: counter === steps.length - 1,
			isFirstStep: counter === 0,
			goToStep(id) {
				const index = steps.findIndex((step) => step.id === id)

				setCounter(index)
			},
			goToNextStep() {
				if (!stepper.isLastStep) {
					setCounter(counter + 1)
				}
			},
			goToPrevStep() {
				if (!stepper.isFirstStep) {
					setCounter(counter - 1)
				}
			},
			reset() {
				setCounter(initialCounter)
			},
			getStepById(id) {
				return steps.find((step) => step.id === id)
			},
			when(id, whenFn, elseFn) {
				return (
					steps[counter].id === id
						? whenFn?.(steps[counter] as any)
						: elseFn?.(steps[counter] as any)
				)
			},
		}) as Stepper<Steps>, [counter])

		return stepper
	}

	return {
		steps,
		Scoped: ({ initialStep, children }: ScopedProps<Steps>) => React.createElement(Context.Provider, {
			value: useStepper(initialStep)
		}, children),
		useStepper: (initialStep?: Get.Id<Steps>) => React.useContext(Context) ?? useStepper(initialStep),
	}
}

type ScopedProps<Steps extends Step[]> = React.PropsWithChildren<{ initialStep?: Get.Id<Steps> }>
