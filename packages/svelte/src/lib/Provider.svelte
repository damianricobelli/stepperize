<script lang="ts">
import type { Step } from "@stepperize/core";
import { defined, share, useFlow } from "./flow.svelte";
import { useScope } from "./scope";
import type { ProviderProps } from "./types";

let {
	linear,
	next,
	guard,
	onChange,
	onFinish,
	snapshot,
	step,
	onInvalidStep,
	children,
}: ProviderProps<readonly Step[]> = $props();

const scope = useScope();
share(
	scope,
	useFlow(scope, () => defined({ linear, next, guard, onChange, onFinish, snapshot, step, onInvalidStep })),
);
</script>

{@render children?.()}
