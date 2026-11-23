<script lang="ts">
import { navAttrs, navBits, navIdle, reportError } from "@stepperize/core/primitives";
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
	// Nothing awaits a click: a move that throws (a guard, a schema, a rejecting `onFinish`) is
	// reported like an error in any event listener. The flow is idle again, so the button works.
	if (!event.defaultPrevented && !navIdle(bits)) flow[direction]().catch(reportError);
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
