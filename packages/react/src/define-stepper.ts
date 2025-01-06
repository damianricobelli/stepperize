import type { Get, ScopedProps, Step, Stepper, StepperReturn, Utils } from "./types";

import * as React from "react";

export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<Stepper<Steps> | null>(null);

	const utils = {
		getAll() {
			return steps;
		},
		get: (id) => {
			const step = steps.find((step) => step.id === id);
			return step as Get.StepById<Steps, typeof id>;
		},
		getIndex: (id) => steps.findIndex((step) => step.id === id),
		getByIndex: (index) => steps[index],
		getFirst() {
			return steps[0];
		},
		getLast() {
			return steps[steps.length - 1];
		},
		getNext(id) {
			return steps[steps.findIndex((step) => step.id === id) + 1];
		},
		getPrev(id) {
			return steps[steps.findIndex((step) => step.id === id) - 1];
		},
		getNeighbors(id) {
			const index = steps.findIndex((step) => step.id === id);
			return {
				prev: index > 0 ? steps[index - 1] : null,
				next: index < steps.length - 1 ? steps[index + 1] : null,
			};
		},
	} satisfies Utils<Steps>;

	const useStepper = (initialStep?: Get.Id<Steps>) => {
		const initialStepIndex = React.useMemo(
			() =>
				Math.max(
					steps.findIndex((step) => step.id === initialStep),
					0,
				),
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
				switch(when) {
					const whenFn = when[current.id as keyof typeof when];
					return whenFn?.(current as Get.StepById<typeof steps, (typeof current)["id"]>);
				},
				when(id, whenFn, elseFn) {
					const currentStep = steps[stepIndex];
					const matchesId = Array.isArray(id)
						? currentStep.id === id[0] && id.slice(1).every(Boolean)
						: currentStep.id === id;

					return matchesId ? whenFn?.(currentStep as any) : elseFn?.(currentStep as any);
				},
				match(state, matches) {
					const matchFn = matches[state as keyof typeof matches];
					return matchFn?.(state as any);
				},
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
