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

/* Styling only. Stepperize does not depend on any of these classes. */
const primaryButton =
	"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
const eyebrow =
	"text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

const OPTIONS: { label: string; call: string; options?: ResetOptions }[] = [
	{ label: "Reset everything", call: "reset()" },
	{
		label: "Keep data",
		call: "reset({ keepData: true })",
		options: { keepData: true },
	},
	{
		label: "Keep completion",
		call: "reset({ keepCompleted: true })",
		options: { keepCompleted: true },
	},
	{
		label: "Keep both",
		call: "reset({ keepData, keepCompleted })",
		options: { keepData: true, keepCompleted: true },
	},
];

export function ResetDemo() {
	const stepper = flow.useStepper();
	const [before, setBefore] = useState(
		"Change the draft, complete a step, then choose a reset.",
	);
	const [lastCall, setLastCall] = useState<string | null>(null);
	const snapshot = JSON.stringify(
		{
			step: stepper.id,
			data: stepper.data.all(),
			completed: stepper.completed,
		},
		null,
		2,
	);
	async function reset(call: string, options?: ResetOptions) {
		setBefore(snapshot);
		setLastCall(call);
		await stepper.reset(options);
	}

	return (
		<section aria-label="Reset demo" className="space-y-5">
			<div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<div className="space-y-3">
					<p className={eyebrow}>1 · Change the flow</p>
					<label className="grid gap-1.5">
						<span className="text-[13px] font-medium">Saved draft</span>
						<input
							className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
							value={String(stepper.data.get("details") ?? "")}
							onChange={(event) =>
								stepper.data.set("details", event.target.value)
							}
						/>
					</label>
					<button
						type="button"
						className={primaryButton}
						disabled={!stepper.canNext}
						onClick={() => void stepper.next({ complete: true })}
					>
						Complete details and advance
					</button>
					<p className="text-xs text-muted-foreground">
						Now on{" "}
						<span className="font-mono text-foreground">{stepper.id}</span>
						{stepper.completed.length > 0 && (
							<>
								, completed{" "}
								<span className="font-mono text-foreground">
									{stepper.completed.join(", ")}
								</span>
							</>
						)}
					</p>
				</div>

				<div className="space-y-3">
					<p className={eyebrow}>2 · Pick what survives</p>
					<div className="grid grid-cols-2 gap-2">
						{OPTIONS.map((option) => (
							<button
								key={option.label}
								type="button"
								aria-label={option.label}
								onClick={() => void reset(option.call, option.options)}
								className={`flex min-h-16 flex-col items-start justify-between gap-1 rounded-lg border bg-background p-3 text-left shadow-xs transition-[border-color,background-color,transform] duration-150 hover:border-foreground/20 active:scale-[0.98] ${
									lastCall === option.call
										? "border-primary/50 bg-primary/[0.04]"
										: ""
								}`}
							>
								<span className="text-sm font-medium">{option.label}</span>
								<code className="font-mono text-[10.5px] leading-tight text-muted-foreground">
									{option.call}
								</code>
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
				<div className="min-w-0 rounded-xl border bg-background">
					<h3 className={`${eyebrow} border-b px-3 py-2`}>Before reset</h3>
					<section aria-label="Before reset">
						<pre className="overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
							{before}
						</pre>
					</section>
				</div>
				<div
					aria-hidden
					className="hidden items-center justify-center text-muted-foreground sm:flex"
				>
					→
				</div>
				<div className="min-w-0 rounded-xl border border-primary/30 bg-background">
					<h3 className={`${eyebrow} border-b px-3 py-2`}>
						Current state
						{lastCall && (
							<span className="normal-case tracking-normal">
								{" "}
								· after {lastCall}
							</span>
						)}
					</h3>
					<section aria-label="After reset">
						<pre className="overflow-auto p-3 font-mono text-xs leading-relaxed">
							{snapshot}
						</pre>
					</section>
				</div>
			</div>

			<p className="text-sm text-muted-foreground">
				Every option returns to the initial step. Reset restores the{" "}
				<em>initial</em> draft, which is not the same as clearing it.
			</p>
		</section>
	);
}
