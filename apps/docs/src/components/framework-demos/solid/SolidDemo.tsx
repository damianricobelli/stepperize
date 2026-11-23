/** @jsxImportSource solid-js */
import { createSignal, onCleanup, onMount } from "solid-js";
import { box, button, createFlow } from "../shared";

export default function SolidDemo() {
	const flow = createFlow();
	const [s, set] = createSignal(flow.get());
	onMount(() => onCleanup(flow.subscribe(() => set(() => flow.get()))));

	return (
		<div class={box} data-demo="solid">
			<strong>Solid</strong>
			<span data-step>
				{s().index + 1}/{s().steps.length}: {s().current.title}
			</span>
			<button
				type="button"
				class={button}
				disabled={s().isFirst}
				onClick={() => flow.prev()}
			>
				Prev
			</button>
			<button
				type="button"
				class={button}
				disabled={s().isLast}
				onClick={() => flow.next()}
			>
				Next
			</button>
		</div>
	);
}
