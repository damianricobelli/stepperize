<script lang="ts">
import type { Options } from "../../lib/index";
import { flow, type steps } from "./flow";
import Grab from "./Grab.svelte";

// The flow options as props of a Root or a Provider, changed by the test through `rerender`.
let {
	provider = false,
	ready,
	...options
}: Options<typeof steps> & { provider?: boolean; ready?: (stepper: any) => void } = $props();
const { Stepper } = flow;
</script>

{#if provider}
	<flow.Provider {...options}>
		<Grab definition={flow} {ready} />
	</flow.Provider>
{:else}
	<Stepper.Root {...options}>
		<Grab definition={flow} {ready} />
		<Stepper.List>
			{#snippet item()}
				<Stepper.Item>
					<Stepper.Trigger><Stepper.Title /></Stepper.Trigger>
				</Stepper.Item>
			{/snippet}
		</Stepper.List>
		<Stepper.Content step="first">One</Stepper.Content>
		<Stepper.Content step="second">Two</Stepper.Content>
		<Stepper.Content step="third">Three</Stepper.Content>
	</Stepper.Root>
{/if}
