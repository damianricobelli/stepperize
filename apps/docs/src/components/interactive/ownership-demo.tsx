"use client";

import { defineStepper, type Stepper } from "@stepperize/react";
import type { ReactNode } from "react";

const flow = defineStepper([
	{ id: "shipping", title: "Shipping" },
	{ id: "payment", title: "Payment" },
	{ id: "review", title: "Review" },
]);

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-8 items-center justify-center rounded-lg border bg-background px-3 text-[13px] font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const primaryButton =
	"inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

/** Two independent owners and a shared owner rendered through separate consumers. */
export function OwnershipDemo() {
	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<LocalCheckout label="Local checkout A" />
				<LocalCheckout label="Local checkout B" />
			</div>
			<flow.Provider>
				<section
					aria-label="Shared checkout"
					className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4"
				>
					<Header title="Shared checkout" owner="<flow.Provider>" shared />
					<p className="mt-1 mb-4 text-sm text-muted-foreground">
						The heading, panel and controls are separate components sharing one
						Provider.
					</p>
					<div className="grid gap-2 sm:grid-cols-3">
						<Consumer name="<SharedHeading />">
							<SharedHeading />
						</Consumer>
						<Consumer name="<SharedPanel />">
							<SharedPanel />
						</Consumer>
						<Consumer name="<SharedControls />">
							<SharedControls />
						</Consumer>
					</div>
				</section>
				<div className="mt-4 rounded-xl border border-dashed p-4">
					<p className="mb-3 text-sm text-muted-foreground">
						Both examples below are inside the outer Provider. The local hook
						creates its own instance; the inner Provider creates a separate
						shared scope.
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<LocalCheckout label="Local checkout inside Provider" />
						<flow.Provider defaultStep="payment">
							<section
								aria-label="Nested shared checkout"
								className="rounded-xl border border-primary/30 bg-background p-4"
							>
								<Header
									title="Nested shared checkout"
									owner="inner <Provider>"
									shared
								/>
								<SharedHeading />
								<SharedPanel />
								<SharedControls />
							</section>
						</flow.Provider>
					</div>
				</div>
			</flow.Provider>
		</div>
	);
}

function Header({
	title,
	owner,
	shared,
}: {
	title: string;
	owner: string;
	shared?: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<h3 className="text-sm font-semibold tracking-tight">{title}</h3>
			<code
				className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${
					shared
						? "border-primary/30 bg-primary/10 text-primary"
						: "bg-muted text-muted-foreground"
				}`}
			>
				{owner}
			</code>
		</div>
	);
}

function Consumer({ name, children }: { name: string; children: ReactNode }) {
	return (
		<div className="rounded-lg border bg-background p-3">
			<code className="font-mono text-[10.5px] text-muted-foreground">
				{name}
			</code>
			<div className="mt-1.5">{children}</div>
		</div>
	);
}

function Dots({ index }: { index: number }) {
	return (
		<span aria-hidden className="flex gap-1">
			{flow.steps.map((step, i) => (
				<span
					key={step.id}
					className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
						i === index
							? "w-4 bg-primary"
							: i < index
								? "w-1.5 bg-primary/40"
								: "w-1.5 bg-border"
					}`}
				/>
			))}
		</span>
	);
}

function LocalCheckout({ label }: { label: string }) {
	const stepper = flow.useStepper();
	return (
		<section aria-label={label} className="rounded-xl border bg-background p-4">
			<Header title={label} owner="useStepper()" />
			<div className="my-3 flex items-center justify-between gap-3">
				<p className="text-base font-medium" aria-live="polite">
					{stepper.current.title}
				</p>
				<Dots index={stepper.index} />
			</div>
			<Controls stepper={stepper} />
		</section>
	);
}
function SharedHeading() {
	const index = flow.useStepperContext((s) => s.index);
	return (
		<div className="flex items-center justify-between gap-2">
			<p className="text-sm text-muted-foreground">
				Step {index + 1} of {flow.steps.length}
			</p>
			<Dots index={index} />
		</div>
	);
}
function SharedPanel() {
	const stepper = flow.useStepperContext();
	return (
		<div className="my-3 text-sm" aria-live="polite">
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
		<div className="flex flex-wrap gap-1.5">
			<button
				type="button"
				className={button}
				disabled={!stepper.canPrev}
				onClick={() => void stepper.prev()}
			>
				Back
			</button>
			<button
				type="button"
				className={primaryButton}
				disabled={!stepper.canNext}
				onClick={() => void stepper.next()}
			>
				Next
			</button>
			<button
				type="button"
				className={`${button} border-transparent shadow-none`}
				onClick={() => void stepper.reset()}
			>
				Reset
			</button>
		</div>
	);
}
