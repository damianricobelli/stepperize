"use client";

import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import {
	choiceOf,
	docPath,
	useFramework,
} from "@/components/landing/framework-choice";
import { CORE_FRAMEWORK, type DocsFramework } from "@/lib/frameworks";
import { GITHUB_URL, NPM_URL, Wordmark } from "./brand";

type FooterLink = { label: string; react?: boolean } & (
	| { doc: string }
	| { to: "/blocks" | "/changelog" | "/studio" }
	| { href: string }
);

/** The guides that exist for each kind of framework. */
function guides(framework: DocsFramework): FooterLink[] {
	if (framework === "html") {
		return [
			{ label: "Markup", doc: "v9/html/markup" },
			{ label: "Server-rendered pages", doc: "v9/html/guides/server-rendered" },
			{ label: "Alpine", doc: "v9/html/guides/alpine" },
			{ label: "htmx", doc: "v9/html/guides/htmx" },
		];
	}
	if (framework === CORE_FRAMEWORK) {
		return [
			{ label: "createStepper", doc: "v9/core/create-stepper" },
			{ label: "Errors", doc: "v9/core/errors" },
			{ label: "On plain HTML", doc: "v9/html" },
		];
	}
	return [
		{ label: "Forms", doc: docPath(framework, "forms") },
		{ label: "Primitives", doc: docPath(framework, "primitives") },
		{ label: "Shared state", doc: docPath(framework, "shared-state") },
		{ label: "The step in the URL", doc: docPath(framework, "url") },
	];
}

/**
 * The doc links follow the framework the visitor picked on the landing page
 * (React on the server and until hydration). The blocks and Studio are
 * shadcn/ui for React, and are marked so.
 */
function columns(framework: DocsFramework) {
	const { title } = choiceOf(framework);
	return [
		{
			title: `Get started with ${title}`,
			links: [
				{ label: "Introduction", doc: docPath(framework, "intro") },
				{ label: "Installation", doc: docPath(framework, "install") },
				{ label: "First stepper", doc: docPath(framework, "start") },
				{ label: "Migrating from v8", doc: "v9/react/migration", react: true },
			],
		},
		{ title: "Guides", links: guides(framework) },
		{
			title: "Project",
			links: [
				{ label: "Blocks", to: "/blocks", react: true },
				{ label: "Studio", to: "/studio", react: true },
				{ label: "Changelog", to: "/changelog" },
				{ label: "GitHub", href: GITHUB_URL },
				{ label: "npm", href: NPM_URL },
			],
		},
	] satisfies { title: string; links: FooterLink[] }[];
}

// Vertical padding instead of a hit-area overlay: the links sit close
// together, and overlapping 44px targets would make taps ambiguous. On touch
// the padding grows so each row is a 44px pitch.
const linkClass =
	"inline-flex items-center gap-1.5 rounded py-1 text-sm text-muted-foreground pointer-coarse:py-2.5 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** Shared footer for the marketing surfaces (landing + Blocks gallery). */
export function SiteFooter() {
	const framework = useFramework();
	return (
		<footer className="border-t bg-card/40">
			<div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pt-12 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
				<div className="max-w-xs">
					<Link
						to="/"
						aria-label="Stepperize home"
						className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Wordmark />
					</Link>
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
						Type-safe, headless multi-step flows for React, Vue, Svelte, Solid,
						Angular, Lit and plain HTML. Your UI, your forms, your flow.
					</p>
					<p className="mt-6 text-xs text-muted-foreground/80">
						MIT licensed · Built in the open on GitHub
					</p>
				</div>

				<nav
					aria-label="Footer"
					className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-3"
				>
					{columns(framework).map((column) => (
						<div key={column.title}>
							<p className="text-[13px] font-medium text-foreground">
								{column.title}
							</p>
							<ul className="mt-2 space-y-1">
								{column.links.map((link) => (
									<li key={link.label}>
										<FooterItem link={link} />
									</li>
								))}
							</ul>
						</div>
					))}
				</nav>
			</div>
		</footer>
	);
}

/** "Blocks", then a small React mark: they are shadcn/ui components for React. */
function Label({ link }: { link: FooterLink }) {
	if (!link.react) return link.label;
	return (
		<>
			{link.label}
			<span className="inline-flex items-center gap-1 rounded-full border px-1.5 text-[11px] leading-4 text-muted-foreground">
				<FrameworkIcon id="react" className="size-2.5" />
				React
			</span>
		</>
	);
}

function FooterItem({ link }: { link: FooterLink }): ReactNode {
	if ("doc" in link) {
		return (
			<Link to="/docs/$" params={{ _splat: link.doc }} className={linkClass}>
				<Label link={link} />
			</Link>
		);
	}
	if ("to" in link) {
		return (
			<Link to={link.to} className={linkClass}>
				<Label link={link} />
			</Link>
		);
	}
	return (
		<a
			href={link.href}
			target="_blank"
			rel="noreferrer noopener"
			className={linkClass}
		>
			{link.label}
			<ArrowUpRight className="size-3 opacity-60" aria-hidden />
		</a>
	);
}
