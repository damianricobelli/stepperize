<script lang="ts">
import type { Step } from "@stepperize/core";
import { listAttrs, onListKeydown } from "@stepperize/core/primitives";
import type { KeyboardEventHandler } from "svelte/elements";
import { useShared } from "../flow.svelte.js";
import { useScope } from "../scope.js";
import type { ListChildProps, ListProps } from "../types.js";
import { setTablist, useElement, useRoot } from "./context.svelte.js";
import Index from "./Index.svelte";

let {
	orientation,
	ref = $bindable(null),
	item,
	children,
	child,
	onkeydown,
	...rest
}: ListProps<readonly Step[]> = $props();

const scope = useScope();
const { ui } = useRoot();
// Read lazily in the handler so the List never updates on navigation.
const { flow } = useShared(scope);
setTablist(ui);
const attach = useElement<HTMLOListElement>(
	"List",
	(node) => (ref = node),
	() => !!child,
);
const direction = $derived(orientation ?? ui.orientation);
// Typed for any element: a `child` snippet may put it on a `nav` or a `div`.
const keydown: KeyboardEventHandler<HTMLElement> = (event) => {
	// Your handler was typed for the default `ol`; with `child` it gets your element.
	onkeydown?.(event as Parameters<KeyboardEventHandler<HTMLOListElement>>[0]);
	onListKeydown(event, event.currentTarget, flow, ui, direction);
};
const attrs = $derived({ ...listAttrs(ui, direction), ...rest, ...attach, onkeydown: keydown });
</script>

{#if child}
	{@render child({ props: attrs as ListChildProps })}
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
