"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { highlightCode } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

const SKELETON_WIDTHS = [
	"82%",
	"67%",
	"91%",
	"74%",
	"60%",
	"88%",
	"71%",
	"63%",
];

/**
 * Syntax-highlighted source for a block.
 *
 * If `initialHtml` is provided (detail pages SSR it via the route loader) it
 * renders immediately. Otherwise — gallery cards, where highlighting all blocks
 * up front would be wasteful — it lazily calls the `highlightCode` server fn
 * (RPC) the first time it mounts, showing a skeleton meanwhile.
 */
export function HighlightedCode({
	code,
	initialHtml,
	className,
	maxHeightClass = "max-h-80",
}: {
	code: string;
	initialHtml?: string;
	className?: string;
	maxHeightClass?: string;
}) {
	const [html, setHtml] = useState<string | null>(initialHtml ?? null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		// Detail pages pass SSR'd HTML; nothing to fetch.
		if (initialHtml) return;
		let active = true;
		setHtml(null);
		setFailed(false);
		highlightCode({ data: { code, lang: "tsx" } })
			.then((res) => {
				if (active) setHtml(res.html);
			})
			.catch(() => {
				if (active) setFailed(true);
			});
		return () => {
			active = false;
		};
	}, [code, initialHtml]);

	return (
		<div className={cn("relative", className)}>
			<div className="absolute right-3 top-3 z-10">
				<CopyButton
					value={code}
					label="Copy code"
					className="rounded-md border bg-background/80 p-1.5 backdrop-blur"
				/>
			</div>
			{html ? (
				<div
					className={cn(
						"block-code overflow-auto rounded-xl border bg-card p-4",
						maxHeightClass,
					)}
					// Highlighted markup comes from our own server-side Shiki call.
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : failed ? (
				<pre
					className={cn(
						"overflow-auto rounded-xl border bg-card p-4 font-mono text-[0.8125rem] leading-relaxed text-foreground",
						maxHeightClass,
					)}
				>
					<code>{code}</code>
				</pre>
			) : (
				<div
					className={cn(
						"space-y-2 rounded-xl border bg-card p-4",
						maxHeightClass,
					)}
				>
					{SKELETON_WIDTHS.map((width) => (
						<Skeleton key={width} className="h-3.5" style={{ width }} />
					))}
				</div>
			)}
		</div>
	);
}
