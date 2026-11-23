<script lang="ts">
import type { Step } from "@stepperize/core";
import { checkTrigger, triggerAttrs } from "@stepperize/core/primitives";
import { untrack } from "svelte";
import { useShared } from "../flow.svelte";
import { useScope } from "../scope";
import type { ButtonProps } from "../types";
import { useElement, useItem, useRoot } from "./context.svelte";

let { children, child, disabled, onclick, ...rest }: ButtonProps = $props();

const scope = useScope();
const { ui, register } = useRoot();
// Read lazily in the handler: the item above already follows this step.
const { flow } = useShared(scope);
const item = useItem<readonly Step[]>();
const attach = useElement(
	"Trigger",
	() => !!child,
	(node) => checkTrigger(node, item.step.id),
);
$effect(() => untrack(register));

// Only steps blocked before the running move are natively `disabled`: see `triggerAttrs`.
let blocked = untrack(() => item.disabled);
const off = $derived.by(() => {
	if (!item.pending) blocked = item.disabled;
	return !!disabled || blocked;
});
const attrs = $derived({
	// A default only: with `child`, the type of your own element stands.
	...(child ? {} : { type: "button" as const }),
	...rest,
	...triggerAttrs(ui, item, off, scope.steps.length),
	...attach,
	onclick: (event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => {
		onclick?.(event);
		if (!event.defaultPrevented && !item.pending) void flow.goTo(item.step.id);
	},
});
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<button {...attrs}>{@render children?.()}</button>
{/if}
