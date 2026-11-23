<script lang="ts">
import { indicatorAttrs } from "@stepperize/core/primitives";
import type { TextProps } from "../types";
import { useElement, useItem } from "./context.svelte";

let { children, child, ...rest }: TextProps = $props();

// A decorative mark for the step: hidden from assistive technology, styled through `data-state`.
const item = useItem();
const attach = useElement("Indicator", () => !!child);
const attrs = $derived({ ...indicatorAttrs(item), ...rest, ...attach });
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<span {...attrs}>{@render children?.()}</span>
{/if}
