import type { Get, Step, Stepper } from "@stepperize/core";
import type { ScopedProps, StepperReturn } from "./types";

import * as React from "react";

import {
	executeStepCallback,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialStepIndex,
} from "@stepperize/core";

export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<Stepper<Steps> | null>(null);

	const utils = generateStepperUtils(...steps);

	const useStepper = (initialStep?: Get.Id<Steps>) => {
		const initialStepIndex = React.useMemo(() => getInitialStepIndex(steps, initialStep), [initialStep]);

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
				async beforeNext(callback) {
					if (isLast) {
						throw new Error("Cannot navigate to the next step because it is the last step.");
					}
					const shouldProceed = await executeStepCallback(callback, true);
					if (shouldProceed) {
						this.next();
					}
				},
				async afterNext(callback) {
					this.next();
					await executeStepCallback(callback, false);
				},
				async beforePrev(callback) {
					if (isFirst) {
						throw new Error("Cannot navigate to the previous step because it is the first step.");
					}
					const shouldProceed = await executeStepCallback(callback, true);
					if (shouldProceed) {
						this.prev();
					}
				},
				async afterPrev(callback) {
					if (isFirst) {
						throw new Error("Cannot navigate to the previous step because it is the first step.");
					}
					this.prev();
					await executeStepCallback(callback, false);
				},
				next() {
					if (isLast) {
						throw new Error("Cannot navigate to the next step because it is the last step.");
					}
					setStepIndex(stepIndex + 1);
				},
				prev() {
					if (isFirst) {
						throw new Error("Cannot navigate to the previous step because it is the first step.");
					}
					setStepIndex(stepIndex - 1);
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
		useStepper: (initialStep?: Get.Id<Steps>) => React.useContext(Context) ?? useStepper(initialStep),
	};
};
