"use client";

import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const checkout = defineStepper(
	[
		{
			id: "details",
			title: "Details",
			schema: {
				"~standard": {
					version: 1 as const,
					vendor: "demo",
					validate: (value: unknown) =>
						typeof value === "string" && value.trim().length >= 3
							? { value }
							: { issues: [{ message: "Enter at least 3 characters." }] },
				},
			},
		},
		{ id: "review", title: "Review" },
	],
	{ defaultData: { details: "Original draft" } },
);
const buttonClass =
	"rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40";

// The timer only simulates server latency. Stepperize owns the transition.
function delay(signal: AbortSignal) {
	return new Promise<void>((resolve) => {
		if (signal.aborted) return resolve();
		const finish = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", finish);
			resolve();
		};
		const timer = setTimeout(finish, 800);
		signal.addEventListener("abort", finish, { once: true });
	});
}

export function LifecycleViz() {
	const [draft, setDraft] = useState("Ada");
	const [reject, setReject] = useState(false);
	const [events, setEvents] = useState<string[]>([]);
	const [outcome, setOutcome] = useState("No request yet");
	const record = (event: string) =>
		setEvents((previous) => [...previous.slice(-7), event]);
	const stepper = checkout.useStepper({
		beforeStepChange: async ({ direction, data, validate, signal }) => {
			if (direction === "reset") return true;
			record(`Guard received staged data: ${JSON.stringify(data.details)}`);
			await delay(signal);
			if (signal.aborted) return false;
			const result = await validate();
			const allowed = result.success && !reject;
			record(
				allowed
					? "Guard accepted"
					: "Guard rejected: invalid name or rejection enabled",
			);
			return allowed;
		},
		onStepChange: (id) => record(`onStepChange: ${id}`),
	});

	async function move() {
		try {
			const result = await stepper.next({ data: draft, complete: true });
			setOutcome(JSON.stringify(result));
			record(`Result: ${JSON.stringify(result)}`);
		} catch (error) {
			setOutcome(error instanceof Error ? error.message : "Unexpected error");
		}
	}

	return (
		<section
			aria-label="Navigation lifecycle demo"
			className="not-prose my-6 space-y-4 rounded-xl border bg-card p-5"
		>
			<label className="grid gap-2 text-sm">
				Draft name
				<input
					className="rounded-md border bg-background px-3 py-2"
					value={draft}
					disabled={stepper.id !== "details" || stepper.isPending}
					onChange={(event) => setDraft(event.target.value)}
				/>
			</label>
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={reject}
					disabled={stepper.isPending}
					onChange={(event) => setReject(event.target.checked)}
				/>{" "}
				Reject in guard
			</label>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.canNext}
					onClick={() => void move()}
				>
					{stepper.isPending ? "Validating…" : "Save and continue"}
				</button>
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.isPending}
					onClick={() => void move()}
				>
					Try duplicate request
				</button>
				<button
					type="button"
					className={buttonClass}
					disabled={!stepper.isPending}
					onClick={() => {
						stepper.data.set("details", "External edit");
						record("Immediate external write cancelled the pending move");
					}}
				>
					Write data while pending
				</button>
				<button
					type="button"
					className={buttonClass}
					disabled={stepper.isPending}
					onClick={async () => {
						await stepper.reset();
						setOutcome("Reset to mount-time defaults");
						setEvents([]);
					}}
				>
					Reset demo
				</button>
			</div>
			<p role="status">
				Current: {stepper.id} · Pending: {String(stepper.isPending)}
			</p>
			<section aria-label="Committed state">
				<pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
					{JSON.stringify(
						{ data: stepper.data.all(), completed: stepper.completed },
						null,
						2,
					)}
				</pre>
			</section>
			<p
				role="status"
				className="break-all text-sm"
				aria-label="Navigation result"
			>
				{outcome}
			</p>
			<pre
				role="log"
				aria-label="Navigation events"
				className="whitespace-pre-wrap rounded-lg border p-3 text-xs"
			>
				{events.join("\n") || "Events will appear here."}
			</pre>
		</section>
	);
}
