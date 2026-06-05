import { defineStepper } from "@stepperize/react";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import { useState } from "react";

// `estMinutes` is typed metadata on each step. Because it lives on the step
// definition, it's available on every entry of `stepper.steps` with no casting,
// which lets us compute a live ETA from the remaining steps.
const { Stepper } = defineStepper([
	{ id: "account", title: "Create account", estMinutes: 2 },
	{ id: "verify", title: "Verify email", estMinutes: 1 },
	{ id: "profile", title: "Complete profile", estMinutes: 5 },
	{ id: "team", title: "Invite team", estMinutes: 3 },
	{ id: "done", title: "Finish", estMinutes: 1 },
]);

export function ProgressOverviewBlock() {
	const [completed, setCompleted] = useState(false);

	return (
		<Stepper.Root className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
			{({ stepper }) => {
				const completedSteps = stepper.index;
				const remaining = stepper.count - stepper.index - 1;
				const percent = Math.round(stepper.progress * 100);
				// Sum the typed `estMinutes` of every step the user hasn't finished.
				const minutesLeft = stepper.steps
					.slice(stepper.index)
					.reduce((total, step) => total + step.estMinutes, 0);

				return (
					<>
						<div className="mb-4 flex items-baseline justify-between">
							<h3 className="text-sm font-semibold">Setup progress</h3>
							<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
								<Clock className="size-3.5" />
								{completed ? "Complete" : `~${minutesLeft} min left`}
							</span>
						</div>

						<div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all duration-300"
								style={{ width: `${percent}%` }}
							/>
						</div>
						<div className="mb-5 flex justify-between text-xs text-muted-foreground">
							<span>
								{completedSteps} completed · {remaining} remaining
							</span>
							<span className="font-medium text-foreground">{percent}%</span>
						</div>

						{completed ? (
							<div className="grid place-items-center gap-2 rounded-lg border bg-chart-2/10 p-6 text-center">
								<CheckCircle2 className="size-9 text-chart-2" />
								<p className="text-sm font-medium">Setup complete</p>
								<p className="text-xs text-muted-foreground">
									Account, verification, profile, and team invites are finished.
								</p>
							</div>
						) : (
							<ol className="space-y-1">
								{stepper.steps.map((step) => {
									const status = stepper.status(step.id);
									return (
										<li
											key={step.id}
											className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm data-[active=true]:bg-muted"
											data-active={status === "active"}
										>
											<span className="flex items-center gap-2">
												{status === "previous" ? (
													<CheckCircle2 className="size-4 text-primary" />
												) : status === "active" ? (
													<Loader2 className="size-4 animate-spin text-primary" />
												) : (
													<Circle className="size-4 text-muted-foreground/50" />
												)}
												<span
													className={
														status === "upcoming" ? "text-muted-foreground" : ""
													}
												>
													{step.title}
												</span>
											</span>
											<span className="text-xs text-muted-foreground">
												{step.estMinutes}m
											</span>
										</li>
									);
								})}
							</ol>
						)}

						<Stepper.Actions className="mt-5 flex gap-2">
							<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
								Back
							</Stepper.Prev>
							{completed ? (
								<button
									type="button"
									onClick={() => {
										setCompleted(false);
										stepper.reset();
									}}
									className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Restart setup
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setCompleted(true)}
									className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Complete setup
								</button>
							) : (
								<Stepper.Next className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
									Continue
								</Stepper.Next>
							)}
						</Stepper.Actions>
					</>
				);
			}}
		</Stepper.Root>
	);
}
