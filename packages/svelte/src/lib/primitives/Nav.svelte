<script lang="ts">
import { navAttrs, navBits, navIdle } from "@stepperize/core/primitives";
import type { MouseEventHandler } from "svelte/elements";
import { useShared } from "../flow.svelte.js";
import { useExtra, useScope } from "../scope.js";
import type { ButtonChildProps, ButtonProps } from "../types.js";
import { useElement } from "./context.svelte.js";

let { ref = $bindable(null), children, child, disabled, onclick, ...rest }: ButtonProps = $props();

// `Next` validates the current step and moves on; on the last step it finishes the
// flow (`onFinish`) once. `Prev` goes back to the step you came from.
const direction = useExtra<"next" | "prev">();
const { flow, view } = useShared(useScope());
const attach = useElement<HTMLButtonElement>(
	direction === "next" ? "Next" : "Prev",
	(node) => (ref = node),
	() => !!child,
);
const bits = $derived(navBits(view(), direction));
// Typed for any element: a `child` snippet may put it on a link.
const click: MouseEventHandler<HTMLElement> = (event) => {
	// Your handler was typed for the default `button`; with `child` it gets your element.
	onclick?.(event as Parameters<MouseEventHandler<HTMLButtonElement>>[0]);
	// A rejecting `onFinish` rejects `next()`: the flow is not finished and the button works
	// again. The error belongs to `onFinish`, which reports it; nothing awaits this click.
	if (!event.defaultPrevented && !navIdle(bits)) flow[direction]().catch(() => {});
};
const attrs = $derived({
	...(child ? {} : { type: "button" as const }),
	...rest,
	...navAttrs(direction, bits, !!disabled),
	...attach,
	onclick: click,
});
</script>

{#if child}
	{@render child({ props: attrs as ButtonChildProps })}
{:else}
	<button {...attrs}>{@render children?.()}</button>
{/if}
