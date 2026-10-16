"use client";

import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const flow = defineStepper([
	{ id: "details" },
	{ id: "review" },
	{ id: "done" },
]);
type StepId = (typeof flow.steps)[number]["id"];

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const primaryButton =
	"inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const eyebrow =
	"text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

export function ControlledDemo() {
	const [step, setStep] = useState<StepId>("details");
	const [applyChanges, setApplyChanges] = useState(true);
	const [guardAllows, setGuardAllows] = useState(true);
	const [requested, setRequested] = useState("None");
	const [result, setResult] = useState("No request yet");
	const stepper = flow.useStepper({
		step,
		beforeStepChange: () => guardAllows,
		onStepChange: (id) => {
			setRequested(id);
			if (applyChanges) setStep(id);
		},
	});
	const accepted = result.includes('"accepted":true');
	const rejected = result.includes('"accepted":false');

	return (
		<section aria-label="Controlled state demo" className="space-y-5">
			<div className="grid gap-3 md:grid-cols-2">
				{/* The owner: your component holds `step`. */}
				<div className="space-y-3 rounded-xl border bg-background p-4">
					<div>
						<p className={eyebrow}>Your component</p>
						<p className="mt-1 text-sm">
							Owns <code className="font-mono text-[0.9em]">step</code> in React
							state.
						</p>
					</div>
					<label className="grid gap-1.5">
						<span className="text-[13px] font-medium">External step</span>
						<select
							className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
							value={step}
							onChange={(event) => {
								const id = flow.parseStep(event.target.value);
								if (id) setStep(id);
							}}
						>
							{flow.steps.map(({ id }) => (
								<option key={id} value={id}>
									{id}
								</option>
							))}
						</select>
					</label>
					<Toggle
						id="controlled-apply"
						label="Apply onStepChange requests"
						hint="Off: requests arrive, the prop never changes."
						checked={applyChanges}
						onChange={setApplyChanges}
					/>
				</div>

				{/* Stepperize: it asks, it never assumes. */}
				<div className="space-y-3 rounded-xl border bg-muted/30 p-4">
					<div>
						<p className={eyebrow}>Stepperize</p>
						<p className="mt-1 text-sm">
							Runs the guard, then <em>requests</em> the move.
						</p>
					</div>
					<ol className="flex items-center" aria-label="Rendered flow">
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
					<Toggle
						id="controlled-guard"
						label="Guard allows navigation"
						hint="Off: beforeStepChange returns false."
						checked={guardAllows}
						onChange={setGuardAllows}
					/>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={button}
							disabled={!stepper.canPrev}
							onClick={async () =>
								setResult(JSON.stringify(await stepper.prev()))
							}
						>
							Back
						</button>
						<button
							type="button"
							className={primaryButton}
							disabled={!stepper.canNext}
							onClick={async () =>
								setResult(JSON.stringify(await stepper.next()))
							}
						>
							Next
						</button>
						<button
							type="button"
							className={`${button} ml-auto border-transparent shadow-none`}
							onClick={() => {
								setStep("details");
								setApplyChanges(true);
								setGuardAllows(true);
								setRequested("None");
								setResult("No request yet");
							}}
						>
							Reset demo
						</button>
					</div>
				</div>
			</div>

			<div
				role="status"
				className="grid gap-px overflow-hidden rounded-xl border bg-border text-sm sm:grid-cols-[auto_auto_1fr]"
			>
				<p className="bg-background px-3 py-2.5">
					<span className="text-muted-foreground">Rendered step: </span>
					<span className="font-mono">{stepper.id}</span>
				</p>
				<p className="bg-background px-3 py-2.5">
					<span className="text-muted-foreground">Last requested step: </span>
					<span className="font-mono">{requested}</span>
				</p>
				<p className="bg-background px-3 py-2.5 break-all">
					<span className="text-muted-foreground">Result: </span>
					<span
						className={`font-mono text-xs ${
							accepted
								? "text-emerald-700 dark:text-emerald-300"
								: rejected
									? "text-red-600 dark:text-red-300"
									: ""
						}`}
					>
						{result}
					</span>
				</p>
			</div>
			<p className="text-sm text-muted-foreground">
				An accepted request still needs the owner to update its prop. The
				external control updates that prop directly and does not run the guard.
			</p>
		</section>
	);
}

function Toggle({
	id,
	label,
	hint,
	checked,
	onChange,
}: {
	id: string;
	label: string;
	hint: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
			<div>
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
				<p className="text-xs text-muted-foreground">{hint}</p>
			</div>
			<span className="relative inline-flex shrink-0">
				<input
					id={id}
					type="checkbox"
					role="switch"
					aria-checked={checked}
					checked={checked}
					onChange={(event) => onChange(event.target.checked)}
					className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-200 checked:bg-primary"
				/>
				<span
					aria-hidden
					className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4"
				/>
			</span>
		</div>
	);
}
