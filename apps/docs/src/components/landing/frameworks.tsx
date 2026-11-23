"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CORE_FRAMEWORK, DEFAULT_FRAMEWORK } from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { Highlighted, tokenize } from "./code";
import {
	CHOICES,
	choiceOf,
	docPath,
	setFramework,
	useFramework,
} from "./framework-choice";
import { CodeFrame, Section, SectionHeading } from "./shared";

/**
 * The hero's framework row, and the one choice the rest of the page follows:
 * the playground's code, the install command, the frameworks section and the
 * "Get started" links. React is pressed until the visitor picks another.
 */
export function FrameworkPicker({
	className,
	style,
}: {
	className?: string;
	style?: CSSProperties;
}) {
	const framework = useFramework();
	return (
		<ToggleGroup
			aria-label="Your framework: the code and links on this page follow it"
			value={[framework]}
			onValueChange={(value) => {
				// Pressing the chosen one again would leave nothing chosen: keep it.
				if (value[0]) setFramework(value[0]);
			}}
			spacing={1}
			className={cn("flex-wrap justify-center", className)}
			style={style}
		>
			{CHOICES.map((entry) => (
				<ToggleGroupItem
					key={entry.id}
					value={entry.id}
					className="pressable h-9 gap-1.5 rounded-full border border-transparent px-3 text-sm font-normal text-muted-foreground transition-[transform,background-color,border-color,color,box-shadow] pointer-coarse:h-11 hover:bg-transparent hover:text-foreground aria-pressed:border-border aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-[15px]"
				>
					<FrameworkIcon id={entry.id} />
					{entry.title}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

/* ───────────────────────────── the code shown ───────────────────────── */

const steps = `[
  { id: "shipping", title: "Shipping" },
  { id: "payment", title: "Payment" },
  { id: "review", title: "Review" },
]`;

/** The definition is the same file everywhere: only the package changes. */
const definition = (pkg: string) =>
	`import { defineStepper } from "${pkg}";

export const checkout = defineStepper(${steps});`;

/**
 * How each framework reads and moves the flow, from its "first stepper" guide.
 * A framework without an entry is still listed, as a link to its docs.
 */
const USAGE: Record<
	string,
	{
		file: string;
		code: string;
		note: string;
		/** Shown in place of the shared definition, for the ones that have none. */
		first?: { file: string; code: string; label: string };
	}
> = {
	react: {
		file: "Checkout.tsx",
		note: "A hook. The component re-renders when the flow changes.",
		code: `function Checkout() {
  const stepper = checkout.useStepper();

  return (
    <section>
      <h2>{stepper.current.title}</h2>
      <button onClick={() => stepper.next()}>Continue</button>
    </section>
  );
}`,
	},
	vue: {
		file: "Checkout.vue",
		note: "A composable. The template follows the flow.",
		code: `<script setup lang="ts">
import { checkout } from "./checkout";

const stepper = checkout.useStepper();
</script>

<template>
  <section>
    <h2>{{ stepper.current.title }}</h2>
    <button @click="stepper.next()">Continue</button>
  </section>
</template>`,
	},
	svelte: {
		file: "Checkout.svelte",
		note: "Reactive state. The markup follows the flow.",
		code: `<script lang="ts">
  import { checkout } from "./checkout";

  const stepper = checkout.useStepper();
</script>

<section>
  <h2>{stepper.current.title}</h2>
  <button onclick={() => stepper.next()}>Continue</button>
</section>`,
	},
	solid: {
		file: "Checkout.tsx",
		note: "A reactive object. Only what reads the flow updates.",
		code: `function Checkout() {
  const stepper = checkout.useStepper();

  return (
    <section>
      <h2>{stepper.current.title}</h2>
      <button onClick={() => stepper.next()}>Continue</button>
    </section>
  );
}`,
	},
	angular: {
		file: "checkout.component.ts",
		note: "A signal. The template follows the flow.",
		code: `@Component({
  selector: "app-checkout",
  template: \`
    <h2>{{ stepper().current.title }}</h2>
    <button (click)="stepper().next()">Continue</button>
  \`,
})
export class Checkout {
  readonly stepper = checkout.injectStepper();
}`,
	},
	lit: {
		file: "checkout-steps.ts",
		note: "A reactive controller. The element updates when the flow changes.",
		code: `export class CheckoutSteps extends LitElement {
  stepper = checkout.controller(this);

  render() {
    const stepper = this.stepper.value;

    return html\`
      <h2>\${stepper.current.title}</h2>
      <button @click=\${() => stepper.next()}>Continue</button>
    \`;
  }
}`,
	},
	html: {
		file: "checkout.ts",
		note: "No framework. One call binds a flow to markup your server already rendered.",
		first: {
			file: "checkout.html",
			label: "Your markup, as it is",
			code: `<div data-component="stepper" id="checkout">
  <div data-component="stepper-content" data-step="shipping">
    …
  </div>
  <div data-component="stepper-content" data-step="payment">
    …
  </div>

  <button data-component="stepper-prev">Back</button>
  <button data-component="stepper-next">Continue</button>
</div>`,
		},
		code: `import { createStepper } from "@stepperize/core";
import { bindStepper } from "@stepperize/core/dom";

const flow = createStepper([
  { id: "shipping", title: "Shipping" },
  { id: "payment", title: "Payment" },
]);

bindStepper(document.getElementById("checkout"), flow);`,
	},
	core: {
		file: "checkout.ts",
		note: "A plain object. Subscribe from anything that runs JavaScript.",
		code: `import { createStepper } from "@stepperize/core";

const flow = createStepper(${steps});

flow.subscribe(() => render(flow.current.title));
await flow.next();`,
	},
};

// Static: every snippet tokenized once at module load, never per render.
const TOKENIZED = Object.fromEntries(
	Object.entries(USAGE).map(([id, usage]) => [
		id,
		{
			code: tokenize(usage.code),
			first: usage.first && tokenize(usage.first.code),
		},
	]),
);
const DEFINITIONS = Object.fromEntries(
	CHOICES.map((entry) => [entry.id, tokenize(definition(entry.package))]),
);

function Snippet({ lines }: { lines: ReturnType<typeof tokenize> }) {
	// One height for every framework: choosing one never moves the page below it.
	return (
		<pre className="min-h-[17.5rem] overflow-x-auto overscroll-x-contain p-4 font-mono text-[12.5px] leading-relaxed sm:p-5 sm:text-[13px]">
			<code>
				<Highlighted lines={lines} />
			</code>
		</pre>
	);
}

/** What every binding gets from the core, whichever one you pick. */
const SHARED = [
	"Typed step ids",
	"Validation in next()",
	"Branching",
	"Snapshots to save and resume",
	"Accessible primitives",
];

/**
 * What only the main binding has today, and why: the blocks and the Studio
 * are shadcn/ui components, and shadcn/ui is React.
 */
const MAIN_EXTRAS = [
	"Blocks: shadcn/ui components, copied in with the shadcn CLI",
	"Stepper Studio, which writes React and shadcn/ui code",
	"Guides for React Hook Form, TanStack Form and Conform",
];

/**
 * "Does it fit my stack?" Answered by showing it: the definition is the same
 * file in every framework, and the component next to it is the few lines that
 * differ. It opens on the visitor's framework, React until they pick one, and
 * picking a tab here changes it for the whole page.
 */
export function Frameworks() {
	const framework = useFramework();
	const current = choiceOf(framework);
	const usage = USAGE[current.id];
	const isCore = current.id === CORE_FRAMEWORK;
	const isMain = current.id === DEFAULT_FRAMEWORK;
	const tokens = TOKENIZED[current.id];
	// The definition, or what this one has in its place. The core has neither.
	const first = usage.first
		? {
				file: usage.first.file,
				label: usage.first.label,
				lines: tokens.first ?? [],
			}
		: isCore
			? undefined
			: {
					file: "checkout.ts",
					label: "Same in every framework",
					lines: DEFINITIONS[current.id],
				};

	return (
		<Section id="frameworks" className="border-t">
			<SectionHeading
				eyebrow="One engine, your framework"
				title="React first. Not React only."
			>
				You define the flow once, in plain TypeScript. Each framework then reads
				it the way that framework reads anything else. Pick yours: the
				definition does not change.
			</SectionHeading>

			<Tabs
				value={current.id}
				onValueChange={(value) => setFramework(String(value))}
				className="mt-10 gap-4 sm:mt-12"
			>
				<TabsList
					variant="line"
					aria-label="Framework"
					className="-mx-4 h-auto w-auto snap-x scroll-px-4 justify-start gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] group-data-horizontal/tabs:h-auto sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
				>
					{CHOICES.map((entry) => (
						<TabsTrigger
							key={entry.id}
							value={entry.id}
							onClick={(event) => {
								// On phones the tabs are a strip that scrolls: bring a
								// half-visible one fully into view once chosen.
								event.currentTarget.scrollIntoView({
									block: "nearest",
									inline: "nearest",
									behavior: window.matchMedia(
										"(prefers-reduced-motion: reduce)",
									).matches
										? "auto"
										: "smooth",
								});
							}}
							className="pressable hit-44 h-10 flex-none shrink-0 snap-start gap-2 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-[transform,background-color,border-color,color,box-shadow] after:hidden hover:border-foreground/15 hover:bg-card/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:border-primary/40 data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:shadow-primary/5 dark:data-active:border-primary/40 dark:data-active:bg-card group-data-[variant=line]/tabs-list:data-active:bg-card dark:group-data-[variant=line]/tabs-list:data-active:border-primary/40 dark:group-data-[variant=line]/tabs-list:data-active:bg-card"
						>
							<FrameworkIcon id={entry.id} />
							{entry.title}
							{entry.id === DEFAULT_FRAMEWORK && (
								<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] leading-none font-medium text-primary">
									Main
								</span>
							)}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value={current.id} className="grid gap-4 lg:grid-cols-2">
					{first && (
						<CodeFrame
							filename={first.file}
							aside={
								<span className="text-xs text-muted-foreground">
									{first.label}
								</span>
							}
						>
							<Snippet lines={first.lines} />
						</CodeFrame>
					)}
					<CodeFrame
						filename={usage.file}
						className={cn(!first && "lg:col-span-2")}
					>
						<Snippet lines={tokens.code} />
					</CodeFrame>
				</TabsContent>
			</Tabs>

			<div className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-10">
				<div className="flex flex-col">
					<h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
						<FrameworkIcon id={current.id} className="size-5" />
						{current.title}
					</h3>
					<p className="mt-1 font-mono text-xs text-muted-foreground">
						{current.package}
					</p>
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
						{usage.note}
					</p>
					<Link
						to="/docs/$"
						params={{ _splat: docPath(current.id, "intro") }}
						className="group hit-44 mt-4 inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring lg:mt-auto lg:pt-4"
					>
						{current.title} docs
						<ArrowRight
							aria-hidden
							className="size-3.5 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5"
						/>
					</Link>
				</div>

				<div className="grid gap-5 sm:grid-cols-2">
					<Checklist
						title="In every framework"
						items={isCore ? SHARED.slice(0, -1) : SHARED}
					/>
					<div>
						<Checklist
							title="Only in React, for now"
							items={MAIN_EXTRAS}
							muted={!isMain}
						/>
						<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
							shadcn/ui is a React component library, so the blocks and the
							Studio are React. Everything else on this page works in{" "}
							{isMain ? "every framework" : current.title}.
						</p>
					</div>
				</div>
			</div>
		</Section>
	);
}

function Checklist({
	title,
	items,
	muted,
}: {
	title: string;
	items: string[];
	/** Listed for honesty, but not part of the framework being shown. */
	muted?: boolean;
}) {
	return (
		<div>
			<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{title}
			</p>
			<ul
				className={cn(
					"mt-3 flex flex-col gap-2 text-sm",
					muted && "text-muted-foreground",
				)}
			>
				{items.map((item) => (
					<li key={item} className="flex items-start gap-2">
						<Check
							aria-hidden
							className={cn(
								"mt-0.5 size-4 shrink-0",
								muted ? "text-muted-foreground/50" : "text-primary",
							)}
						/>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}
