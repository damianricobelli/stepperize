<script lang="ts">
import type { Step } from "@stepperize/core";
import { checkTrigger, triggerAttrs } from "@stepperize/core/primitives";
import { untrack } from "svelte";
import type { MouseEventHandler } from "svelte/elements";
import { useShared } from "../flow.svelte.js";
import { useScope } from "../scope.js";
import type { ButtonChildProps, ButtonProps } from "../types.js";
import { useElement, useItem, useRoot } from "./context.svelte.js";

let { ref = $bindable(null), children, child, disabled, onclick, ...rest }: ButtonProps = $props();

const scope = useScope();
const { ui, register } = useRoot();
// Read lazily in the handler: the item above already follows this step.
const { flow } = useShared(scope);
const item = useItem<readonly Step[]>();
const attach = useElement<HTMLButtonElement>(
	"Trigger",
	(node) => (ref = node),
	() => !!child,
	(node) => checkTrigger(node, item.step.id),
);
$effect(() => untrack(register));

// Only steps blocked before the running move are natively `disabled`: see `triggerAttrs`.
// While a move runs every step reports `disabled`; keeping the value from before it keeps
// the clicked trigger focusable. Updated before the DOM is, in the same flush.
let blocked = $state.raw(untrack(() => item.disabled));
$effect.pre(() => {
	if (!item.pending) blocked = item.disabled;
});
const click: MouseEventHandler<HTMLElement> = (event) => {
	// Your handler was typed for the default `button`; with `child` it gets your element.
	onclick?.(event as Parameters<MouseEventHandler<HTMLButtonElement>>[0]);
	if (!event.defaultPrevented && !item.pending) void flow.goTo(item.step.id);
};
const attrs = $derived({
	// A default only: with `child`, the type of your own element stands.
	...(child ? {} : { type: "button" as const }),
	...rest,
	...triggerAttrs(ui, item, !!disabled || blocked, scope.steps.length),
	...attach,
	onclick: click,
});
</script>

{#if child}
	{@render child({ props: attrs as ButtonChildProps })}
{:else}
	<button {...attrs}>{@render children?.()}</button>
{/if}
