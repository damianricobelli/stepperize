<script lang="ts">
import { defineStepper } from "../headless";

export const survey = defineStepper([{ id: "intro" }, { id: "questions" }, { id: "thanks" }]);
export type Survey = ReturnType<typeof survey.useStepper>;
</script>

<script setup lang="ts">
const props = defineProps<{
	load: () => Promise<"intro" | "questions" | "thanks">;
	ready: (stepper: Survey) => void;
}>();

// `<script setup>` restores the component after `await`: the flow is still owned and destroyed with it.
const step = await props.load();
const stepper = survey.useStepper({ snapshot: { step } });
props.ready(stepper);
</script>

<template>
	<output>{{ stepper.current.id }}</output>
</template>
