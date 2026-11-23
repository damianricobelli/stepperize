<script lang="ts">
import type { Options } from "../../lib/index";
import Early from "./Early.svelte";
import { type Api, flow, type steps } from "./flow";

let {
	options,
	ready,
	early = false,
}: { options?: Options<typeof steps>; ready?: (stepper: Api) => void; early?: boolean } = $props();
// svelte-ignore state_referenced_locally
const stepper = flow.useStepper(options);
// svelte-ignore state_referenced_locally
ready?.(stepper);
</script>

<output>{stepper.current.title} {String(stepper.data.first)}</output>
<span>{stepper.current.id}</span>
{#if early}
	<Early write={() => stepper.setData("first", "early")} />
{/if}
