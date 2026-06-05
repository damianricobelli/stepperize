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

const { Stepper, useStepper } = wizard;

type StepId = (typeof wizard.steps)[number]["id"];
const STEP_IDS = wizard.steps.map((s) => s.id) as StepId[];

const KEY = "stepperize:save-resume";

type Saved = { step: StepId; name: string };

// localStorage + URL are the source of truth for *where the user left off*.
// The stepper runs in controlled mode, so this external state drives it.
function load(): Saved | null {
	if (typeof window === "undefined") return null;
	const fromHash = new URLSearchParams(window.location.hash.slice(1)).get(
		"sr",
	) as StepId | null;
	try {
		const raw = window.localStorage.getItem(KEY);
		const saved = raw ? (JSON.parse(raw) as Saved) : null;
		const step =
			fromHash && STEP_IDS.includes(fromHash) ? fromHash : saved?.step;
		if (!step) return null;
		return { step, name: saved?.name ?? "" };
	} catch {
		return null;
	}
}

function save(data: Saved) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(data));
		window.history.replaceState(null, "", `#sr=${data.step}`);
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
 * Controlled mode + persistence: the active step lives in React state that is
 * synced to localStorage and the URL hash. `step` drives the stepper and
 * `onStepChange` writes every move back out, so a refresh resumes from the
 * persisted step.
 */
export function SaveResumeBlock() {
	const [step, setStep] = useState<StepId>("workspace");
	const [name, setName] = useState("");
	const [resumed, setResumed] = useState(false);

	// Hydrate from storage after mount (avoids SSR/client mismatch).
	useEffect(() => {
		const saved = load();
		if (saved) {
			setStep(saved.step);
			setName(saved.name);
			if (saved.step !== "workspace" || saved.name) setResumed(true);
		}
	}, []);

	const persist = (next: Partial<Saved>) => {
		const data: Saved = { step, name, ...next };
		save(data);
	};

	const reset = () => {
		clear();
		setStep("workspace");
		setName("");
		setResumed(false);
	};

	return (
		<Stepper.Root
			step={step}
			onStepChange={(id) => {
				setStep(id);
				persist({ step: id });
			}}
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{() => (
				<>
					<div className="mb-4 flex items-center justify-between">
						<Crumbs current={step} />
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
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									persist({ name: e.target.value });
								}}
								placeholder="Acme Inc."
							/>
							<p className="text-xs text-muted-foreground">
								Saved as you type — reload and it's still here.
							</p>
						</Stepper.Content>

						<Stepper.Content step="details" className="space-y-3">
							<p className="text-sm font-semibold">A few details</p>
							<Input placeholder="Industry" />
							<Input placeholder="Team size" />
						</Stepper.Content>

						<Stepper.Content step="review" className="space-y-2 text-sm">
							<p className="font-semibold">Review</p>
							<div className="rounded-lg border bg-muted/30 p-3">
								Workspace: <span className="font-medium">{name || "—"}</span>
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
			)}
		</Stepper.Root>
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
	const stepper = useStepper();
	if (stepper.is("done")) return null;
	return (
		<Stepper.Actions className="mt-5 flex justify-between">
			<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
				Back
			</Stepper.Prev>
			<Stepper.Next className={buttonVariants()}>
				{stepper.is("review") ? "Create" : "Continue"}
			</Stepper.Next>
		</Stepper.Actions>
	);
}
