"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";
import {
	BINDINGS,
	CORE_FRAMEWORK,
	DEFAULT_FRAMEWORK,
	FRAMEWORKS,
} from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { C, CodeFrame, K, S, Section, SectionHeading } from "./shared";

const MAIN = BINDINGS.find((entry) => entry.id === DEFAULT_FRAMEWORK);
const OTHERS = BINDINGS.filter((entry) => entry.id !== DEFAULT_FRAMEWORK);
const CORE = FRAMEWORKS.find((entry) => entry.id === CORE_FRAMEWORK);

const docs = (framework: string) => `${CURRENT_DOCS_VERSION}/${framework}`;
const name = (entry: { id: string; title: string }) =>
	entry.id === CORE_FRAMEWORK ? "No framework" : entry.title;

/**
 * One line under the headline: React leads, and the same engine runs in the
 * other frameworks. Each name opens that framework's documentation.
 */
export function FrameworkStrip({
	className,
	style,
}: {
	className?: string;
	style?: CSSProperties;
}) {
	if (!MAIN) return null;
	return (
		<ul
			aria-label="Frameworks"
			className={cn(
				"flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:text-[15px]",
				className,
			)}
			style={style}
		>
			{[MAIN, ...OTHERS, ...(CORE ? [CORE] : [])].map((entry) => (
				<li key={entry.id}>
					<Link
						to="/docs/$"
						params={{ _splat: docs(entry.id) }}
						className={cn(
							"pressable hit-44 inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
							entry.id === MAIN.id && "font-medium text-foreground",
						)}
					>
						<FrameworkIcon id={entry.id} />
						{name(entry)}
					</Link>
				</li>
			))}
		</ul>
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
const USAGE: Record<string, { file: string; code: string; note: string }> = {
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
	core: {
		file: "checkout.ts",
		note: "A plain object. Subscribe from anything that runs JavaScript.",
		code: `import { createStepper } from "@stepperize/core";

const flow = createStepper(${steps});

flow.subscribe(() => render(flow.current.title));
await flow.next();`,
	},
};

const TOKEN =
	/(\/\/.*$|"[^"\n]*"|\b(?:import|from|export|const|function|return|await)\b)/gm;

/** Enough highlighting to read a short snippet: comments, strings, keywords. */
function highlight(code: string): ReactNode[] {
	return code.split(TOKEN).map((part, index) => {
		const key = `${index}:${part}`;
		if (index % 2 === 0) return part;
		if (part.startsWith("//")) return <C key={key}>{part}</C>;
		if (part.startsWith('"')) return <S key={key}>{part}</S>;
		return <K key={key}>{part}</K>;
	});
}

function Snippet({ code }: { code: string }) {
	// One height for every framework: choosing one never moves the page below it.
	return (
		<pre className="min-h-[17.5rem] overflow-x-auto overscroll-x-contain p-4 font-mono text-[12.5px] leading-relaxed sm:p-5 sm:text-[13px]">
			<code>{highlight(code)}</code>
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

/** What only the main binding has today. */
const MAIN_EXTRAS = [
	"Copy-and-paste blocks",
	"Stepper Studio",
	"Guides for React Hook Form, TanStack Form and Conform",
];

/**
 * "Does it fit my stack?" Answered by showing it: the definition is the same
 * file in every framework, and the component next to it is the few lines that
 * differ. React is selected first and marked as the main binding.
 */
export function Frameworks() {
	const tabs = [MAIN, ...OTHERS, CORE].filter(
		(entry): entry is NonNullable<typeof entry> => !!entry && entry.id in USAGE,
	);
	// Documented, but without a snippet here yet: still one click away.
	const more = BINDINGS.filter((entry) => !(entry.id in USAGE));
	const [active, setActive] = useState(tabs[0]?.id);
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const current = tabs.find((entry) => entry.id === active) ?? tabs[0];
	if (!current) return null;
	const usage = USAGE[current.id];
	const isCore = current.id === CORE_FRAMEWORK;
	const isMain = current.id === DEFAULT_FRAMEWORK;

	const onKeyDown = (event: KeyboardEvent, index: number) => {
		const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
		if (delta === undefined) return;
		event.preventDefault();
		const next = (index + delta + tabs.length) % tabs.length;
		setActive(tabs[next].id);
		tabRefs.current[next]?.focus();
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

			<div
				role="tablist"
				aria-label="Framework"
				className="-mx-4 mt-10 flex snap-x scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-12 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
			>
				{tabs.map((entry, index) => {
					const selected = entry.id === current.id;
					return (
						<button
							key={entry.id}
							ref={(node) => {
								tabRefs.current[index] = node;
							}}
							type="button"
							role="tab"
							id={`framework-tab-${entry.id}`}
							aria-selected={selected}
							aria-controls="framework-panel"
							tabIndex={selected ? 0 : -1}
							onClick={(event) => {
								setActive(entry.id);
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
							onKeyDown={(event) => onKeyDown(event, index)}
							className={cn(
								"pressable hit-44 inline-flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
								selected
									? "border-primary/40 bg-card text-foreground shadow-sm shadow-primary/5"
									: "bg-transparent text-muted-foreground hover:border-foreground/15 hover:bg-card/60 hover:text-foreground",
							)}
						>
							<FrameworkIcon id={entry.id} />
							{name(entry)}
							{entry.id === DEFAULT_FRAMEWORK && (
								<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] leading-none font-medium text-primary">
									Main
								</span>
							)}
						</button>
					);
				})}
			</div>

			<div
				role="tabpanel"
				id="framework-panel"
				aria-labelledby={`framework-tab-${current.id}`}
				className="mt-4 grid gap-4 lg:grid-cols-2"
			>
				{!isCore && (
					<CodeFrame
						filename="checkout.ts"
						aside={
							<span className="text-xs text-muted-foreground">
								Same in every framework
							</span>
						}
					>
						<Snippet code={definition(current.package)} />
					</CodeFrame>
				)}
				<CodeFrame
					filename={usage.file}
					className={cn(isCore && "lg:col-span-2")}
				>
					<Snippet code={usage.code} />
				</CodeFrame>
			</div>

			<div className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-10">
				<div className="flex flex-col">
					<h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
						<FrameworkIcon id={current.id} className="size-5" />
						{name(current)}
					</h3>
					<p className="mt-1 font-mono text-xs text-muted-foreground">
						{current.package}
					</p>
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
						{usage.note}
					</p>
					<Link
						to="/docs/$"
						params={{ _splat: docs(current.id) }}
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
					<Checklist
						title="Only in React, for now"
						items={MAIN_EXTRAS}
						muted={!isMain}
					/>
				</div>
			</div>

			{more.length > 0 && (
				<p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
					Also available:
					{more.map((entry) => (
						<Link
							key={entry.id}
							to="/docs/$"
							params={{ _splat: docs(entry.id) }}
							className="pressable hit-44 inline-flex items-center gap-1.5 rounded-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
						>
							<FrameworkIcon id={entry.id} />
							{entry.title}
						</Link>
					))}
				</p>
			)}
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
