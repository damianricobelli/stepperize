import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import {
	executeTransition,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
	updateStepIndex,
} from "@stepperize/core";
import * as React from "react";
import type { StepperReturn } from "./types";

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
				next() {
					updateStepIndex(steps, stepIndex + 1, (newIndex) => {
						setStepIndex(newIndex);
					});
				},
				prev() {
					updateStepIndex(steps, stepIndex - 1, (newIndex) => {
						setStepIndex(newIndex);
					});
				},
				get(id) {
					return steps.find((step) => step.id === id);
				},
				goTo(id) {
					const index = steps.findIndex((s) => s.id === id);
					if (index === -1) throw new Error(`Step with id "${id}" not found.`);
					updateStepIndex(steps, index, (newIndex) => {
						setStepIndex(newIndex);
					});
				},
				reset() {
					updateStepIndex(steps, getInitialStepIndex(steps, initialStep), (newIndex) => {
						setStepIndex(newIndex);
					});
				},
				async beforeNext(callback) {
					await executeTransition({ stepper, direction: "next", callback, before: true });
				},
				async afterNext(callback) {
					this.next();
					await executeTransition({ stepper, direction: "next", callback, before: false });
				},
				async beforePrev(callback) {
					await executeTransition({ stepper, direction: "prev", callback, before: true });
				},
				async afterPrev(callback) {
					this.prev();
					await executeTransition({ stepper, direction: "prev", callback, before: false });
				},
				async beforeGoTo(id, callback) {
					await executeTransition({ stepper, direction: "goTo", callback, before: true, targetId: id });
				},
				async afterGoTo(id, callback) {
					this.goTo(id);
					await executeTransition({ stepper, direction: "goTo", callback, before: false, targetId: id });
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
