import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "plan", title: "Plan" },
	{ id: "billing", title: "Billing" },
	{ id: "team", title: "Team" },
]);

export function SegmentedBlock() {
	const [saved, setSaved] = useState(false);

	return (
		<Stepper.Root className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
			{({ stepper }) => (
				<>
					<Stepper.List className="flex gap-1 rounded-lg bg-muted p-1">
						<Stepper.Items>
							{(step) => (
								<Stepper.Item key={step.id} step={step.id} className="flex-1">
									<Stepper.Trigger className="w-full rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm">
										<Stepper.Title />
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>

					<div className="mt-6 grid min-h-24 place-items-center rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
						{saved ? (
							<div>
								<p className="font-medium text-foreground">Settings saved</p>
								<p className="mt-1 text-xs">
									Plan, billing, and team settings are up to date.
								</p>
							</div>
						) : (
							<Stepper.Content step={stepper.current.id}>
								“{stepper.current.title}” settings.
							</Stepper.Content>
						)}
					</div>

					<Stepper.Actions className="mt-6 flex justify-between">
						<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
							Back
						</Stepper.Prev>
						{saved ? (
							<button
								type="button"
								onClick={() => {
									setSaved(false);
									stepper.reset();
								}}
								className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Restart flow
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setSaved(true)}
								className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Save settings
							</button>
						) : (
							<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
								Next
							</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}
