<script lang="ts">
import { navAttrs, navBits, navIdle } from "@stepperize/core/primitives";
import { useShared } from "../flow.svelte.js";
import { useExtra, useScope } from "../scope.js";
import type { ButtonProps } from "../types.js";
import { useElement } from "./context.svelte.js";

let { children, child, disabled, onclick, ...rest }: ButtonProps = $props();

// `Next` validates the current step and moves on; on the last step it finishes the
// flow (`onFinish`) once. `Prev` goes back to the step you came from.
const direction = useExtra<"next" | "prev">();
const { flow, view } = useShared(useScope());
const attach = useElement(direction === "next" ? "Next" : "Prev", () => !!child);
const bits = $derived(navBits(view(), direction));
const attrs = $derived({
	...(child ? {} : { type: "button" as const }),
	...rest,
	...navAttrs(direction, bits, !!disabled),
	...attach,
	onclick: (event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => {
		onclick?.(event);
		// A rejecting `onFinish` rejects `next()`: the flow is not finished and the button works
		// again. The error belongs to `onFinish`, which reports it; nothing awaits this click.
		if (!event.defaultPrevented && !navIdle(bits)) flow[direction]().catch(() => {});
	},
});
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<button {...attrs}>{@render children?.()}</button>
{/if}
