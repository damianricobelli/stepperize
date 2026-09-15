"use client";

import { defineStepper, type ResetOptions } from "@stepperize/react";
import { useState } from "react";

const flow = defineStepper(
	[
		{ id: "details", title: "Details" },
		{ id: "review", title: "Review" },
	],
	{ defaultData: { details: "Initial draft" } },
);
const buttonClass =
	"rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40";

export function ResetDemo() {
	const stepper = flow.useStepper();
	const [before, setBefore] = useState(
		"Change the draft, complete a step, then choose a reset.",
	);
	const snapshot = JSON.stringify(
		{
			step: stepper.id,
			data: stepper.data.all(),
			completed: stepper.completed,
		},
		null,
		2,
	);
	async function reset(options?: ResetOptions) {
		setBefore(snapshot);
		await stepper.reset(options);
	}
	return (
		<section
			aria-label="Reset demo"
			className="not-prose my-6 space-y-4 rounded-xl border bg-card p-5"
		>
			<label className="grid gap-2 text-sm">
				Saved draft
				<input
					className="rounded-md border bg-background px-3 py-2"
					value={String(stepper.data.get("details") ?? "")}
					onChange={(event) => stepper.data.set("details", event.target.value)}
				/>
			</label>
			<button
				type="button"
				className={buttonClass}
				disabled={!stepper.canNext}
				onClick={() => void stepper.next({ complete: true })}
			>
				Complete details and advance
			</button>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={buttonClass}
					onClick={() => void reset()}
				>
					Reset everything
				</button>
				<button
					type="button"
					className={buttonClass}
					onClick={() => void reset({ keepData: true })}
				>
					Keep data
				</button>
				<button
					type="button"
					className={buttonClass}
					onClick={() => void reset({ keepCompleted: true })}
				>
					Keep completion
				</button>
				<button
					type="button"
					className={buttonClass}
					onClick={() => void reset({ keepData: true, keepCompleted: true })}
				>
					Keep both
				</button>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div>
					<h3 className="mb-2 text-sm font-medium">Before reset</h3>
					<section aria-label="Before reset">
						<pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
							{before}
						</pre>
					</section>
				</div>
				<div>
					<h3 className="mb-2 text-sm font-medium">Current state</h3>
					<section aria-label="After reset">
						<pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
							{snapshot}
						</pre>
					</section>
				</div>
			</div>
			<p className="text-sm text-muted-foreground">
				Reset restores the initial draft. It does not necessarily empty the
				data. Every option returns to the initial step.
			</p>
		</section>
	);
}
