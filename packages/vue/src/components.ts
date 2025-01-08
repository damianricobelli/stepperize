import type { Get, Step, Stepper } from "@stepperize/core";
import { type EmitsOptions, type SetupContext, type SlotsType, defineComponent } from "vue";

export interface StepperWhenProps<Steps extends Step[], Id extends Get.Id<Steps>> {
	stepper: Stepper<Steps>;
	when: Id | [Id, ...boolean[]];
}

export const StepperWhen = defineComponent(
	<const Steps extends Step[], Id extends Get.Id<Steps>>(
		props: StepperWhenProps<Steps, Id>,
		{
			slots,
		}: SetupContext<
			EmitsOptions,
			SlotsType<{
				default?: (step: Get.StepById<Steps, Id>) => any;
				else?: (step: Get.StepSansId<Steps, Id>) => any;
			}>
		>,
	) => {
		return () =>
			props.stepper.when(
				props.when,
				(step) => slots.default?.(step),
				(step) => slots.else?.(step),
			);
	},
	{
		name: "StepperWhen",
		props: ["stepper", "when"] as any, // fix vue typing issue,
	},
);

export interface StepperSwitchProps<Steps extends Step[]> {
	stepper: Stepper<Steps>;
}

export const StepperSwitch = defineComponent(
	<const Steps extends Step[]>(
		props: StepperSwitchProps<Steps>,
		{ slots }: SetupContext<EmitsOptions, SlotsType<Get.Switch<Steps, any>>>,
	) => {
		return () => props.stepper.switch(slots as Get.Switch<Steps, any>);
	},
	{
		name: "StepperSwitch",
		props: ["stepper"] as any, // fix vue typing issue,
	},
);

export interface StepperMatchProps<State extends Get.Id<Steps>, Steps extends Step[]> {
	stepper: Stepper<Steps>;
	state: State;
}

export const StepperMatch = defineComponent(
	<State extends Get.Id<Steps>, const Steps extends Step[]>(
		props: StepperMatchProps<State, Steps>,
		{ slots }: SetupContext<EmitsOptions, SlotsType<Get.Switch<Steps, any>>>,
	) => {
		return () => props.stepper.match(props.state, slots as Get.Switch<Steps, any>);
	},
	{
		name: "StepperMatch",
		props: ["stepper", "state"] as any, // fix vue typing issue,
	},
);
