import { defineStepper } from "@stepperize/react";

// Module scope: one definition, shared by every instance of this component.
const { Stepper } = defineStepper([
	{ id: "account", title: "Account", description: "Who you are" },
	{ id: "plan", title: "Plan", description: "What you need" },
	{ id: "done", title: "Done", description: "All set" },
]);

export default function ReactDemo() {
	return (
		<Stepper.Root
			className="not-prose my-4 flex flex-col gap-4 rounded-lg border p-4 text-sm"
			data-demo="react"
		>
			{/* The render prop receives the stepper: `isFinished` and `isLast` come from the flow, not local state. */}
			{(stepper) => (
				<>
					<Stepper.List className="flex gap-2">
						{(step, index) => (
							<Stepper.Item key={step.id} step={step.id} className="flex-1">
								<Stepper.Trigger className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left data-[state=current]:border-fd-primary data-[state=current]:bg-fd-accent">
									<Stepper.Indicator className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs data-[state=complete]:bg-fd-primary data-[state=complete]:text-fd-primary-foreground">
										{index + 1}
									</Stepper.Indicator>
									<span className="flex flex-col">
										<Stepper.Title className="font-medium" />
										<Stepper.Description className="text-xs text-fd-muted-foreground" />
									</span>
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</Stepper.List>

					<Stepper.Content
						step="account"
						className="rounded-md bg-fd-muted p-3"
					>
						Create your account.
					</Stepper.Content>
					<Stepper.Content step="plan" className="rounded-md bg-fd-muted p-3">
						Pick the plan that fits.
					</Stepper.Content>
					<Stepper.Content step="done" className="rounded-md bg-fd-muted p-3">
						{stepper.isFinished
							? "Finished. Thanks!"
							: "Press Finish to complete the flow."}
					</Stepper.Content>

					<div className="flex items-center gap-2">
						<Stepper.Prev className="rounded-md border px-3 py-1 disabled:opacity-40">
							Back
						</Stepper.Prev>
						<Stepper.Next className="rounded-md border px-3 py-1 aria-disabled:opacity-40">
							{stepper.isLast ? "Finish" : "Continue"}
						</Stepper.Next>
						<span
							data-step
							className="ml-auto text-xs text-fd-muted-foreground"
						>
							Step {stepper.index + 1} of {stepper.steps.length}
						</span>
					</div>
				</>
			)}
		</Stepper.Root>
	);
}
