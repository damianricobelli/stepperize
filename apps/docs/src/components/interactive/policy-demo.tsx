"use client";

import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const flow = defineStepper(
	[{ id: "details" }, { id: "payment" }, { id: "review" }],
	{ linear: true },
);
const buttonClass =
	"rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40";

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
	return (
		<section
			aria-label="Linear policy demo"
			className="not-prose my-6 space-y-4 rounded-xl border bg-card p-5"
		>
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={guardAllows}
					onChange={(event) => setGuardAllows(event.target.checked)}
				/>
				Guard allows navigation
			</label>
			<p role="status">
				Current: {stepper.id} · canGoTo("review"):{" "}
				{String(stepper.canGoTo("review"))}
			</p>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={buttonClass}
					disabled={stepper.isPending}
					onClick={async () =>
						setResult(JSON.stringify(await stepper.goTo("review")))
					}
				>
					Go to review
				</button>
				<button
					type="button"
					className={buttonClass}
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
				<button
					type="button"
					className={buttonClass}
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
			<p role="status" className="break-all text-sm" aria-label="Policy result">
				{result}
			</p>
			<p className="text-sm">Guard calls: {guardCalls}</p>
			<p className="text-sm text-muted-foreground">
				The first button intentionally stays enabled so you can inspect a policy
				rejection. Bypassing policy still runs the guard.
			</p>
		</section>
	);
}
