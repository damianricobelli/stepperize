<script lang="ts">
import Badge from "./Badge.svelte";
import Full from "./Full.svelte";
import { checked, flow, other, outer, Stepper } from "./flow";
import Grab from "./Grab.svelte";
import Owner from "./Owner.svelte";
import Show from "./Show.svelte";

let {
	name,
	options = {},
	ready,
	seen,
	show = false,
}: {
	name: string;
	options?: Record<string, any>;
	ready?: (stepper: any) => void;
	seen?: (id: string) => void;
	show?: boolean;
} = $props();
</script>

{#if name === "nested"}
	<outer.Stepper.Root data-testid="outer">
		<outer.Stepper.List>
			{#snippet item()}
				<outer.Stepper.Item>
					<outer.Stepper.Indicator />
				</outer.Stepper.Item>
			{/snippet}
		</outer.Stepper.List>
		<outer.Stepper.Content step="first">
			<!-- A nested stepper's triggers are not this one's. -->
			<Full />
		</outer.Stepper.Content>
	</outer.Stepper.Root>
{:else if name === "late"}
	<Stepper.Root>
		<Stepper.List>
			<Stepper.Item step="first">
				{#if show}<Stepper.Trigger>First</Stepper.Trigger>{/if}
			</Stepper.Item>
		</Stepper.List>
	</Stepper.Root>
{:else if name === "checked"}
	<checked.Stepper.Root>
		<Grab definition={checked} {ready} />
		<checked.Stepper.List>
			{#snippet item()}
				<checked.Stepper.Item>
					<checked.Stepper.Trigger>
						<checked.Stepper.Indicator />
						<checked.Stepper.Title />
					</checked.Stepper.Trigger>
				</checked.Stepper.Item>
			{/snippet}
		</checked.Stepper.List>
	</checked.Stepper.Root>
{:else if name === "badge"}
	<Stepper.Root linear>
		<Stepper.List>
			{#snippet item()}
				<Stepper.Item>
					{#snippet children(item)}
						<Badge />
						<i data-testid={`arg-${item.step.id}`}>{item.state}</i>
					{/snippet}
				</Stepper.Item>
			{/snippet}
		</Stepper.List>
	</Stepper.Root>
{:else if name === "force"}
	<Stepper.Root>
		<Stepper.Content step="first">One</Stepper.Content>
		<Stepper.Content step="second" forceMount>Two</Stepper.Content>
		<Stepper.Content step="third">Three</Stepper.Content>
	</Stepper.Root>
{:else if name === "prevent"}
	<Stepper.Root>
		{#snippet children(stepper)}
			<output>{stepper.current.id}</output>
			<Stepper.List onkeydown={(event) => event.preventDefault()}>
				{#snippet item()}
					<Stepper.Item>
						<Stepper.Trigger><Stepper.Title /></Stepper.Trigger>
					</Stepper.Item>
				{/snippet}
			</Stepper.List>
			<Stepper.Next onclick={(event) => event.preventDefault()}>Continue</Stepper.Next>
		{/snippet}
	</Stepper.Root>
{:else if name === "slot"}
	<Stepper.Root class="mine" data-extra="yes">
		{#snippet children(stepper)}
			<output>{stepper.current.id}</output>
			<Stepper.Next>Continue</Stepper.Next>
		{/snippet}
	</Stepper.Root>
{:else if name === "rtl"}
	<div dir="rtl"><Full /></div>
{:else if name === "focus"}
	<Stepper.Root>
		<Grab definition={flow} {ready} />
		<Stepper.Content step="first"><input aria-label="Name" /></Stepper.Content>
		<Stepper.Content step="second">Two</Stepper.Content>
	</Stepper.Root>
{:else if name === "outside"}
	<Stepper.Root>
		<Grab definition={flow} {ready} />
		<Stepper.Content step="second">Two</Stepper.Content>
	</Stepper.Root>
{:else if name === "child"}
	<Stepper.Root>
		{#snippet children(stepper)}
			<output>{stepper.current.id}</output>
			<Stepper.List>
				{#snippet child({ props })}
					<nav {...props}>
						<Stepper.Item step="first">
							{#snippet child({ props })}
								<div {...props}>
									<Stepper.Trigger>
										{#snippet child({ props })}
											<a href="#first" {...props}>First</a>
										{/snippet}
									</Stepper.Trigger>
								</div>
							{/snippet}
						</Stepper.Item>
					</nav>
				{/snippet}
			</Stepper.List>
			<Stepper.Next>
				{#snippet child({ props })}
					<button type="submit" class="mine" {...props}>Continue</button>
				{/snippet}
			</Stepper.Next>
		{/snippet}
	</Stepper.Root>
{:else if name === "sz001"}
	<Stepper.Root>
		<Stepper.List>
			{#snippet child()}
				<ol></ol>
			{/snippet}
		</Stepper.List>
	</Stepper.Root>
{:else if name === "sz002"}
	<Stepper.Root>
		<Stepper.Item step="first">
			{#snippet child({ props })}
				<div {...props}><Stepper.Trigger /></div>
			{/snippet}
		</Stepper.Item>
	</Stepper.Root>
{:else if name === "no-root"}
	<Stepper.Next>Continue</Stepper.Next>
{:else if name === "no-item"}
	<Stepper.Root><Stepper.Indicator /></Stepper.Root>
{:else if name === "unknown"}
	<Stepper.Root><Stepper.Item step={"nope" as "first"} /></Stepper.Root>
{:else if name === "unknown-content"}
	<Stepper.Root><Stepper.Content step={"secnod" as "first"}>Typo</Stepper.Content></Stepper.Root>
{:else if name === "provider"}
	<flow.Provider {...options}>
		<Show {seen} />
		<Grab definition={flow} {ready} />
	</flow.Provider>
{:else if name === "other-provider"}
	<other.Provider>
		<Grab definition={flow} {ready} />
	</other.Provider>
{:else if name === "pair"}
	<Full snapshot={{ step: "second", complete: ["first"] }} />
	<Full />
{:else if name === "server"}
	<Owner options={options.local} />
	<Stepper.Root {...options.root}>
		<Stepper.List>
			{#snippet item()}
				<Stepper.Item>
					<Stepper.Trigger><Stepper.Title /></Stepper.Trigger>
				</Stepper.Item>
			{/snippet}
		</Stepper.List>
		<Stepper.Content step="first">First form</Stepper.Content>
		<Stepper.Next>Continue</Stepper.Next>
	</Stepper.Root>
{/if}
