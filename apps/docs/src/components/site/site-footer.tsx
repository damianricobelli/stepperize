import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { GITHUB_URL, NPM_URL, Wordmark } from "./brand";

type FooterLink =
	| { label: string; doc: string }
	| { label: string; to: "/blocks" | "/changelog" }
	| { label: string; href: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
	{
		title: "Get started",
		links: [
			{ label: "Introduction", doc: "latest" },
			{ label: "Installation", doc: "latest/getting-started/installation" },
			{ label: "First stepper", doc: "latest/getting-started/first-stepper" },
			{ label: "Migrating to v8", doc: "v8/migration/v8" },
		],
	},
	{
		title: "Guides",
		links: [
			{ label: "Forms", doc: "latest/forms" },
			{ label: "Primitives", doc: "latest/guides/primitives" },
			{ label: "Navigation", doc: "latest/guides/navigation" },
			{ label: "Performance", doc: "v8/guides/performance" },
		],
	},
	{
		title: "Project",
		links: [
			{ label: "Blocks", to: "/blocks" },
			{ label: "Changelog", to: "/changelog" },
			{ label: "GitHub", href: GITHUB_URL },
			{ label: "npm", href: NPM_URL },
		],
	},
];

const linkClass =
	"inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** Shared footer for the marketing surfaces (landing + Blocks gallery). */
export function SiteFooter() {
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
						Type-safe, headless multi-step flows for React. Your UI, your forms,
						your flow.
					</p>
					<p className="mt-6 text-xs text-muted-foreground/80">
						MIT licensed · Built in the open on GitHub
					</p>
				</div>

				<nav
					aria-label="Footer"
					className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-3"
				>
					{COLUMNS.map((column) => (
						<div key={column.title}>
							<p className="text-[13px] font-medium text-foreground">
								{column.title}
							</p>
							<ul className="mt-3 space-y-2.5">
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

function FooterItem({ link }: { link: FooterLink }): ReactNode {
	if ("doc" in link) {
		return (
			<Link to="/docs/$" params={{ _splat: link.doc }} className={linkClass}>
				{link.label}
			</Link>
		);
	}
	if ("to" in link) {
		return (
			<Link to={link.to} className={linkClass}>
				{link.label}
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
