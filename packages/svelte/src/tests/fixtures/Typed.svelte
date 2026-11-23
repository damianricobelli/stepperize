<script lang="ts">
import { Stepper } from "./flow";

// Never rendered: `svelte-check` reads it to prove markup is typed with the step ids.
// An unknown id here is an error; `types.test-d.ts` asserts the prop types that make it one.
</script>

<Stepper.Root linear onFinish={(output) => output.first}>
	{#snippet children(stepper)}
		{stepper.current.title}
		<Stepper.List orientation="vertical">
			{#snippet item(step, index)}
				<Stepper.Item>{index} {step.description}</Stepper.Item>
			{/snippet}
		</Stepper.List>
		<Stepper.Content step="first" forceMount class="panel" />
	{/snippet}
</Stepper.Root>
