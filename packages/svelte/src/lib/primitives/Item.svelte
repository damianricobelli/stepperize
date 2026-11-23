<script lang="ts">
import { fail, type Step } from "@stepperize/core";
import { type ItemValue, itemAttrs, itemBits, itemValue } from "@stepperize/core/primitives";
import { useShared } from "../flow.svelte.js";
import { useScope } from "../scope.js";
import type { ItemProps } from "../types.js";
import { inTablist, setItem, useElement, useIndex } from "./context.svelte.js";

let { step: id, children, child, ...rest }: ItemProps<readonly Step[]> = $props();

const scope = useScope();
const { view } = useShared(scope);
const auto = useIndex();
const attach = useElement("Item", () => !!child);
const index = $derived(id === undefined ? auto : (scope.positions.get(id) ?? -1));
const step = $derived(
	scope.steps[index] ??
		fail(
			id === undefined ? "SZ101" : "SZ102",
			id === undefined
				? "Stepper.Item needs a `step` prop outside the `item` snippet of a Stepper.List."
				: `Step "${id}" not found.`,
		),
);
// One number per item, its trigger included: it only changes when what they show does.
const bits = $derived(itemBits(view(), step.id));
const value = $derived(itemValue(step, index, bits));
const item: ItemValue = {
	get step() {
		return value.step;
	},
	get index() {
		return value.index;
	},
	get state() {
		return value.state;
	},
	get invalid() {
		return value.invalid;
	},
	get disabled() {
		return value.disabled;
	},
	get pending() {
		return value.pending;
	},
};
setItem(item);
const attrs = $derived({ ...itemAttrs(value, inTablist()), ...rest, ...attach });
</script>

{#if child}
	{@render child({ props: attrs })}
{:else}
	<li {...attrs}>{@render children?.(item)}</li>
{/if}
