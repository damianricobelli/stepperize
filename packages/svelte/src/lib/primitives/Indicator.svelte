<script lang="ts">
import { indicatorAttrs } from "@stepperize/core/primitives";
import type { ChildProps, TextProps } from "../types.js";
import { useElement, useItem } from "./context.svelte.js";

let { ref = $bindable(null), children, child, ...rest }: TextProps = $props();

// A decorative mark for the step: hidden from assistive technology, styled through `data-state`.
const item = useItem();
const attach = useElement<HTMLSpanElement>(
	"Indicator",
	(node) => (ref = node),
	() => !!child,
);
const attrs = $derived({ ...indicatorAttrs(item), ...rest, ...attach });
</script>

{#if child}
	{@render child({ props: attrs as ChildProps })}
{:else}
	<span {...attrs}>{@render children?.()}</span>
{/if}
