"use client";

import { defineStepper } from "@stepperize/react";

const flow = defineStepper([{ id: "details" }, { id: "review" }], {
	defaultData: { details: "Ada" },
});
const buttonClass =
	"rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40";

export function SelectorsDemo() {
	return (
		<flow.Provider>
			<section
				aria-label="Context selectors demo"
				className="not-prose my-6 space-y-4 rounded-xl border bg-card p-5"
			>
				<style>{`@keyframes stepperize-selection-flash { from { background-color: var(--color-primary); color: var(--color-primary-foreground); } }
          @media (prefers-reduced-motion: no-preference) { .stepperize-selection-flash { animation: stepperize-selection-flash 900ms ease-out; } }`}</style>
				<div className="grid gap-3 sm:grid-cols-3">
					<StepSelection />
					<DataSelection />
					<CompletionSelection />
				</div>
				<Controls />
				<p className="text-sm text-muted-foreground">
					Each card subscribes to one value. It highlights on mount and when
					that value changes. This shows selected value changes, not React
					render counts.
				</p>
			</section>
		</flow.Provider>
	);
}

function Card({ label, value }: { label: string; value: string }) {
	return (
		<section aria-label={label} className="rounded-lg border p-3">
			<h3 className="mb-2 text-xs font-medium text-muted-foreground">
				{label}
			</h3>
			<p
				key={value}
				className="stepperize-selection-flash break-words rounded-md bg-muted px-2 py-3 text-sm"
				aria-live="polite"
			>
				{value}
			</p>
		</section>
	);
}
function StepSelection() {
	const id = flow.useStepperContext((stepper) => stepper.id);
	return <Card label="Step subscriber" value={id} />;
}
function DataSelection() {
	const name = flow.useStepperContext((stepper) =>
		String(stepper.data.get("details") ?? ""),
	);
	return <Card label="Data subscriber" value={name || "Empty"} />;
}
function CompletionSelection() {
	const completed = flow.useStepperContext((stepper) =>
		stepper.isComplete("details"),
	);
	return (
		<Card
			label="Completion subscriber"
			value={completed ? "Complete" : "Incomplete"}
		/>
	);
}
function Controls() {
	const stepper = flow.useStepperContext();
	return (
		<div className="space-y-3">
			<label className="grid gap-2 text-sm">
				Name in details
				<input
					className="rounded-md border bg-background px-3 py-2"
					value={String(stepper.data.get("details") ?? "")}
					onChange={(event) => stepper.data.set("details", event.target.value)}
				/>
			</label>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.canPrev}
					onClick={() => void stepper.prev()}
				>
					Back
				</button>
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.canNext}
					onClick={() => void stepper.next()}
				>
					Next
				</button>
				<button
					type="button"
					className={buttonClass}
					onClick={() =>
						stepper.setComplete("details", !stepper.isComplete("details"))
					}
				>
					Toggle details completion
				</button>
				<button
					type="button"
					className={buttonClass}
					onClick={() => void stepper.reset()}
				>
					Reset demo
				</button>
			</div>
		</div>
	);
}
