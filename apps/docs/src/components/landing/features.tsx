"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import type { DocsFramework } from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { docPath, useFramework } from "./framework-choice";
import { C, F, K, P, S, Section, SectionHeading, T } from "./shared";

/**
 * How each framework spells the parts the grid shows. Only names change: the
 * features themselves are the core's, so every cell is true in every binding.
 */
const SPELLING: Record<
	DocsFramework,
	{
		/** What a move is called on: `stepper.next()`, `stepper().next()`. */
		receiver: string;
		ownership: { code: ReactNode; note: string }[];
		ownershipText: ReactNode;
		primitivesText: ReactNode;
		/** Where fields live, next to the Standard Schema libraries. */
		fields: string[];
	}
> = {
	react: {
		receiver: "stepper",
		ownership: [
			{ code: call("checkout.", "useStepper", "()"), note: "local flow" },
			{ code: tag("checkout.", "Provider"), note: "share it" },
			{
				code: call("", "useStepperContext", "(s => s.current.id)"),
				note: "subscribe to a slice",
			},
		],
		ownershipText: (
			<>
				Each <InlineCode>useStepper()</InlineCode> is its own flow. A Provider
				shares one, and selectors keep re-renders focused.
			</>
		),
		primitivesText: (
			<>
				Unstyled <InlineCode>Stepper.*</InlineCode> components ship roles, ARIA
				and keyboard navigation. Style them through data attributes.
			</>
		),
		fields: ["React Hook Form", "TanStack Form", "Conform", "useState"],
	},
	vue: {
		receiver: "stepper",
		ownership: [
			{ code: call("checkout.", "useStepper", "()"), note: "local flow" },
			{ code: tag("checkout.", "Provider"), note: "share it" },
			{
				code: call("checkout.", "useStepperContext", "()"),
				note: "read it anywhere below",
			},
		],
		ownershipText: (
			<>
				Each <InlineCode>useStepper()</InlineCode> is its own flow. A Provider
				shares one with every component below it.
			</>
		),
		primitivesText: (
			<>
				Unstyled <InlineCode>Stepper.*</InlineCode> components ship roles, ARIA
				and keyboard navigation. Style them through data attributes.
			</>
		),
		fields: ["v-model", "your form library"],
	},
	svelte: {
		receiver: "stepper",
		ownership: [
			{ code: call("checkout.", "useStepper", "()"), note: "local flow" },
			{ code: tag("checkout.", "Provider"), note: "share it" },
			{
				code: call("checkout.", "useStepperContext", "()"),
				note: "read it anywhere below",
			},
		],
		ownershipText: (
			<>
				Each <InlineCode>useStepper()</InlineCode> is its own flow. A Provider
				shares one with every component below it.
			</>
		),
		primitivesText: (
			<>
				Unstyled <InlineCode>Stepper.*</InlineCode> components ship roles, ARIA
				and keyboard navigation. Style them through data attributes.
			</>
		),
		fields: ["bind:value", "$state"],
	},
	solid: {
		receiver: "stepper",
		ownership: [
			{ code: call("checkout.", "useStepper", "()"), note: "local flow" },
			{ code: tag("checkout.", "Provider"), note: "share it" },
			{
				code: call("checkout.", "useStepperContext", "(s => s.current.id)"),
				note: "track a slice",
			},
		],
		ownershipText: (
			<>
				Each <InlineCode>useStepper()</InlineCode> is its own flow. A Provider
				shares one, and selectors track only what they read.
			</>
		),
		primitivesText: (
			<>
				Unstyled <InlineCode>Stepper.*</InlineCode> components ship roles, ARIA
				and keyboard navigation. Style them through data attributes.
			</>
		),
		fields: ["stores", "signals"],
	},
	angular: {
		receiver: "stepper()",
		ownership: [
			{ code: call("checkout.", "injectStepper", "()"), note: "local flow" },
			{ code: call("checkout.", "provideStepper", "()"), note: "share it" },
			{
				code: call("checkout.", "injectStepperContext", "()"),
				note: "inject it below",
			},
		],
		ownershipText: (
			<>
				Each <InlineCode>injectStepper()</InlineCode> is its own flow, read as a
				signal. <InlineCode>provideStepper()</InlineCode> shares one through
				dependency injection.
			</>
		),
		primitivesText: (
			<>
				Unstyled directives ship roles, ARIA and keyboard navigation on your own
				template. Style them through data attributes.
			</>
		),
		fields: ["Angular forms", "signals"],
	},
	lit: {
		receiver: "stepper",
		ownership: [
			{ code: call("checkout.", "controller", "(this)"), note: "own a flow" },
			{ code: call("checkout.", "create", "()"), note: "make a shared one" },
			{
				code: call("checkout.", "controller", "(this, flow)"),
				note: "follow it",
			},
		],
		ownershipText: (
			<>
				A controller gives an element its own flow, or follows one that another
				element or a module owns.
			</>
		),
		primitivesText: (
			<>
				Element directives ship roles, ARIA and keyboard navigation on your own
				tags. Style them through data attributes.
			</>
		),
		fields: ["properties", "events"],
	},
	html: {
		receiver: "flow",
		ownership: [
			{ code: call("", "createStepper", "(steps)"), note: "the flow" },
			{ code: call("", "bindStepper", "(root, flow)"), note: "your markup" },
			{ code: call("flow.", "subscribe", "(render)"), note: "anything else" },
		],
		ownershipText: (
			<>
				One flow, bound to markup your server already rendered, and readable
				from Alpine, htmx or any script.
			</>
		),
		primitivesText: (
			<>
				<InlineCode>bindStepper</InlineCode> gives your own markup roles, ARIA
				and keyboard navigation. Style it through data attributes.
			</>
		),
		fields: ["your form", "htmx"],
	},
	core: {
		receiver: "flow",
		ownership: [
			{ code: call("", "createStepper", "(steps)"), note: "the flow" },
			{ code: call("flow.", "subscribe", "(listener)"), note: "listen" },
			{ code: call("flow.", "get", "()"), note: "an immutable view" },
		],
		ownershipText: (
			<>
				A plain object you own. <InlineCode>get</InlineCode> and{" "}
				<InlineCode>subscribe</InlineCode> are what external stores expect.
			</>
		),
		primitivesText: (
			<>
				Every binding ships them, and{" "}
				<InlineCode>@stepperize/core/dom</InlineCode> adds them to plain HTML:
				roles, ARIA and keyboard navigation.
			</>
		),
		fields: ["any form", "any state"],
	},
};

/**
 * The capability grid. Every cell shows the thing instead of describing it:
 * an editor diagnostic for type safety, the actual result union for
 * navigation, the real attribute names for primitives. Names and links follow
 * the visitor's framework; the features are the core's, so they hold in each.
 */
export function Features() {
	const framework = useFramework();
	const spelling = SPELLING[framework];

	return (
		<Section className="border-t">
			<SectionHeading
				eyebrow="Built for production"
				title="Small API. Every edge covered."
			>
				One typed definition powers navigation, rendering, validation and state,
				without dictating a single line of your markup.
			</SectionHeading>

			<div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-2 lg:grid-cols-3">
				<Cell
					className="md:col-span-2"
					title="Your step ids are a type"
					doc={docPath(framework, "start")}
					visual={<TypesVisual receiver={spelling.receiver} />}
				>
					Ids become a literal union the moment you define the steps. Typos and
					missing cases fail in your editor, not in production. No generics to
					wire up.
				</Cell>

				<Cell
					title="Every move has a result"
					doc={docPath(framework, "api")}
					visual={<ResultVisual receiver={spelling.receiver} />}
				>
					Navigation resolves to a typed result. Check{" "}
					<InlineCode>accepted</InlineCode>, then handle the exact reason a move
					was refused.
				</Cell>

				<Cell
					title="Local or shared, your call"
					doc={docPath(framework, "shared-state")}
					visual={<OwnershipVisual rows={spelling.ownership} />}
				>
					{spelling.ownershipText}
				</Cell>

				<Cell
					title="Accessible primitives"
					doc={docPath(framework, "primitives")}
					visual={<PrimitivesVisual />}
				>
					{spelling.primitivesText}
				</Cell>

				<Cell
					badge="New in v9"
					title="next() validates"
					doc={docPath(framework, "forms")}
					visual={<FormsVisual fields={spelling.fields} />}
				>
					Attach a Standard Schema per step and <InlineCode>next()</InlineCode>{" "}
					checks it for you. Your fields stay where they are:{" "}
					{new Intl.ListFormat("en", { type: "disjunction" }).format(
						spelling.fields,
					)}
					.
				</Cell>
			</div>
		</Section>
	);
}

function call(owner: string, name: string, args: string) {
	return (
		<>
			{owner}
			<F>{name}</F>
			{args}
		</>
	);
}

function tag(owner: string, name: string) {
	return (
		<>
			&lt;{owner}
			<T>{name}</T>&gt;
		</>
	);
}

function Cell({
	title,
	badge,
	doc,
	visual,
	className,
	children,
}: {
	title: string;
	badge?: string;
	doc: string;
	visual: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<article
			className={cn(
				"group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-xs",
				className,
			)}
		>
			<div className="relative flex min-h-44 flex-1 items-center justify-center overflow-hidden border-b bg-muted/30 p-4 sm:min-h-52 sm:p-6">
				{visual}
			</div>
			<div className="p-5 sm:p-6">
				<div className="flex items-center gap-2">
					<h3 className="text-base font-semibold tracking-tight">{title}</h3>
					{badge && (
						<span className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary">
							{badge}
						</span>
					)}
				</div>
				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					{children}
				</p>
				<Link
					to="/docs/$"
					params={{ _splat: doc }}
					className="hit-44 mt-4 inline-flex items-center gap-1 rounded text-sm font-medium text-foreground/80 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
				>
					Learn more
					<ArrowRight
						className="size-3.5 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5"
						aria-hidden
					/>
				</Link>
			</div>
		</article>
	);
}

function InlineCode({ children }: { children: ReactNode }) {
	return (
		<code className="rounded border bg-muted/60 px-1 py-px font-mono text-[0.85em] text-foreground">
			{children}
		</code>
	);
}

function MiniEditor({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"w-full max-w-md rounded-xl border bg-card font-mono text-[12px] leading-[1.7] shadow-lg",
				className,
			)}
		>
			{children}
		</div>
	);
}

/* ─────────────────────────────── visuals ────────────────────────────── */

const IDS = ["shipping", "payment", "review"] as const;

function Receiver({ name }: { name: string }) {
	// `stepper()` is a call: colour the name like one.
	return name.endsWith("()") ? (
		<>
			<F>{name.slice(0, -2)}</F>
			<P>()</P>
		</>
	) : (
		name
	);
}

function TypesVisual({ receiver }: { receiver: string }) {
	return (
		<div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
			{/* Autocomplete: inference you can see. */}
			<MiniEditor className="self-start">
				<div className="px-4 pt-3">
					<Receiver name={receiver} />
					<P>.</P>
					<F>goTo</F>
					<P>(</P>
					<S>"</S>
					<span className="-mb-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-foreground" />
					<S>"</S>
					<P>)</P>
				</div>
				<ul
					aria-label="Editor suggestions"
					className="m-2 mt-1.5 rounded-lg border bg-popover p-1 shadow-md"
				>
					{IDS.map((id, i) => (
						<li
							key={id}
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-0.5",
								i === 0 && "bg-primary/10",
							)}
						>
							<span className="flex size-4 items-center justify-center rounded-sm bg-sky-500/15 text-[9px] font-bold text-sky-700 dark:text-sky-300">
								ab
							</span>
							<span className={i === 0 ? "text-foreground" : ""}>"{id}"</span>
						</li>
					))}
				</ul>
			</MiniEditor>

			{/* Diagnostic: the typo that never reaches production. */}
			<MiniEditor className="self-end">
				<div className="px-4 py-3">
					<Receiver name={receiver} />
					<P>.</P>
					<F>goTo</F>
					<P>(</P>
					<span className="underline decoration-red-500 decoration-wavy decoration-1 underline-offset-[5px]">
						<S>"paymnt"</S>
					</span>
					<P>);</P>
				</div>
				<div className="border-t px-4 py-2.5 font-sans text-[11.5px] leading-snug text-muted-foreground">
					<span className="font-mono text-red-600 dark:text-red-400">
						ts(2345)
					</span>{" "}
					Argument of type <T>"paymnt"</T> is not assignable to parameter of
					type <S>"shipping" | "payment" | "review"</S>.
				</div>
			</MiniEditor>
		</div>
	);
}

function ResultVisual({ receiver }: { receiver: string }) {
	return (
		<MiniEditor className="px-4 py-3">
			<div>
				<K>const</K> result <P>=</P> <K>await</K> <Receiver name={receiver} />
				<P>.</P>
				<F>next</F>
				<P>();</P>
			</div>
			<div>
				<K>if</K> <P>(!</P>result<P>.</P>accepted<P>) {"{"}</P>
			</div>
			<div className="pl-4">
				result<P>.</P>reason
			</div>
			<div className="pl-4">
				<C>{"// "}</C>
				<span className="inline-flex flex-wrap gap-1 align-middle">
					{["invalid", "guard", "policy", "pending"].map((reason) => (
						<span
							key={reason}
							className="rounded bg-emerald-500/10 px-1 text-[11px] text-emerald-700 dark:text-emerald-300"
						>
							"{reason}"
						</span>
					))}
				</span>
			</div>
			<div>
				<P>{"}"}</P>
			</div>
		</MiniEditor>
	);
}

function OwnershipVisual({
	rows,
}: {
	rows: { code: ReactNode; note: string }[];
}) {
	return (
		<MiniEditor className="divide-y">
			{rows.map((row) => (
				<div
					key={row.note}
					className="flex items-center justify-between gap-3 px-4 py-2"
				>
					<span className="truncate">{row.code}</span>
					<span className="hidden shrink-0 font-sans text-[11px] text-muted-foreground sm:inline">
						{row.note}
					</span>
				</div>
			))}
		</MiniEditor>
	);
}

function PrimitivesVisual() {
	const items = [
		{ status: "complete", label: "Cart" },
		{ status: "current", label: "Shipping" },
		{ status: "pending", label: "Payment" },
	] as const;

	return (
		<div className="w-full max-w-xs">
			<div className="flex items-center">
				{items.map((item, i) => (
					<div key={item.label} className="flex items-center not-last:flex-1">
						<span
							className={cn(
								"flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
								item.status === "complete" &&
									"border-primary/30 bg-primary/10 text-primary",
								item.status === "current" &&
									"border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
								item.status === "pending" && "bg-muted text-muted-foreground",
							)}
						>
							{item.status === "complete" ? (
								<Check className="size-3.5" strokeWidth={3} aria-hidden />
							) : (
								i + 1
							)}
						</span>
						{i < items.length - 1 && (
							<span
								className={cn(
									"mx-2 h-0.5 flex-1 rounded-full",
									i === 0 ? "bg-primary" : "bg-border",
								)}
							/>
						)}
					</div>
				))}
			</div>
			<div className="mt-3 grid grid-cols-3 gap-1 font-mono text-[10.5px] text-muted-foreground">
				{items.map((item) => (
					<span
						key={item.label}
						className="truncate first:text-left last:text-right [&:nth-child(2)]:text-center"
					>
						<span className="text-foreground/40">state=</span>
						<span className="text-emerald-700 dark:text-emerald-300">
							{item.status}
						</span>
					</span>
				))}
			</div>
		</div>
	);
}

/** Standard Schema libraries: the same in every framework. */
const SCHEMA_LIBS = ["Zod", "Valibot", "ArkType"];

function FormsVisual({ fields }: { fields: string[] }) {
	return (
		<ul className="flex max-w-xs flex-wrap justify-center gap-2">
			{[...fields, ...SCHEMA_LIBS].map((lib) => (
				<li
					key={lib}
					className="rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-xs"
				>
					{lib}
				</li>
			))}
		</ul>
	);
}
