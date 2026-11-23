<script lang="ts">
import type { Step } from "@stepperize/core";
import { focusInside, HIDDEN, rootAttrs, statusBits, stepChanged, type Ui } from "@stepperize/core/primitives";
import { untrack } from "svelte";
import { defined, share, useFlow } from "../flow.svelte.js";
import { useScope } from "../scope.js";
import type { RootProps } from "../types.js";
import { isolate, setRoot } from "./context.svelte.js";

let {
	linear,
	next,
	guard,
	onChange,
	onFinish,
	snapshot,
	step,
	onInvalidStep,
	orientation = "horizontal",
	ref = $bindable(null),
	children,
	...rest
}: RootProps<readonly Step[]> = $props();

const scope = useScope();
// The same on the server and the client. The dash keeps one Root's prefix from starting another's.
const uid = $props.id();
const id = `${uid}-`;
const shared = useFlow(scope, () =>
	defined({ linear, next, guard, onChange, onFinish, snapshot, step, onInvalidStep }),
);
share(scope, shared);

// Tabs need triggers. Assume them (server HTML and the usual layout never change),
// then count the ones that actually mounted.
let triggers = $state(0);
let mounted = $state(false);
$effect(() => {
	mounted = true;
});
const ui: Ui = {
	id,
	get orientation() {
		return orientation;
	},
	get tabs() {
		return !(linear ?? scope.defaults.linear) && (!mounted || triggers > 0);
	},
};
isolate();
setRoot({
	ui,
	register: () => {
		triggers++;
		return () => {
			triggers--;
		};
	},
});

const status = $derived(statusBits(shared.view()));
const index = $derived(shared.view().index);
let region = $state<HTMLSpanElement>();
// Read before Svelte touches the DOM: was focus in this stepper?
let inside = false;
let previous = untrack(() => index);
$effect.pre(() => {
	void index;
	inside = focusInside(ref);
});
$effect(() => {
	if (index === previous) return;
	previous = index;
	untrack(() => stepChanged(ref, region, shared.flow.current, ui, inside));
});
</script>

<div {...rootAttrs(orientation, status)} {...rest} bind:this={ref}>
	{@render children?.(shared.stepper)}
	<span bind:this={region} aria-live="polite" style={HIDDEN}></span>
</div>
