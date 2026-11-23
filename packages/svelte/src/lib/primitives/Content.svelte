<script lang="ts">
import { fail, type Step } from "@stepperize/core";
import { contentAttrs } from "@stepperize/core/primitives";
import { useShared } from "../flow.svelte.js";
import { useScope } from "../scope.js";
import type { ChildProps, ContentProps } from "../types.js";
import { useElement, useRoot } from "./context.svelte.js";

let {
	step: id,
	forceMount = false,
	ref = $bindable(null),
	children,
	child,
	...rest
}: ContentProps<readonly Step[]> = $props();

const scope = useScope();
const { ui } = useRoot();
const { view } = useShared(scope);
const step = $derived(scope.steps[scope.positions.get(id) ?? -1] ?? fail("SZ102", `Step "${id}" not found.`));
// Read through `step`, so an unknown id throws whether the panel is shown or not: it is never current.
const active = $derived(view().current.id === step.id);
// A hidden panel renders nothing, so there is no element to check.
const attach = useElement<HTMLDivElement>(
	"Content",
	(node) => (ref = node),
	() => !!child && (active || forceMount),
);
const attrs = $derived({ ...contentAttrs(ui, step, active), ...rest, ...attach });
</script>

{#if active || forceMount}
	{#if child}
		{@render child({ props: attrs as ChildProps })}
	{:else}
		<div {...attrs}>{@render children?.()}</div>
	{/if}
{/if}
