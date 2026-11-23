<script lang="ts">
import { fail, type Step } from "@stepperize/core";
import { contentAttrs } from "@stepperize/core/primitives";
import { useShared } from "../flow.svelte";
import { useScope } from "../scope";
import type { ContentProps } from "../types";
import { useElement, useRoot } from "./context.svelte";

let { step: id, forceMount = false, children, child, ...rest }: ContentProps<readonly Step[]> = $props();

const scope = useScope();
const { ui } = useRoot();
const { view } = useShared(scope);
const active = $derived(view().current.id === id);
// A hidden panel renders nothing, so there is no element to check.
const attach = useElement("Content", () => !!child && (active || forceMount));
const step = $derived(scope.steps[scope.positions.get(id) ?? -1] ?? fail("SZ102", `Step "${id}" not found.`));
const attrs = $derived({ ...contentAttrs(ui, step, active), ...rest, ...attach });
</script>

{#if active || forceMount}
	{#if child}
		{@render child({ props: attrs })}
	{:else}
		<div {...attrs}>{@render children?.()}</div>
	{/if}
{/if}
