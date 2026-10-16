import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { C, F, K, P, S, Section, SectionHeading, T } from "./shared";

/**
 * The capability grid. Every cell shows the thing instead of describing it:
 * an editor diagnostic for type safety, the actual result union for
 * navigation, the real attribute names for primitives.
 */
export function Features() {
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
					doc="v8/getting-started/concepts"
					visual={<TypesVisual />}
				>
					Ids become a literal union the moment you call{" "}
					<InlineCode>defineStepper</InlineCode>. Typos and missing cases fail
					in your editor, not in production. No generics to wire up.
				</Cell>

				<Cell
					badge="New in v8"
					title="Every move has a result"
					doc="v8/guides/navigation"
					visual={<ResultVisual />}
				>
					Navigation resolves to a typed result. Check{" "}
					<InlineCode>accepted</InlineCode>, then handle the exact reason a move
					was refused.
				</Cell>

				<Cell
					badge="New in v8"
					title="Local or shared, your call"
					doc="v8/guides/local-and-shared-state"
					visual={<OwnershipVisual />}
				>
					Each <InlineCode>useStepper()</InlineCode> is its own flow. A Provider
					shares one, and selectors keep re-renders focused.
				</Cell>

				<Cell
					title="Accessible primitives"
					doc="v8/guides/primitives"
					visual={<PrimitivesVisual />}
				>
					Unstyled <InlineCode>Stepper.*</InlineCode> components ship roles,
					ARIA and keyboard navigation. Style them through data attributes.
				</Cell>

				<Cell
					title="Bring your form library"
					doc="v8/forms"
					visual={<FormsVisual />}
				>
					Attach a Standard Schema per step and keep fields in React Hook Form,
					TanStack Form, Conform, or plain state.
				</Cell>
			</div>
		</Section>
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

function TypesVisual() {
	return (
		<div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
			{/* Autocomplete: inference you can see. */}
			<MiniEditor className="self-start">
				<div className="px-4 pt-3">
					stepper<P>.</P>
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
					stepper<P>.</P>
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

function ResultVisual() {
	return (
		<MiniEditor className="px-4 py-3">
			<div>
				<K>const</K> result <P>=</P> <K>await</K> stepper<P>.</P>
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
					{["guard", "policy", "boundary", "pending"].map((reason) => (
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

function OwnershipVisual() {
	const rows = [
		{
			code: (
				<>
					checkout.<F>useStepper</F>()
				</>
			),
			note: "local flow",
		},
		{
			code: (
				<>
					&lt;checkout.<T>Provider</T>&gt;
				</>
			),
			note: "share it",
		},
		{
			code: (
				<>
					<F>useStepperContext</F>(s <P>{"=>"}</P> s.id)
				</>
			),
			note: "subscribe to a slice",
		},
	];

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
		{ status: "previous", label: "Cart" },
		{ status: "active", label: "Shipping" },
		{ status: "upcoming", label: "Payment" },
	] as const;

	return (
		<div className="w-full max-w-xs">
			<div className="flex items-center">
				{items.map((item, i) => (
					<div key={item.label} className="flex items-center not-last:flex-1">
						<span
							className={cn(
								"flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
								item.status === "previous" &&
									"border-primary/30 bg-primary/10 text-primary",
								item.status === "active" &&
									"border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
								item.status === "upcoming" && "bg-muted text-muted-foreground",
							)}
						>
							{item.status === "previous" ? (
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
						<span className="text-foreground/40">status=</span>
						<span className="text-emerald-700 dark:text-emerald-300">
							{item.status}
						</span>
					</span>
				))}
			</div>
		</div>
	);
}

const FORM_LIBS = [
	"React Hook Form",
	"TanStack Form",
	"Conform",
	"Zod",
	"Valibot",
	"ArkType",
];

function FormsVisual() {
	return (
		<ul className="flex max-w-xs flex-wrap justify-center gap-2">
			{FORM_LIBS.map((lib) => (
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
