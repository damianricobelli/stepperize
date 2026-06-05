"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type StageId = "payload" | "before" | "commit" | "after" | "done";

const STAGES: { id: StageId; label: string; detail: string }[] = [
	{
		id: "payload",
		label: "payload",
		detail: "next({ data }) — pending data is prepared",
	},
	{
		id: "before",
		label: "beforeStepChange",
		detail: "sees the pending data; return false to cancel",
	},
	{
		id: "commit",
		label: "commit",
		detail: "data is saved and the current step changes",
	},
	{ id: "after", label: "onStepChange", detail: "runs after the move is accepted" },
	{
		id: "done",
		label: "returns true",
		detail: "navigation resolves to whether it changed",
	},
];

const STEP_ORDER: StageId[] = ["payload", "before", "commit", "after", "done"];

/**
 * Navigation lifecycle — press next() and watch the payload flow through
 * beforeStepChange → commit → onStepChange. Flip "reject in beforeStepChange" to
 * see the change cancel before anything commits.
 */
export function LifecycleViz() {
	const [activeStage, setActiveStage] = useState<StageId | null>(null);
	const [reject, setReject] = useState(false);
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<null | "accepted" | "cancelled">(null);

	async function run() {
		if (running) return;
		setRunning(true);
		setResult(null);
		for (const stage of STEP_ORDER) {
			// Cancel path: stop right after beforeChange.
			if (reject && stage === "commit") {
				setActiveStage("before");
				await wait(500);
				setActiveStage(null);
				setResult("cancelled");
				setRunning(false);
				return;
			}
			setActiveStage(stage);
			await wait(650);
		}
		setActiveStage(null);
		setResult("accepted");
		setRunning(false);
	}

	return (
		<div className="not-prose my-6 rounded-xl border bg-card p-4 md:p-6">
			<div className="mb-4 flex flex-wrap items-center gap-3">
				<button
					type="button"
					onClick={run}
					disabled={running}
					className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
				>
					{running ? "running…" : "stepper.next()"}
				</button>
				<label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
					<input
						type="checkbox"
						checked={reject}
						onChange={(e) => setReject(e.target.checked)}
						className="h-4 w-4 accent-rose-500"
					/>
					reject in <code className="text-xs">beforeStepChange</code>
				</label>
				{result && (
					<span
						className={cn(
							"ml-auto rounded-md px-2 py-1 text-xs font-semibold",
							result === "accepted"
								? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
								: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
						)}
					>
						{result === "accepted" ? "→ returns true" : "→ returns false"}
					</span>
				)}
			</div>

			<ol className="space-y-2">
				{STAGES.map((stage) => {
					const isActive = activeStage === stage.id;
					const isCancelStage =
						reject &&
						(stage.id === "commit" ||
							stage.id === "after" ||
							stage.id === "done");
					return (
						<li
							key={stage.id}
							className={cn(
								"flex items-start gap-3 rounded-lg border p-3 transition-all",
								isActive
									? "border-primary bg-primary/10"
									: "border-border bg-muted/20",
								isCancelStage && "opacity-40",
							)}
						>
							<code
								className={cn(
									"shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
									isActive
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground",
								)}
							>
								{stage.label}
							</code>
							<span className="text-xs text-muted-foreground">
								{stage.detail}
							</span>
						</li>
					);
				})}
			</ol>
		</div>
	);
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
