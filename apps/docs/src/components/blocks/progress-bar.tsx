import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "details", title: "Your details" },
	{ id: "address", title: "Address" },
	{ id: "payment", title: "Payment" },
	{ id: "review", title: "Review" },
]);

export function ProgressBarBlock() {
	const [submitted, setSubmitted] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => {
				const progress = Math.round(
					((stepper.index + 1) / stepper.count) * 100,
				);
				return (
					<>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">{stepper.current.title}</span>
							<span className="text-muted-foreground">
								Step {stepper.index + 1} of {stepper.count}
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
						</div>

						<div className="mt-6 grid min-h-24 place-items-center rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
							{submitted ? (
								<div>
									<p className="font-medium text-foreground">Form submitted</p>
									<p className="mt-1 text-xs">
										Your details are ready for review.
									</p>
								</div>
							) : (
								<Stepper.Content step={stepper.current.id}>
									“{stepper.current.title}” fields go here.
								</Stepper.Content>
							)}
						</div>

						<Stepper.Actions className="mt-6 flex justify-between">
							<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
								Back
							</Stepper.Prev>
							{submitted ? (
								<button
									type="button"
									onClick={() => {
										setSubmitted(false);
										stepper.reset();
									}}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Restart flow
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setSubmitted(true)}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Submit form
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
