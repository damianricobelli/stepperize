<script lang="ts">
import type { MouseEventHandler } from "svelte/elements";
import { Stepper, typed } from "./flow";

// Never rendered: `svelte-check` reads it to prove markup is typed with the step ids.
// `markup/Wrong.svelte` holds the same shapes with mistakes, which must not compile.
const Typed = typed.Stepper;

// `bind:ref` is typed with the element each primitive renders.
let root: HTMLDivElement | null = $state(null);
let list: HTMLOListElement | null = $state(null);
let entry: HTMLLIElement | null = $state(null);
let trigger: HTMLButtonElement | null = $state(null);
let title: HTMLSpanElement | null = $state(null);
let panel: HTMLDivElement | null = $state(null);
let next: HTMLButtonElement | null = $state(null);

const click: MouseEventHandler<HTMLElement> = () => {};
</script>

<Stepper.Root linear onFinish={(output) => output.first} bind:ref={root}>
	{#snippet children(stepper)}
		{stepper.current.title}
		<Stepper.List orientation="vertical" bind:ref={list}>
			{#snippet item(step, index)}
				<Stepper.Item bind:ref={entry}>{index} {step.description}</Stepper.Item>
			{/snippet}
		</Stepper.List>
		<Stepper.Content step="first" forceMount class="panel" bind:ref={panel} />
		<Stepper.Next bind:ref={next}>
			<!-- The props of a `child` snippet are typed: its handlers can be called and wrapped. -->
			{#snippet child({ props })}
				<a href="#next" {...props} onclick={(event) => (props.onclick(event), click(event))}>Next</a>
			{/snippet}
		</Stepper.Next>
	{/snippet}
</Stepper.Root>

<!-- A schema types the data that goes in and the output that comes out, in markup too. -->
<Typed.Root
	onFinish={(output, data) => {
		const length: number | undefined = output.name;
		const draft: string | undefined = data.name;
		return [length, draft];
	}}
	onChange={(snapshot) => snapshot.step satisfies "name" | "done"}
	step="name"
>
	{#snippet children(stepper)}
		<button type="button" onclick={() => stepper.setData("name", "Ada")}>Save</button>
		<button type="button" onclick={() => stepper.next("Ada")}>{stepper.output.name?.toFixed()}</button>
		{stepper.match({ name: (step, data) => `${step.title}${data?.toUpperCase()}`, done: (step) => step.icon })}
		<Typed.List>
			{#snippet item(step)}
				<Typed.Item>
					{#snippet children(item)}
						<Typed.Trigger bind:ref={trigger}>{item.step.title} {step.id}</Typed.Trigger>
						<Typed.Title bind:ref={title} />
					{/snippet}
				</Typed.Item>
			{/snippet}
		</Typed.List>
		<Typed.Item step="done" />
		<Typed.Content step="done" />
	{/snippet}
</Typed.Root>
