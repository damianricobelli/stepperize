<script lang="ts">
import type { RootProps } from "../../lib/index";
import { Stepper, steps } from "./flow";

// Every prop goes to the Root.
let rest: Omit<RootProps<typeof steps>, "children"> = $props();
</script>

<Stepper.Root {...rest}>
	<Stepper.List>
		{#snippet item()}
			<Stepper.Item>
				<Stepper.Trigger>
					<Stepper.Indicator />
					<Stepper.Title />
					<Stepper.Description />
				</Stepper.Trigger>
			</Stepper.Item>
		{/snippet}
	</Stepper.List>
	{#each steps as step (step.id)}
		<Stepper.Content step={step.id}>
			<label>
				{step.title} name
				<input />
			</label>
		</Stepper.Content>
	{/each}
	<Stepper.Prev>Back</Stepper.Prev>
	<Stepper.Next>Continue</Stepper.Next>
</Stepper.Root>
