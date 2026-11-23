<script lang="ts">
import type { Step } from "@stepperize/core";
import { listAttrs, onListKeydown } from "@stepperize/core/primitives";
import { useShared } from "../flow.svelte.js";
import { useScope } from "../scope.js";
import type { ListProps } from "../types.js";
import { setTablist, useElement, useRoot } from "./context.svelte.js";
import Index from "./Index.svelte";

let { orientation, item, children, child, onkeydown, ...rest }: ListProps<readonly Step[]> = $props();

const scope = useScope();
const { ui } = useRoot();
// Read lazily in the handler so the List never updates on navigation.
const { flow } = useShared(scope);
setTablist(ui);
const attach = useElement("List", () => !!child);
const direction = $derived(orientation ?? ui.orientation);
const attrs = $derived({
	...listAttrs(ui, direction),
	...rest,
	...attach,
	onkeydown: (event: KeyboardEvent & { currentTarget: EventTarget & HTMLOListElement }) => {
		onkeydown?.(event);
		onListKeydown(event, event.currentTarget, flow, ui, direction);
	},
});
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<ol {...attrs}>
		{#if item}
			{#each scope.steps as step, index (step.id)}
				<Index {index}>{@render item(step, index)}</Index>
			{/each}
		{:else}
			{@render children?.()}
		{/if}
	</ol>
{/if}
