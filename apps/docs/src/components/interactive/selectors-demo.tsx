"use client";

import { defineStepper } from "@stepperize/react";

const flow = defineStepper([{ id: "details" }, { id: "review" }], {
	defaultData: { details: "Ada" },
});

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const primaryButton =
	"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

export function SelectorsDemo() {
	return (
		<flow.Provider>
			<section aria-label="Context selectors demo" className="space-y-5">
				{/* A value flashes when it is (re)mounted, i.e. when its selection changed. */}
				<style>{`@keyframes stepperize-selection-flash { from { background-color: color-mix(in oklch, var(--color-primary) 22%, transparent); box-shadow: 0 0 0 1px var(--color-primary); } }
          @media (prefers-reduced-motion: no-preference) { .stepperize-selection-flash { animation: stepperize-selection-flash 900ms cubic-bezier(0.23, 1, 0.32, 1); } }`}</style>
				<div className="grid gap-3 sm:grid-cols-3">
					<StepSelection />
					<DataSelection />
					<CompletionSelection />
				</div>
				<Controls />
				<p className="text-sm text-muted-foreground">
					Each card subscribes to one value and flashes only when that value
					changes. Type a name: only the data card reacts. This shows selected
					value changes, not React render counts.
				</p>
			</section>
		</flow.Provider>
	);
}

function Card({
	label,
	selector,
	value,
}: {
	label: string;
	selector: string;
	value: string;
}) {
	return (
		<section aria-label={label} className="rounded-xl border bg-background p-3">
			<h3 className="text-[13px] font-medium">{label}</h3>
			<code className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
				{selector}
			</code>
			<p
				key={value}
				className="stepperize-selection-flash mt-3 break-words rounded-lg bg-muted px-3 py-2.5 font-mono text-sm"
				aria-live="polite"
			>
				{value}
			</p>
		</section>
	);
}
function StepSelection() {
	const id = flow.useStepperContext((stepper) => stepper.id);
	return <Card label="Step subscriber" selector="(s) => s.id" value={id} />;
}
function DataSelection() {
	const name = flow.useStepperContext((stepper) =>
		String(stepper.data.get("details") ?? ""),
	);
	return (
		<Card
			label="Data subscriber"
			selector={`(s) => s.data.get("details")`}
			value={name || "Empty"}
		/>
	);
}
function CompletionSelection() {
	const completed = flow.useStepperContext((stepper) =>
		stepper.isComplete("details"),
	);
	return (
		<Card
			label="Completion subscriber"
			selector={`(s) => s.isComplete("details")`}
			value={completed ? "Complete" : "Incomplete"}
		/>
	);
}
function Controls() {
	const stepper = flow.useStepperContext();
	return (
		<div className="space-y-3 rounded-xl border border-dashed p-3">
			<label className="grid gap-1.5">
				<span className="text-[13px] font-medium">Name in details</span>
				<input
					className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
					value={String(stepper.data.get("details") ?? "")}
					onChange={(event) => stepper.data.set("details", event.target.value)}
				/>
			</label>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={button}
					disabled={!stepper.canPrev}
					onClick={() => void stepper.prev()}
				>
					Back
				</button>
				<button
					type="button"
					className={primaryButton}
					disabled={!stepper.canNext}
					onClick={() => void stepper.next()}
				>
					Next
				</button>
				<button
					type="button"
					className={button}
					onClick={() =>
						stepper.setComplete("details", !stepper.isComplete("details"))
					}
				>
					Toggle details completion
				</button>
				<button
					type="button"
					className={`${button} border-transparent shadow-none`}
					onClick={() => void stepper.reset()}
				>
					Reset demo
				</button>
			</div>
		</div>
	);
}
