"use client";

import { Star } from "lucide-react";
import { GITHUB_URL, NPM_URL } from "@/components/site/brand";
import type { DocsFramework } from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { useFramework } from "./framework-choice";
import { GitHubMark } from "./shared";
import { formatCompact, useStepperizeStats } from "./stats";

/**
 * Compact star count for the header. Links to the repo and shows the live
 * count when known. The star icon nudges the click that grows the number.
 */
export function HeaderStars({ className }: { className?: string }) {
	const { stars } = useStepperizeStats();
	return (
		<a
			href={GITHUB_URL}
			target="_blank"
			rel="noreferrer noopener"
			aria-label={
				stars != null
					? `Stepperize on GitHub, ${stars} stars`
					: "Stepperize on GitHub"
			}
			className={cn(
				"pressable inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
		>
			<GitHubMark className="size-[18px]" />
			<span className="inline-flex items-center gap-1 tabular-nums">
				<Star className="size-3 fill-current text-amber-500" aria-hidden />
				{stars != null ? formatCompact(stars) : "Star"}
			</span>
		</a>
	);
}

/**
 * Size and third-party dependencies of each binding, as the visitor reads the
 * page. Sizes are min + gzip, in KiB, from `node scripts/check-bundle.mjs` at
 * the repo root (the `/headless` entry of each binding: the flow and its
 * glue, core included, without the UI primitives; for HTML, `core/dom`);
 * update them from that script. Dependencies are the `dependencies` of each
 * package other than `@stepperize/core`: only Svelte has one.
 */
const FOOTPRINT: Record<
	DocsFramework,
	{ size: string; sizeLabel: string; deps: number; depsLabel: string }
> = {
	react: {
		size: "2.7 KiB",
		sizeLabel: "React hooks, min + gzip",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
	vue: {
		size: "3.4 KiB",
		sizeLabel: "Vue composables, min + gzip",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
	svelte: {
		size: "3.5 KiB",
		sizeLabel: "Svelte flow, min + gzip",
		deps: 1,
		depsLabel: "third-party dependency (esm-env)",
	},
	solid: {
		size: "3.1 KiB",
		sizeLabel: "Solid flow, min + gzip",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
	angular: {
		size: "3.2 KiB",
		sizeLabel: "Angular signals, min + gzip",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
	lit: {
		size: "2.6 KiB",
		sizeLabel: "Lit controller, min + gzip",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
	html: {
		size: "4.0 KiB",
		sizeLabel: "bindStepper, on the 2.3 KiB core",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
	core: {
		size: "2.3 KiB",
		sizeLabel: "the state machine, min + gzip",
		deps: 0,
		depsLabel: "third-party dependencies",
	},
};

/**
 * Trust strip. Live numbers (stars, downloads) sit next to static facts so a
 * first-time visitor can answer "can I trust this?" without leaving for
 * GitHub or npm. Live values degrade to static copy when a fetch fails, so the
 * strip is never empty or misleading.
 *
 * Size and dependencies follow the visitor's framework. Downloads are the
 * React package's and say so: the other bindings are new, and adding up
 * packages that depend on each other would count one install several times.
 */
export function StatBar({ className }: { className?: string }) {
	const { stars, downloads } = useStepperizeStats();
	const footprint = FOOTPRINT[useFramework()];

	const stats = [
		{
			value: stars != null ? formatCompact(stars) : "Open source",
			label: "GitHub stars",
			href: GITHUB_URL,
		},
		{
			value: downloads != null ? formatCompact(downloads) : "npm",
			label: "monthly downloads of @stepperize/react",
			href: NPM_URL,
		},
		{ value: footprint.size, label: footprint.sizeLabel },
		{ value: String(footprint.deps), label: footprint.depsLabel },
	];

	return (
		<ul
			aria-label="Project stats"
			className={cn(
				"grid grid-cols-2 overflow-hidden rounded-2xl border bg-border sm:grid-cols-4",
				"gap-px",
				className,
			)}
		>
			{stats.map((stat) => {
				const body = (
					<>
						<span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
							{stat.value}
						</span>
						<span className="text-xs text-muted-foreground sm:text-[13px]">
							{stat.label}
						</span>
					</>
				);
				return (
					<li key={stat.label} className="flex bg-card">
						{stat.href ? (
							<a
								href={stat.href}
								target="_blank"
								rel="noreferrer noopener"
								className="flex flex-1 flex-col gap-0.5 px-4 py-4 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
							>
								{body}
							</a>
						) : (
							<div className="flex flex-1 flex-col gap-0.5 px-4 py-4 sm:px-5">
								{body}
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}
