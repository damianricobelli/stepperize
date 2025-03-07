import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import {
	executeTransition,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
	updateStepIndex,
} from "@stepperize/core";
import {
	type ComputedRef,
	type InjectionKey,
	type MaybeRefOrGetter,
	computed,
	defineComponent,
	inject,
	provide,
	ref,
	toValue,
	watch,
} from "vue";
import type { ScopedProps, StepperReturn } from "./types";

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const contextKey = Symbol("StepperizeContext") as InjectionKey<ComputedRef<Stepper<Steps>>>;

	const utils = generateStepperUtils(...steps);

	const useStepper = (config?: {
		initialStep?: MaybeRefOrGetter<Get.Id<Steps>>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => {
		const stepIndex = ref(getInitialStepIndex(steps, toValue(config?.initialStep)));
		const metadata = ref(getInitialMetadata(steps, toValue(config?.initialMetadata)));

		watch(
			() => toValue(config?.initialStep),
			(value) => {
				stepIndex.value = getInitialStepIndex(steps, value);
			},
		);

		const current = computed(() => steps[stepIndex.value]);

		const stepper = computed(() => {
			const currentStep = current.value;
			const currentStepIndex = stepIndex.value;

			const isLast = stepIndex.value === steps.length - 1;
			const isFirst = stepIndex.value === 0;

			return {
				all: steps,
				current: currentStep,
				isLast,
				isFirst,
				metadata: metadata.value,
				setMetadata(id, data) {
					if (metadata.value[id] === data) return;
					metadata.value[id] = data;
				},
				getMetadata(id) {
					return metadata.value[id];
				},
				resetMetadata(keepInitialMetadata) {
					metadata.value = getInitialMetadata(steps, keepInitialMetadata ? config?.initialMetadata : undefined);
				},
				next() {
					updateStepIndex(steps, stepIndex.value + 1, (newIndex) => {
						stepIndex.value = newIndex;
					});
				},
				prev() {
					updateStepIndex(steps, stepIndex.value - 1, (newIndex) => {
						stepIndex.value = newIndex;
					});
				},
				get(id) {
					return steps.find((step) => step.id === id);
				},
				goTo(id) {
					const index = steps.findIndex((s) => s.id === id);
					if (index === -1) throw new Error(`Step with id "${id}" not found.`);
					updateStepIndex(steps, index, (newIndex) => {
						stepIndex.value = newIndex;
					});
				},
				reset() {
					stepIndex.value = getInitialStepIndex(steps, toValue(config?.initialStep));
				},
				async beforeNext(callback) {
					await executeTransition({ stepper: stepper.value, direction: "next", callback, before: true });
				},
				async afterNext(callback) {
					this.next();
					await executeTransition({ stepper: stepper.value, direction: "next", callback, before: false });
				},
				async beforePrev(callback) {
					await executeTransition({ stepper: stepper.value, direction: "prev", callback, before: true });
				},
				async afterPrev(callback) {
					this.prev();
					await executeTransition({ stepper: stepper.value, direction: "prev", callback, before: false });
				},
				async beforeGoTo(id, callback) {
					await executeTransition({ stepper: stepper.value, direction: "goTo", callback, before: true, targetId: id });
				},
				async afterGoTo(id, callback) {
					this.goTo(id);
					await executeTransition({ stepper: stepper.value, direction: "goTo", callback, before: false, targetId: id });
				},
				...generateCommonStepperUseFns(steps, currentStep, currentStepIndex),
			} as Stepper<Steps>;
		});

		return stepper;
	};

	return {
		steps,
		utils,
		Scoped: defineComponent<ScopedProps<Steps>>((props, { slots }) => {
			provide(contextKey, useStepper(props));
			return () => slots.default?.();
		}),
		useStepper(props = {}) {
			return inject(contextKey) ?? useStepper(props);
		},
	};
};
