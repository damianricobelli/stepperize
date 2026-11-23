<script lang="ts">
import { Stepper, typed } from "../fixtures/flow";

// Each `error:` comment names an error `svelte-check` must report on the next line, and
// nothing else in this file may fail. `markup.test.ts` runs the check. TypeScript's own
// `@ts-expect-error` does not reach markup, hence the markers.
const Typed = typed.Stepper;
let span: HTMLSpanElement | null = $state(null);
let disabled = $state(false);
</script>

<Stepper.Root>
	<!-- error: not assignable to type '"first" | "second" | "third"' -->
	<Stepper.Content step="frist" />
	<!-- error: Type '"nope"' is not assignable -->
	<Stepper.Item step="nope" />
	<!-- error: is not assignable to type 'HTMLButtonElement | null | undefined' -->
	<Stepper.Next bind:ref={span} />
	<!-- error: non-bindable -->
	<Stepper.Prev bind:disabled />
	<Stepper.Next>
		{#snippet child({ props })}
			<!-- error: not assignable to parameter of type 'MouseEvent -->
			<button type="button" onclick={() => props.onclick("click")}>Next</button>
		{/snippet}
	</Stepper.Next>
</Stepper.Root>

<Typed.Root
	onFinish={(output) => {
		// error: Type 'number | undefined' is not assignable to type 'string | undefined'
		const name: string | undefined = output.name;
		return name;
	}}
>
	{#snippet children(stepper)}
		<!-- error: not assignable to parameter of type 'string' -->
		<button type="button" onclick={() => stepper.setData("name", 7)}>Save</button>
		<!-- error: Property 'done' is missing in type '{ name: () => number; }' -->
		{stepper.match({ name: () => 1 })}
		<Typed.List>
			{#snippet item(step)}
				<!-- error: Property 'icon' does not exist -->
				{step.icon}
				<Typed.Item>
					{#snippet children(item)}
						<!-- error: no overlap -->
						{item.step.id === "first"}
					{/snippet}
				</Typed.Item>
			{/snippet}
		</Typed.List>
	{/snippet}
</Typed.Root>
