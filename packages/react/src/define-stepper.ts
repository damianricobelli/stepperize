import { generateCommonStepperUseFns, generateStepperUtils, getInitialStepIndex, Step, Stepper, StepperGet } from "@stepperize/core";
import type { ScopedProps, StepperReturn } from "./types";

import * as React from "react";

export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<Stepper<Steps> | null>(null);

	const utils = generateStepperUtils(...steps);

	const useStepper = (initialStep?: StepperGet.Id<Steps>) => {
		const initialStepIndex = React.useMemo(
			() => getInitialStepIndex(steps, initialStep),
			[initialStep],
		);

		const [stepIndex, setStepIndex] = React.useState(initialStepIndex);

		const stepper = React.useMemo(() => {
			const current = steps[stepIndex];
			const isLast = stepIndex === steps.length - 1;
			const isFirst = stepIndex === 0;

			return {
				all: steps,
				current,
				isLast,
				isFirst,
				next() {
					if (!isLast) {
						setStepIndex(stepIndex + 1);
					}
				},
				prev() {
					if (!isFirst) {
						setStepIndex(stepIndex - 1);
					}
				},
				get(id) {
					return steps.find((step) => step.id === id);
				},
				goTo(id) {
					const index = steps.findIndex((s) => s.id === id);
					setStepIndex(index);
				},
				reset() {
					setStepIndex(initialStepIndex);
				},
				...generateCommonStepperUseFns(steps, current, stepIndex),
			} as Stepper<Steps>;
		}, [stepIndex]);

		return stepper;
	};

	return {
		steps,
		utils,
		Scoped: ({ initialStep, children }: ScopedProps<Steps>) =>
			React.createElement(
				Context.Provider,
				{
					value: useStepper(initialStep),
				},
				children,
			),
		useStepper: (initialStep?: StepperGet.Id<Steps>) => React.useContext(Context) ?? useStepper(initialStep),
	};
};
