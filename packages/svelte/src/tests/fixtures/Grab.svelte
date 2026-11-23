<script lang="ts">
// Hands the shared flow of the Root or Provider it is rendered in to the test.
let { definition, ready }: { definition: { useStepperContext: () => unknown }; ready?: (stepper: any) => void } =
	$props();
// svelte-ignore state_referenced_locally
const stepper = definition.useStepperContext();
// svelte-ignore state_referenced_locally
ready?.(stepper);
</script>
