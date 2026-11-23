<script lang="ts">
import type { Step } from "@stepperize/core";
import { defined, share, useFlow } from "./flow.svelte.js";
import { useScope } from "./scope.js";
import type { ProviderProps } from "./types.js";

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
