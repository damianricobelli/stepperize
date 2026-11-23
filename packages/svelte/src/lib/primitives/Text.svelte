<script lang="ts">
import { useExtra } from "../scope.js";
import type { TextProps } from "../types.js";
import { findItem, useElement } from "./context.svelte.js";

let { children, child, ...rest }: TextProps = $props();

// `Title` and `Description`: a `span` showing the same-named field of the step, unless you pass children.
const field = useExtra<"title" | "description">();
const item = findItem();
const attach = useElement(field === "title" ? "Title" : "Description", () => !!child);
const fallback = $derived((item?.step as Record<string, unknown> | undefined)?.[field]);
const attrs = $derived({ "data-component": `stepper-${field}`, ...rest, ...attach });
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<span {...attrs}>{#if children}{@render children()}{:else}{fallback}{/if}</span>
{/if}
