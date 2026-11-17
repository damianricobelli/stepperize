import { defineStepper } from "@stepperize/react";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const wizard = defineStepper([
	{ id: "workspace", title: "Workspace" },
	{ id: "details", title: "Details" },
	{ id: "review", title: "Review" },
	{ id: "done", title: "Done" },
] as const);

const { Stepper, useStepperContext } = wizard;

type StepId = (typeof wizard.steps)[number]["id"];
type Snapshot = ReturnType<ReturnType<typeof wizard.useStepper>["snapshot"]>;
type Workspace = { name?: string };
type Details = { industry?: string; teamSize?: string };

const STEP_IDS = wizard.steps.map((s) => s.id) as StepId[];
const KEY = "stepperize:save-resume";

// A snapshot is everything the flow needs to resume: the step, the path taken,
// the data of every step and which ones are complete. It is plain JSON.
function load(): Partial<Snapshot> | null {
	if (typeof window === "undefined") return null;
	const hash = new URLSearchParams(window.location.hash.slice(1)).get("sr");
	const fromHash = STEP_IDS.find((id) => id === hash);
	let saved: Partial<Snapshot> | null = null;
	try {
		const raw = window.localStorage.getItem(KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		if (parsed && typeof parsed === "object") saved = parsed;
	} catch {
		/* storage unavailable or corrupted */
	}
	if (!saved && !fromHash) return null;
	// The URL wins over storage for *where* to resume.
	return fromHash ? { ...saved, step: fromHash } : saved;
}

function save(snapshot: Snapshot) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(snapshot));
		window.history.replaceState(null, "", `#sr=${snapshot.step}`);
	} catch {
		/* storage unavailable */
	}
}

function clear() {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(KEY);
		window.history.replaceState(
			null,
			"",
			window.location.pathname + window.location.search,
		);
	} catch {
		/* storage unavailable */
	}
}

/**
 * Persistence: `onChange` hands over a snapshot after every move and every
 * keystroke, which is written to localStorage and the URL hash. On mount,
 * `restore()` applies the saved snapshot, so a refresh resumes from the same
 * step with the same data.
 */
export function SaveResumeBlock() {
	return (
		<Stepper.Root
			onChange={save}
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			<Flow />
		</Stepper.Root>
	);
}

function Flow() {
	const stepper = useStepperContext();
	const [resumed, setResumed] = useState(false);
	const workspace = (stepper.data.workspace ?? {}) as Workspace;
	const details = (stepper.data.details ?? {}) as Details;

	// Hydrate from storage after mount (avoids an SSR/client mismatch).
	useEffect(() => {
		const saved = load();
		if (!saved) return;
		stepper.restore(saved);
		const name = (saved.data?.workspace as Workspace | undefined)?.name;
		if ((saved.step && saved.step !== "workspace") || name) setResumed(true);
	}, []);

	const reset = () => {
		stepper.reset();
		// `reset()` reports the fresh snapshot through `onChange`: clear it after.
		clear();
		setResumed(false);
	};

	return (
		<>
			<div className="mb-4 flex items-center justify-between">
				<Crumbs current={stepper.current.id} />
				<Button variant="outline" size="sm" onClick={reset}>
					<RotateCcw /> Reset
				</Button>
			</div>

			{resumed && (
				<Alert className="mb-3">
					<AlertDescription>
						Resumed from where you left off — try refreshing the page.
					</AlertDescription>
				</Alert>
			)}

			<div className="min-h-32">
				<Stepper.Content step="workspace" className="space-y-3">
					<p className="text-sm font-semibold">Name your workspace</p>
					<Input
						value={workspace.name ?? ""}
						onChange={(event) =>
							stepper.setData("workspace", { name: event.target.value })
						}
						aria-label="Workspace name"
						placeholder="Acme Inc."
					/>
					<p className="text-xs text-muted-foreground">
						Saved as you type — reload and it's still here.
					</p>
				</Stepper.Content>

				<Stepper.Content step="details" className="space-y-3">
					<p className="text-sm font-semibold">A few details</p>
					<Input
						aria-label="Industry"
						placeholder="Industry"
						value={details.industry ?? ""}
						onChange={(event) =>
							stepper.setData("details", {
								...details,
								industry: event.target.value,
							})
						}
					/>
					<Input
						aria-label="Team size"
						placeholder="Team size"
						value={details.teamSize ?? ""}
						onChange={(event) =>
							stepper.setData("details", {
								...details,
								teamSize: event.target.value,
							})
						}
					/>
				</Stepper.Content>

				<Stepper.Content step="review" className="space-y-2 text-sm">
					<p className="font-semibold">Review</p>
					<div className="rounded-lg border bg-muted/30 p-3">
						<p>
							Workspace:{" "}
							<span className="font-medium">{workspace.name || "—"}</span>
						</p>
						<p>Industry: {details.industry || "—"}</p>
						<p>Team size: {details.teamSize || "—"}</p>
					</div>
				</Stepper.Content>

				<Stepper.Content
					step="done"
					className="grid place-items-center gap-2 py-6 text-center"
				>
					<span className="grid size-12 place-items-center rounded-full bg-chart-2/15 text-chart-2">
						<Check className="size-6" />
					</span>
					<p className="text-sm font-medium">Workspace created</p>
				</Stepper.Content>
			</div>

			<Footer />
		</>
	);
}

function Crumbs({ current }: { current: StepId }) {
	const index = STEP_IDS.indexOf(current);
	return (
		<div className="flex items-center gap-1.5">
			{STEP_IDS.map((id, i) => (
				<span
					key={id}
					className={`size-1.5 rounded-full transition-colors ${i <= index ? "bg-primary" : "bg-muted"}`}
				/>
			))}
			<span className="ml-1 text-xs font-medium text-muted-foreground">
				#sr={current}
			</span>
		</div>
	);
}

function Footer() {
	const stepper = useStepperContext();
	if (stepper.current.id === "done") return null;
	return (
		<div className="mt-5 flex justify-between">
			<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
				Back
			</Stepper.Prev>
			<Stepper.Next className={buttonVariants()}>
				{stepper.current.id === "review" ? "Create" : "Continue"}
			</Stepper.Next>
		</div>
	);
}
