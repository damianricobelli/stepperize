import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import type { StepperReturn } from "./types";

import * as React from "react";

import {
	executeStepCallback,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
} from "@stepperize/core";

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<Stepper<Steps> | null>(null);

	const utils = generateStepperUtils(...steps);

	const useStepper = (config?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => {
		const { initialStep, initialMetadata } = config ?? {};
		const initialStepIndex = React.useMemo(() => getInitialStepIndex(steps, initialStep), [initialStep]);

		const [stepIndex, setStepIndex] = React.useState(initialStepIndex);
		const [metadata, setMetadata] = React.useState(() => getInitialMetadata(steps, initialMetadata));

		const stepper = React.useMemo(() => {
			const current = steps[stepIndex];
			const isLast = stepIndex === steps.length - 1;
			const isFirst = stepIndex === 0;

			return {
				all: steps,
				current,
				isLast,
				isFirst,
				metadata,
				setMetadata(id, data) {
					setMetadata((prev) => {
						if (prev[id] === data) return prev;
						return { ...prev, [id]: data };
					});
				},
				getMetadata(id) {
					return metadata[id];
				},
				resetMetadata(keepInitialMetadata) {
					setMetadata(getInitialMetadata(steps, keepInitialMetadata ? initialMetadata : undefined));
				},
				async beforeNext(callback) {
					if (isLast) throw new Error("Cannot navigate to the next step because it is the last step.");
					const shouldProceed = await executeStepCallback(callback, true);
					if (shouldProceed) this.next();
				},
				async afterNext(callback) {
					this.next();
					await executeStepCallback(callback, false);
				},
				async beforePrev(callback) {
					if (isFirst) throw new Error("Cannot navigate to the previous step because it is the first step.");
					const shouldProceed = await executeStepCallback(callback, true);
					if (shouldProceed) this.prev();
				},
				async afterPrev(callback) {
					if (isFirst) throw new Error("Cannot navigate to the previous step because it is the first step.");
					this.prev();
					await executeStepCallback(callback, false);
				},
				next() {
					if (isLast) throw new Error("Cannot navigate to the next step because it is the last step.");
					setStepIndex(stepIndex + 1);
				},
				prev() {
					if (isFirst) throw new Error("Cannot navigate to the previous step because it is the first step.");
					setStepIndex(stepIndex - 1);
				},
				get(id) {
					return steps.find((step) => step.id === id);
				},
				async beforeGoTo(id, callback) {
					const shouldProceed = await executeStepCallback(callback, true);
					if (shouldProceed) this.goTo(id);
				},
				async afterGoTo(id, callback) {
					this.goTo(id);
					await executeStepCallback(callback, false);
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
		}, [stepIndex, metadata]);

		return stepper;
	};

	return {
		steps,
		utils,
		Scoped: ({ initialStep, initialMetadata, children }) =>
			React.createElement(
				Context.Provider,
				{
					value: useStepper({ initialStep, initialMetadata }),
				},
				children,
			),
		useStepper: (props = {}) => React.useContext(Context) ?? useStepper(props),
	};
};
