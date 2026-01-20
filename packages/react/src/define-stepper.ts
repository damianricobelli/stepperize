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
 * @param steps - The full list of steps.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<Stepper<Steps> | null>(null);

	const utils = generateStepperUtils(...steps);

	const useStepper = (config?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
		/**
		 * Optional callback that returns the list of step IDs to include at runtime.
		 * Only steps whose IDs are returned here will be part of the stepper.
		 */
		stepFilter?: () => Get.Id<Steps>[];
	}) => {
		const { initialStep, initialMetadata, stepFilter } = config ?? {};

		// Determine allowed IDs (dynamic or all)
		const allowedIds = React.useMemo(
			() => (stepFilter ? stepFilter() : steps.map((s) => s.id as Get.Id<Steps>)),
			[stepFilter],
		);

		// Filter the full steps list according to allowed IDs
		const filteredSteps = React.useMemo(
			() => steps.filter((s) => allowedIds.includes(s.id as Get.Id<Steps>)),
			[allowedIds],
		) as Steps;

		// Compute initial index within filtered steps
		const initialIndex = React.useMemo(
			() => getInitialStepIndex(filteredSteps, initialStep),
			[filteredSteps, initialStep],
		);

		const [stepIndex, setStepIndex] = React.useState(initialIndex);
		const [metadata, setMetadata] = React.useState(() => getInitialMetadata(filteredSteps, initialMetadata));

		
		// Build the stepper object
		const stepper = React.useMemo(() => {
			const current = filteredSteps[stepIndex];
			const isLast = stepIndex === filteredSteps.length - 1;
			const isFirst = stepIndex === 0;

			return {
				all: filteredSteps,
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
				resetMetadata(keepInitial) {
					setMetadata(getInitialMetadata(filteredSteps, keepInitial ? initialMetadata : undefined));
				},
				next() {
					updateStepIndex(filteredSteps, stepIndex + 1, setStepIndex);
				},
				prev() {
					updateStepIndex(filteredSteps, stepIndex - 1, setStepIndex);
				},
				get(id) {
					return utils.get(id);
				},
				goTo(id) {
					const idx = filteredSteps.findIndex((s) => s.id === id);
					if (idx === -1) throw new Error(`Step with id \"${id}\" not found in filtered steps.`);
					updateStepIndex(filteredSteps, idx, setStepIndex);
				},
				reset() {
					updateStepIndex(filteredSteps, getInitialStepIndex(filteredSteps, initialStep), setStepIndex);
				},
				async beforeNext(cb) {
					await executeTransition({ stepper: this as any, direction: "next", callback: cb, before: true });
				},
				async afterNext(cb) {
					this.next();
					await executeTransition({ stepper: this as any, direction: "next", callback: cb, before: false });
				},
				async beforePrev(cb) {
					await executeTransition({ stepper: this as any, direction: "prev", callback: cb, before: true });
				},
				async afterPrev(cb) {
					this.prev();
					await executeTransition({ stepper: this as any, direction: "prev", callback: cb, before: false });
				},
				async beforeGoTo(id, cb) {
					await executeTransition({
						stepper: this as any,
						direction: "goTo",
						callback: cb,
						before: true,
						targetId: id,
					});
				},
				async afterGoTo(id, cb) {
					this.goTo(id);
					await executeTransition({
						stepper: this as any,
						direction: "goTo",
						callback: cb,
						before: false,
						targetId: id,
					});
				},
				...generateCommonStepperUseFns(filteredSteps, current, stepIndex),
			} as Stepper<Steps>;
		}, [stepIndex, metadata, filteredSteps]);

		return stepper;
	};

	return {
		steps,
		utils,
		Scoped: ({ initialStep, initialMetadata, children }) =>
			React.createElement(Context.Provider, { value: useStepper({ initialStep, initialMetadata }) }, children),
		useStepper: (props = {}) => React.useContext(Context) ?? useStepper(props),
	};
};
