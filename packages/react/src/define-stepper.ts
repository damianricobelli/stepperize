import type { Get, ScopedProps, Step, Stepper } from "./types";

import * as React from "react";

export const defineStepper = <Steps extends Step[]>(...steps: Steps) => {
	const Context = React.createContext(null as any as Stepper<Steps>);

	const useStepper = (initialStep?: Get.Id<Steps>) => {
		const initialCounter = React.useMemo(
			() =>
				Math.max(
					steps.findIndex((step) => step.id === initialStep),
					0,
				),
			[initialStep],
		);

		const [counter, setCounter] = React.useState(initialCounter);

		const stepper = React.useMemo(() => {
			const current = steps[counter];
			const isLast = counter === steps.length - 1;
			const isFirst = counter === 0;

			return {
				all: steps,
				current: {
					...current,
					index: counter,
				},
				isLast,
				isFirst,
				get(id) {
					return steps.find((step) => step.id === id);
				},
				goTo(id) {
					const index = steps.findIndex((step) => step.id === id);

					setCounter(index);
				},
				next() {
					if (!isLast) {
						setCounter(counter + 1);
					}
				},
				prev() {
					if (!isFirst) {
						setCounter(counter - 1);
					}
				},
				reset() {
					setCounter(initialCounter);
				},
				switch(when) {
					const whenFn = when[current.id as keyof typeof when];
					return whenFn?.(current as Get.StepById<typeof steps, (typeof current)["id"]>);
				},
				when(id, whenFn, elseFn) {
					return steps[counter].id === id ? whenFn?.(steps[counter] as any) : elseFn?.(steps[counter] as any);
				},
				match(state, matches) {
					const matchFn = matches[state as keyof typeof matches];
					return matchFn?.(state as any);
				},
			} as Stepper<Steps>;
		}, [counter]);

		return stepper;
	};

	return {
		steps,
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