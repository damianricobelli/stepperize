<script lang="ts">
import type { Attachment } from "svelte/attachments";
import { Stepper, flow, typed } from "./flow";
import Grab from "./Grab.svelte";

let {
	name,
	report,
	attached,
	off = {},
	ready,
	outer,
}: {
	name: string;
	report?: (refs: Record<string, Element | null>) => void;
	attached?: (part: string, node: Element) => void;
	off?: { trigger?: boolean; next?: boolean; prev?: boolean };
	ready?: (stepper: any) => void;
	outer?: (stepper: any) => void;
} = $props();

let root = $state<HTMLDivElement | null>(null);
let list = $state<HTMLOListElement | null>(null);
let item = $state<HTMLLIElement | null>(null);
let trigger = $state<HTMLButtonElement | null>(null);
let indicator = $state<HTMLSpanElement | null>(null);
let title = $state<HTMLSpanElement | null>(null);
let description = $state<HTMLSpanElement | null>(null);
let content = $state<HTMLDivElement | null>(null);
let prev = $state<HTMLButtonElement | null>(null);
let next = $state<HTMLButtonElement | null>(null);
let link = $state<HTMLButtonElement | null>(null);
$effect(() => {
	report?.({ root, list, item, trigger, indicator, title, description, content, prev, next, link });
});

const mark =
	(part: string): Attachment =>
	(node) =>
		attached?.(part, node);
const T = typed.Stepper;
</script>

{#if name === "refs"}
	<Stepper.Root bind:ref={root}>
		<Grab definition={flow} {ready} />
		<Stepper.List bind:ref={list}>
			<Stepper.Item step="first" bind:ref={item}>
				<Stepper.Trigger bind:ref={trigger}>
					<Stepper.Indicator bind:ref={indicator} />
					<Stepper.Title bind:ref={title} />
					<Stepper.Description bind:ref={description} />
				</Stepper.Trigger>
			</Stepper.Item>
		</Stepper.List>
		<Stepper.Content step="first" bind:ref={content}>One</Stepper.Content>
		<Stepper.Prev bind:ref={prev}>Back</Stepper.Prev>
		<Stepper.Next bind:ref={next}>Continue</Stepper.Next>
		<Stepper.Next bind:ref={link}>
			{#snippet child({ props })}
				<a href="#next" {...props}>Next</a>
			{/snippet}
		</Stepper.Next>
	</Stepper.Root>
{:else if name === "children"}
	<Stepper.Root>
		<Stepper.List>
			<Stepper.Item step="first">
				<Stepper.Trigger>
					<Stepper.Indicator>
						{#snippet child({ props })}<b {...props}>1</b>{/snippet}
					</Stepper.Indicator>
					<Stepper.Title>
						{#snippet child({ props })}<strong {...props}>First step</strong>{/snippet}
					</Stepper.Title>
					<Stepper.Description>
						{#snippet child({ props })}<em {...props}>Start here</em>{/snippet}
					</Stepper.Description>
				</Stepper.Trigger>
			</Stepper.Item>
		</Stepper.List>
		<Stepper.Content step="first" class="panel">
			{#snippet child({ props })}<section {...props}>Panel</section>{/snippet}
		</Stepper.Content>
	</Stepper.Root>
{:else if name === "disabled"}
	<Stepper.Root>
		{#snippet children(stepper)}
			<output>{stepper.current.id}</output>
			<Stepper.List>
				{#snippet item(step)}
					<Stepper.Item>
						<Stepper.Trigger disabled={step.id === "second" && off.trigger}><Stepper.Title /></Stepper.Trigger>
					</Stepper.Item>
				{/snippet}
			</Stepper.List>
			<Stepper.Prev disabled={off.prev}>Back</Stepper.Prev>
			<Stepper.Next disabled={off.next}>Continue</Stepper.Next>
		{/snippet}
	</Stepper.Root>
{:else if name === "attach"}
	<Stepper.Root {@attach mark("root")}>
		<Stepper.List>
			<Stepper.Item step="first">
				<Stepper.Trigger {@attach mark("trigger")}>First</Stepper.Trigger>
			</Stepper.Item>
		</Stepper.List>
		<Stepper.Content step="first" {@attach mark("content")}>One</Stepper.Content>
		<Stepper.Next {@attach mark("next")}>
			{#snippet child({ props })}
				<a href="#next" {...props}>Next</a>
			{/snippet}
		</Stepper.Next>
	</Stepper.Root>
{:else if name === "vertical"}
	<Stepper.Root orientation="vertical">
		{#snippet children(stepper)}
			<output>{stepper.current.id}</output>
			<Stepper.List>
				{#snippet item()}
					<Stepper.Item>
						<Stepper.Trigger><Stepper.Title /></Stepper.Trigger>
					</Stepper.Item>
				{/snippet}
			</Stepper.List>
		{/snippet}
	</Stepper.Root>
{:else if name === "nested"}
	<T.Root data-testid="outer">
		<T.List>
			{#snippet item()}
				<T.Item>
					<T.Trigger><T.Title /></T.Trigger>
				</T.Item>
			{/snippet}
		</T.List>
		<T.Content step="name">
			<Stepper.Root data-testid="inner">
				<!-- Each definition has its own context: the outer flow is still reachable here. -->
				<Grab definition={typed} ready={outer} />
				<Grab definition={flow} {ready} />
				<Stepper.List>
					{#snippet item()}
						<Stepper.Item>
							<Stepper.Trigger><Stepper.Title /></Stepper.Trigger>
						</Stepper.Item>
					{/snippet}
				</Stepper.List>
				<Stepper.Content step="first">Inner one</Stepper.Content>
				<Stepper.Content step="second">Inner two</Stepper.Content>
			</Stepper.Root>
		</T.Content>
		<T.Content step="done">Outer done</T.Content>
	</T.Root>
{:else if name === "inside-item"}
	<T.Root>
		<T.List>
			{#snippet item(step)}
				<T.Item>
					<T.Trigger><T.Title /></T.Trigger>
					{#if step.id === "name"}
						<!-- A linear stepper inside a tab of another one: none of the outer item, index or tablist applies. -->
						<Stepper.Root linear data-testid="inner">
							<Stepper.List>
								<Stepper.Item step="second">
									<Stepper.Indicator data-testid="inner-indicator" />
								</Stepper.Item>
							</Stepper.List>
						</Stepper.Root>
					{/if}
				</T.Item>
			{/snippet}
		</T.List>
	</T.Root>
{:else if name === "inner-index"}
	<T.Root>
		<T.List>
			{#snippet item()}
				<T.Item>
					<T.Trigger><T.Title /></T.Trigger>
					<Stepper.Root>
						<!-- Not the outer list's item snippet: it needs a `step`. -->
						<Stepper.Item />
					</Stepper.Root>
				</T.Item>
			{/snippet}
		</T.List>
	</T.Root>
{/if}
