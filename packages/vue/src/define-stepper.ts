import type { Get, Step, Stepper } from "@stepperize/core";
import { generateCommonStepperUseFns, generateStepperUtils, getInitialStepIndex } from "@stepperize/core";
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

export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const contextKey = Symbol("StepperizeContext") as InjectionKey<ComputedRef<Stepper<Steps>>>;

	const utils = generateStepperUtils(...steps);

	const useStepper = (initialStep?: MaybeRefOrGetter<Get.Id<Steps>>) => {
		const stepIndex = ref(getInitialStepIndex(steps, toValue(initialStep)));
		watch(
			() => toValue(initialStep),
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
				next() {
					if (!isLast) {
						stepIndex.value += 1;
					}
				},
				prev() {
					if (!isFirst) {
						stepIndex.value -= 1;
					}
				},
				get(id) {
					return steps.find((step) => step.id === id);
				},
				goTo(id) {
					const index = steps.findIndex((s) => s.id === id);
					stepIndex.value = index;
				},
				reset() {
					stepIndex.value = getInitialStepIndex(steps, toValue(initialStep));
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
			provide(contextKey, useStepper(props.initialStep));
			return () => slots.default?.();
		}),
		useStepper(initialStep) {
			return inject(contextKey) ?? useStepper(initialStep);
		},
	};
};
