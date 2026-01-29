import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import {
	executeTransition,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
	updateStepIndex,
} from "@stepperize/core";
import { createMemo } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { StepperReturn } from "./types";

/**
 * Configuration options for the stepper.
 */
export type StepperConfig<Steps extends Step[]> = {
	/** The initial step to display. */
	initialStep?: Get.Id<Steps>;
	/** The initial metadata. */
	initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
};

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @param config - Optional configuration options.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(
	steps: Steps,
	config: StepperConfig<Steps> = {},
): StepperReturn<Steps> => {
	const utils = generateStepperUtils(...steps);

	const [state, setState] = createStore({
		stepIndex: getInitialStepIndex(steps, config.initialStep),
		metadata: getInitialMetadata(steps, config.initialMetadata),
	});

	const useStepper = (props?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => {
		// Merge props with config (props take precedence)
		const initialStep = props?.initialStep ?? config.initialStep;
		const initialMetadata = { ...config.initialMetadata, ...props?.initialMetadata };
		const initialStepIndex = getInitialStepIndex(steps, initialStep);

		if (initialStep || initialMetadata) {
			setState(
				produce((state) => {
					state.stepIndex = initialStepIndex;
					state.metadata = getInitialMetadata(steps, initialMetadata);
				}),
			);
		}

		const currentStep = createMemo(() => steps[state.stepIndex]);

		const stepper = {
			all: steps,
			get current() {
				return currentStep();
			},
			get isLast() {
				return state.stepIndex === steps.length - 1;
			},
			get isFirst() {
				return state.stepIndex === 0;
			},
			metadata: state.metadata,
			setMetadata(id, data) {
				if (state.metadata[id] === data) return;
				setState(
					produce((state) => {
						state.metadata[id] = data;
					}),
				);
			},
			getMetadata(id) {
				return state.metadata[id];
			},
			resetMetadata(keepInitialMetadata) {
				const newMetadata = getInitialMetadata(steps, keepInitialMetadata ? initialMetadata : undefined);
				setState(
					produce((state) => {
						state.metadata = newMetadata;
					}),
				);
			},
			next() {
				updateStepIndex(steps, state.stepIndex + 1, (newIndex) => {
					setState(
						produce((state) => {
							state.stepIndex = newIndex;
						}),
					);
				});
			},
			prev() {
				updateStepIndex(steps, state.stepIndex - 1, (newIndex) => {
					setState(
						produce((state) => {
							state.stepIndex = newIndex;
						}),
					);
				});
			},
			get(id) {
				return steps.find((step) => step.id === id);
			},
			goTo(id) {
				const index = steps.findIndex((s) => s.id === id);
				if (index === -1) throw new Error(`Step with id "${id}" not found.`);
				updateStepIndex(steps, index, (newIndex) => {
					setState(
						produce((state) => {
							state.stepIndex = newIndex;
						}),
					);
				});
			},
			reset() {
				updateStepIndex(steps, getInitialStepIndex(steps, initialStep), (newIndex) => {
					setState(
						produce((state) => {
							state.stepIndex = newIndex;
						}),
					);
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
			when(...args) {
				return generateCommonStepperUseFns(steps, currentStep(), state.stepIndex).when(...args);
			},
			switch(...args) {
				return generateCommonStepperUseFns(steps, currentStep(), state.stepIndex).switch(...args);
			},
			match(...args) {
				return generateCommonStepperUseFns(steps, currentStep(), state.stepIndex).match(...args);
			},
		} as Stepper<Steps>;

		return stepper;
	};

	return {
		steps,
		utils,
		useStepper,
	};
};
