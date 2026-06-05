import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "plan", title: "Plan", price: 0 },
	{ id: "payment", title: "Payment", price: 29 },
	{ id: "confirm", title: "Confirm", price: 29 },
]);

export function TypedWizardBlock() {
	const [subscribed, setSubscribed] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<Stepper.List className="mb-5 flex gap-2">
						<Stepper.Items>
							{(step) => (
								<Stepper.Item key={step.id} step={step.id} className="flex-1">
									<Stepper.Indicator className="h-1.5 w-full rounded-full bg-muted transition-colors data-[status=active]:bg-primary data-[status=previous]:bg-primary" />
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>

					{/*
            Exhaustive rendering: `stepper.match` requires a handler for EVERY
            step id. Add a step above and this object is a compile error until
            you handle it — the type system guarantees no screen is forgotten.
            Each handler also receives the fully-typed step (note `step.price`).
          */}
					<div className="min-h-24 rounded-lg border bg-muted/30 p-4 text-sm">
						{subscribed ? (
							<div className="text-center">
								<p className="font-medium">Subscription active</p>
								<p className="mt-1 text-muted-foreground">
									The $29/mo plan is confirmed and ready to use.
								</p>
							</div>
						) : (
							stepper.match({
								plan: (step) => (
									<p>
										Choose a plan. Selected tier costs{" "}
										<span className="font-medium">${step.price}/mo</span>.
									</p>
								),
								payment: (step) => (
									<p>
										Enter payment details for the{" "}
										<span className="font-medium">${step.price}/mo</span> plan.
									</p>
								),
								confirm: (step) => (
									<p>
										Confirm your subscription:{" "}
										<span className="font-medium">${step.price}/mo</span>,
										billed monthly.
									</p>
								),
							})
						)}
					</div>

					<Stepper.Actions className="mt-5 flex gap-2">
						<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
							Back
						</Stepper.Prev>
						{subscribed ? (
							<button
								type="button"
								onClick={() => {
									setSubscribed(false);
									stepper.reset();
								}}
								className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Restart flow
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setSubscribed(true)}
								className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Subscribe
							</button>
						) : (
							<Stepper.Next className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
								Continue
							</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}
