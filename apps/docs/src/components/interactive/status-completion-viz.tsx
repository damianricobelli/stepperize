"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["Account", "Profile", "Plan", "Review"] as const;

type Status = "previous" | "active" | "upcoming";

function statusFor(index: number, active: number): Status {
	if (index === active) return "active";
	if (index < active) return "previous";
	return "upcoming";
}

const STATUS_STYLES: Record<Status, string> = {
	active: "border-primary bg-primary text-primary-foreground",
	previous: "border-primary/40 bg-primary/10 text-primary",
	upcoming: "border-border bg-muted text-muted-foreground",
};

/**
 * Status vs Completion — the two axes side by side. Move the active step and the
 * *positional* status recolors automatically; toggle *completion* independently
 * and watch it stay put. The whole point is that they never depend on each other.
 */
export function StatusCompletionViz() {
	const [active, setActive] = useState(1);
	const [completed, setCompleted] = useState<Set<number>>(() => new Set([0]));

	const toggleComplete = (i: number) =>
		setCompleted((prev) => {
			const next = new Set(prev);
			next.has(i) ? next.delete(i) : next.add(i);
			return next;
		});

	return (
		<div className="not-prose my-6 rounded-xl border bg-card p-4 md:p-6">
			<div className="grid grid-cols-4 gap-2 sm:gap-4">
				{STEPS.map((label, i) => {
					const status = statusFor(i, active);
					const isDone = completed.has(i);
					return (
						<div
							key={label}
							className="flex flex-col items-center gap-2 text-center"
						>
							<button
								type="button"
								onClick={() => setActive(i)}
								className={cn(
									"relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
									STATUS_STYLES[status],
								)}
								aria-label={`Set ${label} active`}
							>
								{i + 1}
								{isDone && (
									<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white ring-2 ring-card">
										✓
									</span>
								)}
							</button>
							<span className="text-xs font-medium">{label}</span>
							<code className="text-[10px] text-muted-foreground">
								{status}
							</code>
							<button
								type="button"
								onClick={() => toggleComplete(i)}
								className={cn(
									"rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
									isDone
										? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
										: "bg-background text-muted-foreground hover:bg-muted",
								)}
							>
								{isDone ? "completed" : "complete"}
							</button>
						</div>
					);
				})}
			</div>

			<div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2">
				<p className="text-xs text-muted-foreground">
					<span className="font-semibold text-foreground">Status</span> is
					positional — derived from the active step. Click a circle: every
					status recolors, no extra calls.
				</p>
				<p className="text-xs text-muted-foreground">
					<span className="font-semibold text-foreground">Completion</span> is
					business state — you set it. Toggle the badges: status never moves. A
					“previous” step is <em>not</em> automatically completed.
				</p>
			</div>
		</div>
	);
}
