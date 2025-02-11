import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import {
	executeStepCallback,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
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

export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const contextKey = Symbol("StepperizeContext") as InjectionKey<ComputedRef<Stepper<Steps>>>;

	const utils = generateStepperUtils(...steps);

	const useStepper = (
		initialStep?: MaybeRefOrGetter<Get.Id<Steps>>,
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>
	) => {
		const stepIndex = ref(getInitialStepIndex(steps, toValue(initialStep)));
		const metadata = ref(getInitialMetadata(steps, initialMetadata));

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
				metadata: metadata.value,
				setMetadata(id, data) {
					if (metadata.value[id] === data) return
					metadata.value[id] = data
				},
				getMetadata(id) {
					return metadata.value[id];
				},
				resetMetadata(keepInitialMetadata) {
					metadata.value = getInitialMetadata(steps, keepInitialMetadata ? initialMetadata : undefined);
				},
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
					stepIndex.value += 1;
				},
				prev() {
					if (isFirst) {
						throw new Error("Cannot navigate to the previous step because it is the first step.");
					}
					stepIndex.value -= 1;
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
