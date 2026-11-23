"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import type { DocsFramework } from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { Highlighted, tokenize } from "./code";
import { useFramework } from "./framework-choice";
import { CodeFrame, Section, SectionHeading } from "./shared";

const MODES = {
	without: {
		label: "Without",
		points: [
			"An index to keep in sync with the steps",
			"Clamping by hand on every move",
			"Stringly-typed checks: a typo still compiles",
			"Validation gating wired by hand, per step",
		],
	},
	with: {
		label: "With Stepperize",
		points: [
			"No index: the flow knows where it is",
			"next() and prev() clamp and guard for you",
			"Step ids are a typed union: typos fail to compile",
			"One guard decides whether any move happens",
		],
	},
} as const;

type Mode = keyof typeof MODES;

/**
 * The "why this library exists" section: the manual way every team writes the
 * first time, against the Stepperize version. One frame with a toggle instead
 * of two side-by-side columns, so the comparison is a single glance on a
 * phone too. Both versions share one grid cell, so the frame never jumps in
 * height when switching.
 */
export function BeforeAfter() {
	const [mode, setMode] = useState<Mode>("without");
	const variant = variantOf(useFramework());

	return (
		<Section className="border-y bg-muted/30">
			<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
				<div>
					<SectionHeading
						eyebrow="Why Stepperize"
						title="Stop hand-rolling step state."
					>
						Every multi-step flow starts with an index, a switch, and clamping
						logic, then quietly rots as steps and rules pile up. Stepperize
						replaces all of it with one typed instance.
					</SectionHeading>

					<fieldset className="relative mt-8 grid w-full grid-cols-2 rounded-xl border bg-card p-1 shadow-xs sm:inline-grid sm:w-auto">
						<legend className="sr-only">Compare code</legend>
						<span
							aria-hidden
							className={cn(
								"absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg transition-[transform,background-color] duration-200 ease-out-strong",
								mode === "with"
									? "translate-x-full bg-primary"
									: "translate-x-0 bg-foreground",
							)}
						/>
						{(Object.keys(MODES) as Mode[]).map((m) => (
							<button
								key={m}
								type="button"
								aria-pressed={mode === m}
								onClick={() => setMode(m)}
								className={cn(
									"pressable relative h-9 rounded-lg px-4 text-sm font-medium whitespace-nowrap pointer-coarse:h-10 outline-none focus-visible:ring-2 focus-visible:ring-ring",
									mode !== m && "text-muted-foreground hover:text-foreground",
									mode === m &&
										(m === "with"
											? "text-primary-foreground"
											: "text-background"),
								)}
							>
								{MODES[m].label}
							</button>
						))}
					</fieldset>

					<div className="mt-6 grid">
						{(Object.keys(MODES) as Mode[]).map((m) => (
							<ul
								key={m}
								aria-hidden={mode !== m}
								className={cn(
									"col-start-1 row-start-1 space-y-2.5 text-[15px] transition-opacity duration-200 ease-out-strong",
									mode === m ? "opacity-100" : "pointer-events-none opacity-0",
								)}
							>
								{MODES[m].points.map((point) => (
									<li key={point} className="flex items-start gap-3">
										<span
											className={cn(
												"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
												m === "with"
													? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
													: "bg-red-500/10 text-red-600 dark:text-red-400",
											)}
										>
											{m === "with" ? (
												<Check className="size-3" strokeWidth={3} aria-hidden />
											) : (
												<X className="size-3" strokeWidth={3} aria-hidden />
											)}
										</span>
										<span className="text-muted-foreground">{point}</span>
									</li>
								))}
							</ul>
						))}
					</div>
				</div>

				<CodeFrame
					filename={CODE[variant].file}
					aside={
						<span
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors duration-200",
								mode === "with"
									? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
									: "bg-red-500/10 text-red-600 dark:text-red-300",
							)}
						>
							{mode === "with" ? "Compiles. Correct." : "Compiles. Broken."}
						</span>
					}
				>
					<div className="grid overflow-x-auto overscroll-x-contain">
						{(Object.keys(MODES) as Mode[]).map((m) => (
							<pre
								key={m}
								aria-hidden={mode !== m}
								className={cn(
									"col-start-1 row-start-1 p-4 font-mono text-[11.5px] leading-[1.75] transition-opacity sm:p-6 sm:text-[12.5px] duration-200 ease-out-strong",
									mode === m ? "opacity-100" : "pointer-events-none opacity-0",
								)}
							>
								<code>
									<Highlighted lines={TOKENIZED[variant][m]} />
								</code>
							</pre>
						))}
					</div>
				</CodeFrame>
			</div>
		</Section>
	);
}

/* ─────────────────────── the code, per framework ─────────────────────── */

const IDS = `{ id: "shipping" },
{ id: "payment" },
{ id: "review" },`;

const indent = (code: string, spaces: number) =>
	code.replace(/^/gm, " ".repeat(spaces));

/**
 * The hand-rolled version every team writes first, next to the Stepperize
 * version, in each framework's own idiom. The type checker that catches the
 * typo is the framework's own: tsc, vue-tsc, svelte-check, Angular's strict
 * templates. HTML has no types, so it shows the TypeScript core it runs on.
 */
const CODE: Record<
	"react" | "vue" | "svelte" | "solid" | "angular" | "lit" | "core",
	{ file: string; without: string; with: string }
> = {
	react: {
		file: "checkout.tsx",
		without: `const steps = ["shipping", "payment", "review"];
const [step, setStep] = useState(0);

// clamp by hand, every time
const next = () =>
  setStep((s) => Math.min(s + 1, steps.length - 1));

// stringly-typed: a typo still compiles
switch (steps[step]) {
  case "shiping": return <Shipping />; // 💥
  case "payment": return <Payment />;
  // forgot review? no warning.
}`,
		with: `const checkout = defineStepper([
${indent(IDS, 2)}
]);

const stepper = checkout.useStepper();

// clamped and guarded for you
const onNext = () => stepper.next();

// exhaustive: a typo is a compile error
return stepper.match({
  shipping: () => <Shipping />,
  payment: () => <Payment />,
  review: () => <Review />,
});`,
	},
	vue: {
		file: "Checkout.vue",
		without: `<script setup lang="ts">
const steps = ["shipping", "payment", "review"];
const step = ref(0);

// clamp by hand, every time
const next = () =>
  (step.value = Math.min(step.value + 1, steps.length - 1));
</script>

<template>
  <!-- stringly-typed: a typo still compiles 💥 -->
  <Shipping v-if="steps[step] === 'shiping'" />
  <Payment v-else-if="steps[step] === 'payment'" />
  <!-- forgot review? no warning. -->
</template>`,
		with: `<script setup lang="ts">
const checkout = defineStepper([
${indent(IDS, 2)}
]);
const stepper = checkout.useStepper();
</script>

<template>
  <!-- typed ids: 'shiping' fails vue-tsc -->
  <Shipping v-if="stepper.current.id === 'shipping'" />
  <Payment v-else-if="stepper.current.id === 'payment'" />
  <Review v-else />
  <!-- clamped and guarded for you -->
  <button @click="stepper.next()">Continue</button>
</template>`,
	},
	svelte: {
		file: "Checkout.svelte",
		without: `<script lang="ts">
  const steps = ["shipping", "payment", "review"];
  let step = $state(0);

  // clamp by hand, every time
  const next = () => (step = Math.min(step + 1, steps.length - 1));
</script>

<!-- stringly-typed: a typo still compiles 💥 -->
{#if steps[step] === "shiping"}
  <Shipping />
{:else if steps[step] === "payment"}
  <Payment />
{/if}
<!-- forgot review? no warning. -->`,
		with: `<script lang="ts">
  const checkout = defineStepper([
${indent(IDS, 4)}
  ]);
  const stepper = checkout.useStepper();
</script>

<!-- typed ids: "shiping" fails svelte-check -->
{#if stepper.current.id === "shipping"}
  <Shipping />
{:else if stepper.current.id === "payment"}
  <Payment />
{:else}
  <Review />
{/if}
<!-- clamped and guarded for you -->
<button onclick={() => stepper.next()}>Continue</button>`,
	},
	solid: {
		file: "Checkout.tsx",
		without: `const steps = ["shipping", "payment", "review"];
const [step, setStep] = createSignal(0);

// clamp by hand, every time
const next = () =>
  setStep((s) => Math.min(s + 1, steps.length - 1));

// stringly-typed: a typo still compiles
<Switch>
  <Match when={steps[step()] === "shiping"}><Shipping /></Match>
  <Match when={steps[step()] === "payment"}><Payment /></Match>
  {/* forgot review? no warning. */}
</Switch>`,
		with: `const checkout = defineStepper([
${indent(IDS, 2)}
]);

const stepper = checkout.useStepper();

// typed ids: "shiping" is a compile error
<Switch>
  <Match when={stepper.current.id === "shipping"}><Shipping /></Match>
  <Match when={stepper.current.id === "payment"}><Payment /></Match>
  <Match when={stepper.current.id === "review"}><Review /></Match>
</Switch>

// clamped and guarded for you
<button onClick={() => stepper.next()}>Continue</button>`,
	},
	angular: {
		file: "checkout.component.ts",
		without: `steps = ["shipping", "payment", "review"];
step = signal(0);

// clamp by hand, every time
next() {
  this.step.update((s) => Math.min(s + 1, this.steps.length - 1));
}

// stringly-typed: a typo still compiles
template: \`
  @switch (steps[step()]) {
    @case ("shiping") { <app-shipping /> } 💥
    @case ("payment") { <app-payment /> }
  }
\``,
		with: `const checkout = defineStepper([
${indent(IDS, 2)}
]);

readonly stepper = checkout.injectStepper();

// typed ids: "shiping" fails strict templates
template: \`
  @switch (stepper().current.id) {
    @case ("shipping") { <app-shipping /> }
    @case ("payment") { <app-payment /> }
    @case ("review") { <app-review /> }
  }
  <button (click)="stepper().next()">Continue</button>
\``,
	},
	lit: {
		file: "checkout-flow.ts",
		without: `steps = ["shipping", "payment", "review"];
@state() step = 0;

// clamp by hand, every time
next() {
  this.step = Math.min(this.step + 1, this.steps.length - 1);
}

render() {
  // stringly-typed: a typo still compiles
  switch (this.steps[this.step]) {
    case "shiping": return html\`<shipping-step></shipping-step>\`; // 💥
    case "payment": return html\`<payment-step></payment-step>\`;
    // forgot review? no warning.
  }
}`,
		with: `const checkout = defineStepper([
${indent(IDS, 2)}
]);

stepper = checkout.controller(this);

render() {
  // exhaustive: a typo is a compile error
  return this.stepper.value.match({
    shipping: () => html\`<shipping-step></shipping-step>\`,
    payment: () => html\`<payment-step></payment-step>\`,
    review: () => html\`<review-step></review-step>\`,
  });
}
// clamped and guarded: this.stepper.value.next()`,
	},
	core: {
		file: "checkout.ts",
		without: `const steps = ["shipping", "payment", "review"];
let step = 0;

// clamp by hand, every time
function next() {
  step = Math.min(step + 1, steps.length - 1);
}

// stringly-typed: a typo still compiles
switch (steps[step]) {
  case "shiping": return showShipping(); // 💥
  case "payment": return showPayment();
  // forgot review? no warning.
}`,
		with: `const flow = createStepper([
${indent(IDS, 2)}
]);

// clamped and guarded for you
await flow.next();

// exhaustive: a typo is a compile error
flow.match({
  shipping: () => showShipping(),
  payment: () => showPayment(),
  review: () => showReview(),
});`,
	},
};

// Static: tokenized once at module load, never per render.
const TOKENIZED = Object.fromEntries(
	Object.entries(CODE).map(([id, code]) => [
		id,
		{ without: tokenize(code.without), with: tokenize(code.with) },
	]),
) as Record<keyof typeof CODE, Record<Mode, ReturnType<typeof tokenize>>>;

const variantOf = (framework: DocsFramework): keyof typeof CODE =>
	framework === "html" ? "core" : framework;
