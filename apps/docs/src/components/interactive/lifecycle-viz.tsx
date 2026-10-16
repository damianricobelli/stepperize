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

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const primaryButton =
	"inline-flex h-9 min-w-36 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";
const eyebrow =
	"text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

/** The five phases every next/prev/goTo/reset goes through. */
const PHASES = [
	{
		id: "eligibility",
		label: "Eligibility",
		hint: "Not pending, in bounds, allowed",
	},
	{ id: "stage", label: "Stage", hint: "data + complete held aside" },
	{ id: "guard", label: "Guard", hint: "beforeStepChange sees staged data" },
	{ id: "commit", label: "Commit", hint: "step, data, completion together" },
	{ id: "notify", label: "Notify", hint: "onStepChange, then next() resolves" },
] as const;
type PhaseId = (typeof PHASES)[number]["id"];
type PhaseState = "idle" | "active" | "done" | "failed" | "skipped";
type Trace = Record<PhaseId, PhaseState>;

const IDLE: Trace = {
	eligibility: "idle",
	stage: "idle",
	guard: "idle",
	commit: "idle",
	notify: "idle",
};

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
	const [trace, setTrace] = useState<Trace>(IDLE);
	const record = (event: string) =>
		setEvents((previous) => [...previous.slice(-7), event]);
	const mark = (patch: Partial<Trace>) =>
		setTrace((previous) => ({ ...previous, ...patch }));

	const stepper = checkout.useStepper({
		beforeStepChange: async ({ direction, data, validate, signal }) => {
			if (direction === "reset") return true;
			mark({ eligibility: "done", stage: "done", guard: "active" });
			record(`Guard received staged data: ${JSON.stringify(data.details)}`);
			await delay(signal);
			if (signal.aborted) return false;
			const result = await validate();
			const allowed = result.success && !reject;
			mark({ guard: allowed ? "done" : "failed" });
			record(
				allowed
					? "Guard accepted"
					: "Guard rejected: invalid name or rejection enabled",
			);
			return allowed;
		},
		onStepChange: (id) => {
			mark({ commit: "done", notify: "done" });
			record(`onStepChange: ${id}`);
		},
	});

	async function move() {
		// A second request while one is pending is refused at eligibility;
		// keep showing the transition that is actually running.
		if (!stepper.isPending) setTrace({ ...IDLE, eligibility: "active" });
		try {
			const result = await stepper.next({ data: draft, complete: true });
			setOutcome(JSON.stringify(result));
			record(`Result: ${JSON.stringify(result)}`);
			if (!result.accepted && result.reason !== "pending") {
				setTrace((previous) => ({
					...previous,
					eligibility:
						previous.eligibility === "active" ? "failed" : previous.eligibility,
					guard: result.reason === "cancelled" ? "failed" : previous.guard,
					commit: "skipped",
					notify: "skipped",
				}));
			}
		} catch (error) {
			setOutcome(error instanceof Error ? error.message : "Unexpected error");
		}
	}

	const accepted = outcome.includes('"accepted":true');
	const rejected = outcome.includes('"accepted":false');

	return (
		<section
			aria-label="Navigation lifecycle demo"
			className="@container space-y-5"
		>
			<div className="grid gap-5 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				{/* Inputs: what the user does. */}
				<div className="space-y-4">
					<label className="grid gap-1.5">
						<span className="text-[13px] font-medium">Draft name</span>
						<input
							className="h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:ring-3 focus:ring-primary/15 disabled:opacity-50"
							value={draft}
							disabled={stepper.id !== "details" || stepper.isPending}
							onChange={(event) => setDraft(event.target.value)}
						/>
					</label>
					<p className="-mt-2 text-xs text-muted-foreground">
						The schema needs at least 3 characters.
					</p>

					<div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
						<div>
							<label htmlFor="lifecycle-reject" className="text-sm font-medium">
								Reject in guard
							</label>
							<p className="text-xs text-muted-foreground">
								Return false even when the data is valid.
							</p>
						</div>
						<span className="relative inline-flex shrink-0">
							<input
								id="lifecycle-reject"
								type="checkbox"
								role="switch"
								aria-checked={reject}
								checked={reject}
								disabled={stepper.isPending}
								onChange={(event) => setReject(event.target.checked)}
								className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-200 checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
							/>
							<span
								aria-hidden
								className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4"
							/>
						</span>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={primaryButton}
							disabled={!stepper.canNext}
							onClick={() => void move()}
						>
							{stepper.isPending ? "Validating…" : "Save and continue"}
						</button>
						<button
							type="button"
							className={button}
							disabled={stepper.isPending}
							onClick={async () => {
								await stepper.reset();
								setOutcome("Reset to mount-time defaults");
								setEvents([]);
								setTrace(IDLE);
							}}
						>
							Reset demo
						</button>
					</div>

					<div className="rounded-lg border border-dashed p-3">
						<p className={eyebrow}>While it is pending</p>
						<div className="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								className={button}
								disabled={!stepper.isPending}
								onClick={() => void move()}
							>
								Try duplicate request
							</button>
							<button
								type="button"
								className={button}
								disabled={!stepper.isPending}
								onClick={() => {
									stepper.data.set("details", "External edit");
									record("Immediate external write cancelled the pending move");
								}}
							>
								Write data while pending
							</button>
						</div>
					</div>
				</div>

				{/* The transition: what Stepperize does with it. */}
				<div className="rounded-xl border bg-muted/30 p-4">
					<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
						<p className={`${eyebrow} whitespace-nowrap`}>The transition</p>
						<p
							role="status"
							className="font-mono text-[11px] text-muted-foreground"
						>
							Current: {stepper.id} · Pending: {String(stepper.isPending)}
						</p>
					</div>
					<ol className="mt-3 space-y-1">
						{PHASES.map((phase, index) => (
							<PhaseRow
								key={phase.id}
								index={index}
								label={phase.label}
								hint={phase.hint}
								state={trace[phase.id]}
							/>
						))}
					</ol>
				</div>
			</div>

			<div className="grid gap-3 @xl:grid-cols-2">
				<div className="min-w-0 rounded-xl border bg-background">
					<p className={`${eyebrow} border-b px-3 py-2`}>Committed state</p>
					<section aria-label="Committed state">
						<pre className="overflow-auto p-3 font-mono text-xs leading-relaxed">
							<JsonText
								value={{
									data: stepper.data.all(),
									completed: stepper.completed,
								}}
							/>
						</pre>
					</section>
				</div>
				<div className="flex min-w-0 flex-col rounded-xl border bg-background">
					<p className={`${eyebrow} border-b px-3 py-2`}>Last result</p>
					<p
						role="status"
						aria-label="Navigation result"
						className={`m-3 rounded-lg px-2.5 py-2 font-mono text-xs break-all ${
							accepted
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: rejected
									? "bg-red-500/10 text-red-600 dark:text-red-300"
									: "bg-muted text-muted-foreground"
						}`}
					>
						{outcome}
					</p>
					<ol
						role="log"
						aria-label="Navigation events"
						className="mx-3 mb-3 max-h-36 space-y-1 overflow-auto font-mono text-[11px] text-muted-foreground"
					>
						{events.length === 0 ? (
							<li>Events will appear here.</li>
						) : (
							events.map((event, index) => (
								<li key={index} className="flex gap-2">
									<span className="text-foreground/30 tabular-nums">
										{String(index + 1).padStart(2, "0")}
									</span>
									<span className="break-all">{event}</span>
								</li>
							))
						)}
					</ol>
				</div>
			</div>
		</section>
	);
}

const PHASE_STYLE: Record<PhaseState, { dot: string; text: string }> = {
	idle: {
		dot: "border-foreground/20 bg-card text-foreground/75",
		text: "text-foreground/80",
	},
	active: {
		dot: "border-primary bg-primary/10 text-primary",
		text: "text-foreground",
	},
	done: {
		dot: "border-emerald-500 bg-emerald-500 text-white",
		text: "text-foreground",
	},
	failed: {
		dot: "border-red-500 bg-red-500 text-white",
		text: "text-foreground",
	},
	skipped: {
		dot: "border-dashed border-border bg-background text-muted-foreground",
		text: "text-muted-foreground line-through decoration-foreground/20",
	},
};

/** Drawn icons, not text glyphs: "✓" renders at a different size and baseline in every font. */
const PATHS: Partial<Record<PhaseState, string>> = {
	done: "M4 8.5l2.5 2.5L12 5.5",
	failed: "M5 5l6 6M11 5l-6 6",
	skipped: "M4.5 8h7",
};

function PhaseIcon({ state, index }: { state: PhaseState; index: number }) {
	if (state === "active") {
		return (
			<svg
				viewBox="0 0 16 16"
				className="block size-3.5 motion-safe:animate-spin"
				aria-hidden
			>
				<circle
					cx="8"
					cy="8"
					r="6"
					fill="none"
					stroke="currentColor"
					strokeOpacity="0.25"
					strokeWidth="2"
				/>
				<path
					d="M14 8a6 6 0 0 0-6-6"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</svg>
		);
	}
	const path = PATHS[state];
	// leading-none: the docs body line-height would otherwise push the digit off-center.
	if (!path)
		return (
			<span className="block text-[11px] leading-none font-semibold tabular-nums">
				{index + 1}
			</span>
		);
	return (
		<svg viewBox="0 0 16 16" className="block size-3.5" aria-hidden>
			<path
				d={path}
				fill="none"
				stroke="currentColor"
				strokeWidth="2.25"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function PhaseRow({
	index,
	label,
	hint,
	state,
}: {
	index: number;
	label: string;
	hint: string;
	state: PhaseState;
}) {
	const style = PHASE_STYLE[state];
	return (
		<li
			className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-200 ${
				state === "active" ? "bg-primary/[0.06]" : ""
			}`}
		>
			<span
				className={`grid size-6 shrink-0 place-items-center rounded-full border leading-none transition-colors duration-200 ${style.dot}`}
			>
				<PhaseIcon state={state} index={index} />
			</span>
			<span className="min-w-0">
				<span className={`block text-sm font-medium ${style.text}`}>
					{label}
				</span>
				<span className="block truncate text-xs text-muted-foreground">
					{hint}
				</span>
			</span>
		</li>
	);
}

/** Pretty JSON with light token colors. The text stays exactly JSON.stringify. */
function JsonText({ value }: { value: unknown }) {
	const json = JSON.stringify(value, null, 2);
	const parts = json.split(/("(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*")/g);
	return (
		<>
			{parts.map((part, index) => {
				if (!part.startsWith('"')) return part;
				const isKey = /^\s*:/.test(parts[index + 1] ?? "");
				return (
					<span
						key={index}
						className={
							isKey
								? "text-sky-700 dark:text-sky-300"
								: "text-emerald-700 dark:text-emerald-300"
						}
					>
						{part}
					</span>
				);
			})}
		</>
	);
}
