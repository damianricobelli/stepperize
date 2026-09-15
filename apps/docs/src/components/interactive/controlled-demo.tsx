"use client";

import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const flow = defineStepper([
	{ id: "details" },
	{ id: "review" },
	{ id: "done" },
]);
type StepId = (typeof flow.steps)[number]["id"];
const buttonClass =
	"rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40";

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
	return (
		<section
			aria-label="Controlled state demo"
			className="not-prose my-6 space-y-4 rounded-xl border bg-card p-5"
		>
			<label className="grid gap-2 text-sm">
				External step
				<select
					className="rounded-md border bg-background px-3 py-2"
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
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={applyChanges}
					onChange={(event) => setApplyChanges(event.target.checked)}
				/>
				Apply onStepChange requests
			</label>
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={guardAllows}
					onChange={(event) => setGuardAllows(event.target.checked)}
				/>
				Guard allows navigation
			</label>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.canPrev}
					onClick={async () => setResult(JSON.stringify(await stepper.prev()))}
				>
					Back
				</button>
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.canNext}
					onClick={async () => setResult(JSON.stringify(await stepper.next()))}
				>
					Next
				</button>
				<button
					type="button"
					className={buttonClass}
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
			<div role="status" className="space-y-2 rounded-lg bg-muted p-3 text-sm">
				<p>Rendered step: {stepper.id}</p>
				<p>Last requested step: {requested}</p>
				<p className="break-all">Result: {result}</p>
			</div>
			<p className="text-sm text-muted-foreground">
				An accepted request still needs the owner to update its prop. The
				external control updates that prop directly and does not run the guard.
			</p>
		</section>
	);
}
