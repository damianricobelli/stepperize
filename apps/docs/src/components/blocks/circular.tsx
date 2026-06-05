import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "profile", title: "Profile", description: "Basic information" },
	{ id: "workspace", title: "Workspace", description: "Name and logo" },
	{ id: "invite", title: "Invite", description: "Add teammates" },
	{ id: "finish", title: "All done", description: "Launch your space" },
]);

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularBlock() {
	const [launched, setLaunched] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => {
				const progress = (stepper.index + 1) / stepper.count;
				const next = stepper.steps[stepper.index + 1];
				return (
					<>
						<div className="flex items-center gap-4">
							<div className="relative grid size-16 shrink-0 place-items-center">
								<svg
									viewBox="0 0 48 48"
									className="size-16 -rotate-90"
									aria-hidden="true"
								>
									<circle
										cx="24"
										cy="24"
										r={RADIUS}
										fill="none"
										strokeWidth="4"
										className="stroke-muted"
									/>
									<circle
										cx="24"
										cy="24"
										r={RADIUS}
										fill="none"
										strokeWidth="4"
										strokeLinecap="round"
										strokeDasharray={CIRCUMFERENCE}
										strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
										className="stroke-primary transition-all duration-500"
									/>
								</svg>
								<span className="absolute text-sm font-semibold">
									{stepper.index + 1}/{stepper.count}
								</span>
							</div>

							<Stepper.Content step={stepper.current.id}>
								<h3 className="text-base font-semibold">
									{launched ? "Workspace launched" : stepper.current.title}
								</h3>
								<p className="text-sm text-muted-foreground">
									{launched
										? "Your space is live and ready for collaborators."
										: stepper.current.description}
								</p>
								{next && !launched && (
									<p className="mt-1 text-xs text-muted-foreground/70">
										Next: {next.title}
									</p>
								)}
							</Stepper.Content>
						</div>

						<Stepper.Actions className="mt-6 flex justify-between">
							<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
								Back
							</Stepper.Prev>
							{launched ? (
								<button
									type="button"
									onClick={() => {
										setLaunched(false);
										stepper.reset();
									}}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Restart flow
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setLaunched(true)}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Launch workspace
								</button>
							) : (
								<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
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
