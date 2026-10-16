"use client";

import { Code2, Eye } from "lucide-react";
import { Activity, type ReactNode, useId, useState } from "react";
import { HighlightedCode } from "@/components/blocks-gallery/highlighted-code";
import { cn } from "@/lib/utils";

type Tab = "preview" | "code";

/**
 * The frame every live docs example sits in: a titled header, a stage for the
 * running demo, and (when the source is provided) a Code tab with the exact
 * file that runs in the preview, highlighted and copyable.
 *
 * The preview stays mounted inside <Activity> while the code is open, so
 * peeking at the source never resets what the reader was doing.
 */
export function ExampleFrame({
	title,
	description,
	source,
	file,
	children,
	stageClassName,
}: {
	title: string;
	description?: ReactNode;
	/** Raw source of the demo. Adds the Code tab. */
	source?: string;
	file?: string;
	children: ReactNode;
	stageClassName?: string;
}) {
	const [tab, setTab] = useState<Tab>("preview");
	const id = useId();

	return (
		<figure className="not-prose my-8 min-w-0 overflow-hidden rounded-2xl border bg-card shadow-xs">
			<figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b bg-muted/30 px-4 py-3 sm:px-5">
				<div className="min-w-0">
					<p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
						<span className="relative flex size-2" aria-hidden>
							<span className="absolute inset-0 rounded-full bg-emerald-500/30 motion-safe:animate-ping [animation-iteration-count:2]" />
							<span className="relative size-2 rounded-full bg-emerald-500" />
						</span>
						{title}
					</p>
					{description && (
						<p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
							{description}
						</p>
					)}
				</div>
				{source && (
					<div
						role="tablist"
						aria-label={`${title} views`}
						className="relative grid shrink-0 grid-cols-2 rounded-lg border bg-background p-0.5"
					>
						<span
							aria-hidden
							className={cn(
								"absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-muted shadow-xs transition-transform duration-200 ease-out-strong",
								tab === "code" && "translate-x-full",
							)}
						/>
						{(["preview", "code"] as const).map((value) => {
							const Icon = value === "preview" ? Eye : Code2;
							return (
								<button
									key={value}
									type="button"
									role="tab"
									id={`${id}-${value}-tab`}
									aria-selected={tab === value}
									aria-controls={`${id}-${value}`}
									onClick={() => setTab(value)}
									className={cn(
										"hit-44 inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium capitalize outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
										tab === value
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Icon className="size-3.5" aria-hidden />
									{value}
								</button>
							);
						})}
					</div>
				)}
			</figcaption>

			<Activity mode={tab === "preview" ? "visible" : "hidden"}>
				{source ? (
					<div
						id={`${id}-preview`}
						role="tabpanel"
						aria-labelledby={`${id}-preview-tab`}
						className={cn("min-w-0 p-4 sm:p-6", stageClassName)}
					>
						{children}
					</div>
				) : (
					<div className={cn("min-w-0 p-4 sm:p-6", stageClassName)}>
						{children}
					</div>
				)}
			</Activity>

			{source && tab === "code" && (
				<div
					id={`${id}-code`}
					role="tabpanel"
					aria-labelledby={`${id}-code-tab`}
					className="duration-200 animate-in fade-in-0"
				>
					<HighlightedCode
						code={source}
						maxHeightClass="max-h-[34rem]"
						surfaceClassName="rounded-none border-0 bg-transparent p-4 sm:p-5"
					/>
					<p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
						{file && (
							<code className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
								{file}
							</code>
						)}
						The exact file running in the preview. Needs React and
						@stepperize/react; Tailwind is only styling.
					</p>
				</div>
			)}
		</figure>
	);
}
