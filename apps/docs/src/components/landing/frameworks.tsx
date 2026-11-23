import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";
import {
	BINDINGS,
	CORE_FRAMEWORK,
	DEFAULT_FRAMEWORK,
	FRAMEWORKS,
} from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { Code, Section, SectionHeading } from "./shared";

const MAIN = BINDINGS.find((entry) => entry.id === DEFAULT_FRAMEWORK);
const OTHERS = BINDINGS.filter((entry) => entry.id !== DEFAULT_FRAMEWORK);
const CORE = FRAMEWORKS.find((entry) => entry.id === CORE_FRAMEWORK);

const docs = (framework: string) => `${CURRENT_DOCS_VERSION}/${framework}`;

const link =
	"rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 outline-none transition-colors duration-150 hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring";

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
		<p
			className={cn(
				"flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground sm:text-[15px]",
				className,
			)}
			style={style}
		>
			<span>Built for</span>
			<Link to="/docs/$" params={{ _splat: docs(MAIN.id) }} className={link}>
				{MAIN.title}
			</Link>
			<span>· also for</span>
			{OTHERS.map((entry, index) => (
				<span key={entry.id} className="inline-flex items-center gap-x-1.5">
					<Link
						to="/docs/$"
						params={{ _splat: docs(entry.id) }}
						className={link}
					>
						{entry.title}
					</Link>
					{index < OTHERS.length - 1 && <span aria-hidden>·</span>}
				</span>
			))}
			{CORE && (
				<>
					<span>or</span>
					<Link
						to="/docs/$"
						params={{ _splat: docs(CORE.id) }}
						className={link}
					>
						no framework
					</Link>
				</>
			)}
		</p>
	);
}

/** What only the main binding has today, on top of what every binding shares. */
const MAIN_EXTRAS = [
	"Hooks, Provider and selectors",
	"Accessible, unstyled primitives",
	"Copy-and-paste blocks and Stepper Studio",
	"Guides for React Hook Form, TanStack Form and Conform",
];

/**
 * "Does it fit my stack?" React gets the large card because it is the most
 * complete binding; the others are listed from the same registry the docs
 * use, so a new binding appears here when it is documented.
 */
export function Frameworks() {
	if (!MAIN) return null;
	return (
		<Section id="frameworks" className="border-t">
			<SectionHeading eyebrow="One engine" title="React first. Not React only.">
				The flow itself is plain TypeScript in <Code>@stepperize/core</Code>:
				steps, validation, branching and snapshots, with no framework inside.
				Each binding adds state that feels native and the same accessible
				primitives.
			</SectionHeading>

			<div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-3">
				<article className="flex flex-col rounded-2xl border bg-card p-6 shadow-xs lg:row-span-2">
					<div className="flex items-center gap-2">
						<FrameworkIcon id={MAIN.id} className="size-5" />
						<h3 className="text-xl font-semibold tracking-tight">
							{MAIN.title}
						</h3>
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
							Main binding
						</span>
					</div>
					<p className="mt-1 font-mono text-xs text-muted-foreground">
						{MAIN.package}
					</p>
					<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
						Where Stepperize started and where everything lands first.
					</p>
					<ul className="mt-4 flex flex-col gap-2 text-sm">
						{MAIN_EXTRAS.map((item) => (
							<li key={item} className="flex items-start gap-2">
								<Check
									aria-hidden
									className="mt-0.5 size-4 shrink-0 text-primary"
								/>
								{item}
							</li>
						))}
					</ul>
					<DocsLink framework={MAIN.id} className="mt-auto pt-6">
						{MAIN.title} docs
					</DocsLink>
				</article>

				<ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
					{[...OTHERS, ...(CORE ? [CORE] : [])].map((entry) => (
						<li
							key={entry.id}
							className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs"
						>
							<h3 className="flex items-center gap-2 font-semibold tracking-tight">
								<FrameworkIcon id={entry.id} />
								{entry.id === CORE_FRAMEWORK ? "No framework" : entry.title}
							</h3>
							<p className="mt-1 font-mono text-xs text-muted-foreground">
								{entry.package}
							</p>
							<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
								{entry.id === CORE_FRAMEWORK
									? "The state machine by itself, for tests, servers, scripts and anything else that runs JavaScript."
									: `${entry.description}.`}
							</p>
							<DocsLink framework={entry.id} className="mt-auto pt-4">
								{entry.title} docs
							</DocsLink>
						</li>
					))}
				</ul>
			</div>
		</Section>
	);
}

function DocsLink({
	framework,
	className,
	children,
}: {
	framework: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={className}>
			<Link
				to="/docs/$"
				params={{ _splat: docs(framework) }}
				className="group inline-flex items-center gap-1 rounded-sm text-sm font-medium text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
			>
				{children}
				<ArrowRight
					aria-hidden
					className="size-3.5 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5"
				/>
			</Link>
		</div>
	);
}
