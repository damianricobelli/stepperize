"use client";

import { Star } from "lucide-react";
import { GITHUB_URL, NPM_URL } from "@/components/site/brand";
import { cn } from "@/lib/utils";
import { GitHubMark } from "./shared";
import { formatCompact, formatKb, useStepperizeStats } from "./stats";

/**
 * Compact star count for the header. Links to the repo and shows the live
 * count when known. The star icon nudges the click that grows the number.
 */
export function HeaderStars() {
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
			className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		>
			<GitHubMark className="size-[18px]" />
			<span className="hidden items-center gap-1 tabular-nums sm:inline-flex">
				<Star className="size-3 fill-current text-amber-500" aria-hidden />
				{stars != null ? formatCompact(stars) : "Star"}
			</span>
		</a>
	);
}

/**
 * Trust strip. Live numbers (stars, downloads, bundle size) sit next to static
 * facts (zero deps) so a first-time visitor can answer "can I trust this?"
 * without leaving for GitHub or npm. Live values degrade to static copy when a
 * fetch fails, so the strip is never empty or misleading.
 */
export function StatBar({ className }: { className?: string }) {
	const { stars, downloads, gzip } = useStepperizeStats();

	const stats = [
		{
			value: stars != null ? formatCompact(stars) : "Open source",
			label: "GitHub stars",
			href: GITHUB_URL,
		},
		{
			value: downloads != null ? formatCompact(downloads) : "npm",
			label: "monthly downloads",
			href: NPM_URL,
		},
		{
			value: gzip != null ? formatKb(gzip) : "Tiny",
			label: "min + gzip",
		},
		{ value: "0", label: "dependencies" },
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
								className="flex flex-1 flex-col gap-0.5 px-5 py-4 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60"
							>
								{body}
							</a>
						) : (
							<div className="flex flex-1 flex-col gap-0.5 px-5 py-4">
								{body}
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}
