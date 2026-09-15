"use client";

import { defineStepper, type Stepper } from "@stepperize/react";

const flow = defineStepper([
	{ id: "shipping", title: "Shipping" },
	{ id: "payment", title: "Payment" },
	{ id: "review", title: "Review" },
]);
const buttonClass =
	"rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40";

/** Two independent owners and a shared owner rendered through separate consumers. */
export function OwnershipDemo() {
	return (
		<div className="not-prose my-6 space-y-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<LocalCheckout label="Local checkout A" />
				<LocalCheckout label="Local checkout B" />
			</div>
			<flow.Provider>
				<section
					aria-label="Shared checkout"
					className="rounded-xl border border-primary/30 bg-primary/5 p-4"
				>
					<h3 className="font-semibold">Shared checkout</h3>
					<p className="mb-4 text-sm text-muted-foreground">
						The heading, panel and controls are separate components sharing one
						Provider.
					</p>
					<SharedHeading />
					<SharedPanel />
					<SharedControls />
				</section>
				<div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2">
					<p className="text-sm text-muted-foreground sm:col-span-2">
						Both examples below are inside the outer Provider. The local hook
						creates its own instance; the inner Provider creates a separate
						shared scope.
					</p>
					<LocalCheckout label="Local checkout inside Provider" />
					<flow.Provider defaultStep="payment">
						<section
							aria-label="Nested shared checkout"
							className="rounded-xl border p-4"
						>
							<h3 className="font-semibold">Nested shared checkout</h3>
							<SharedHeading />
							<SharedPanel />
							<SharedControls />
						</section>
					</flow.Provider>
				</div>
			</flow.Provider>
		</div>
	);
}

function LocalCheckout({ label }: { label: string }) {
	const stepper = flow.useStepper();
	return (
		<section aria-label={label} className="rounded-xl border p-4">
			<h3 className="font-semibold">{label}</h3>
			<p className="my-3" aria-live="polite">
				{stepper.current.title}
			</p>
			<Controls stepper={stepper} />
		</section>
	);
}
function SharedHeading() {
	const index = flow.useStepperContext((s) => s.index);
	return (
		<p className="text-sm text-muted-foreground">
			Step {index + 1} of {flow.steps.length}
		</p>
	);
}
function SharedPanel() {
	const stepper = flow.useStepperContext();
	return (
		<div className="my-3" aria-live="polite">
			{stepper.match({
				shipping: () => <p>Choose a delivery address.</p>,
				payment: () => <p>Choose a payment method.</p>,
				review: () => <p>Review your order.</p>,
			})}
		</div>
	);
}
function SharedControls() {
	const stepper = flow.useStepperContext();
	return <Controls stepper={stepper} />;
}
function Controls({ stepper }: { stepper: Stepper<typeof flow.steps> }) {
	return (
		<div className="flex gap-2">
			<button
				type="button"
				className={buttonClass}
				disabled={!stepper.canPrev}
				onClick={() => void stepper.prev()}
			>
				Back
			</button>
			<button
				type="button"
				className={buttonClass}
				disabled={!stepper.canNext}
				onClick={() => void stepper.next()}
			>
				Next
			</button>
			<button
				type="button"
				className={buttonClass}
				onClick={() => void stepper.reset()}
			>
				Reset
			</button>
		</div>
	);
}
