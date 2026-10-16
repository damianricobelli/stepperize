"use client";

import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const flow = defineStepper(
	[{ id: "details" }, { id: "payment" }, { id: "review" }],
	{ linear: true },
);

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const eyebrow =
	"text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

export function PolicyDemo() {
	const [guardAllows, setGuardAllows] = useState(true);
	const [result, setResult] = useState("No request yet");
	const [guardCalls, setGuardCalls] = useState(0);
	const stepper = flow.useStepper({
		beforeStepChange: ({ direction }) => {
			if (direction === "reset") return true;
			setGuardCalls((count) => count + 1);
			return guardAllows;
		},
	});
	const accepted = result.includes('"accepted":true');
	const rejected = result.includes('"accepted":false');

	return (
		<section aria-label="Linear policy demo" className="space-y-5">
			<div className="rounded-xl border bg-muted/30 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className={eyebrow}>
						Flow with{" "}
						<code className="normal-case tracking-normal">linear: true</code>
					</p>
					<p
						role="status"
						className="font-mono text-[11px] text-muted-foreground"
					>
						Current: {stepper.id} · canGoTo("review"):{" "}
						{String(stepper.canGoTo("review"))}
					</p>
				</div>
				<ol className="mt-4 flex items-center" aria-label="Steps">
					{flow.steps.map(({ id }, index) => {
						const status = stepper.status(id);
						return (
							<li key={id} className="flex items-center not-last:flex-1">
								<span
									className={`rounded-full border px-2.5 py-1 font-mono text-xs transition-colors duration-200 ${
										status === "active"
											? "border-primary bg-primary text-primary-foreground"
											: status === "previous"
												? "border-primary/30 bg-primary/10 text-primary"
												: "bg-background text-muted-foreground"
									}`}
								>
									{id}
								</span>
								{index < flow.steps.length - 1 && (
									<span
										aria-hidden
										className={`mx-1.5 h-px flex-1 ${status === "previous" ? "bg-primary" : "bg-border"}`}
									/>
								)}
							</li>
						);
					})}
				</ol>
				<p className="mt-3 text-xs text-muted-foreground">
					Linear policy only allows the next step, so jumping from details
					straight to review is refused unless you bypass it.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-2 rounded-xl border bg-background p-3">
					<code className="font-mono text-xs text-muted-foreground">
						goTo("review")
					</code>
					<button
						type="button"
						className={button}
						disabled={stepper.isPending}
						onClick={async () =>
							setResult(JSON.stringify(await stepper.goTo("review")))
						}
					>
						Go to review
					</button>
					<p className="text-xs text-muted-foreground">
						Checked by the policy first. Refused here, so the guard never runs.
					</p>
				</div>
				<div className="flex flex-col gap-2 rounded-xl border bg-background p-3">
					<code className="font-mono text-xs text-muted-foreground">
						goTo("review", {"{ bypassPolicy: true }"})
					</code>
					<button
						type="button"
						className={button}
						disabled={stepper.isPending}
						onClick={async () =>
							setResult(
								JSON.stringify(
									await stepper.goTo("review", { bypassPolicy: true }),
								),
							)
						}
					>
						Bypass policy
					</button>
					<p className="text-xs text-muted-foreground">
						Skips the policy, but the guard still decides.
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
				<div className="flex flex-1 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
					<label htmlFor="policy-guard" className="text-sm font-medium">
						Guard allows navigation
					</label>
					<span className="relative inline-flex shrink-0">
						<input
							id="policy-guard"
							type="checkbox"
							role="switch"
							aria-checked={guardAllows}
							checked={guardAllows}
							onChange={(event) => setGuardAllows(event.target.checked)}
							className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-200 checked:bg-primary"
						/>
						<span
							aria-hidden
							className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4"
						/>
					</span>
				</div>
				<p className="flex items-center rounded-lg border bg-background px-3 py-2.5 text-sm">
					<span className="text-muted-foreground">Guard calls: </span>
					<span
						key={guardCalls}
						className="font-mono font-semibold tabular-nums"
					>
						{guardCalls}
					</span>
				</p>
				<button
					type="button"
					className={button}
					disabled={stepper.isPending}
					onClick={async () => {
						await stepper.reset();
						setGuardCalls(0);
						setResult("No request yet");
					}}
				>
					Reset demo
				</button>
			</div>

			<p
				role="status"
				aria-label="Policy result"
				className={`rounded-lg px-3 py-2.5 font-mono text-xs break-all ${
					accepted
						? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
						: rejected
							? "bg-red-500/10 text-red-600 dark:text-red-300"
							: "bg-muted text-muted-foreground"
				}`}
			>
				{result}
			</p>
		</section>
	);
}
