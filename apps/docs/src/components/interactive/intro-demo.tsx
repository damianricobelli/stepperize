"use client";

import { defineStepper } from "@stepperize/react";

const checkout = defineStepper([
	{ id: "shipping", title: "Shipping" },
	{ id: "payment", title: "Payment" },
	{ id: "review", title: "Review" },
]);

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const primaryButton =
	"inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

export function Checkout() {
	const stepper = checkout.useStepper();

	return (
		<section className="mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-sm">
			{/* One list, three states, all from stepper.status(id). */}
			<ol className="flex border-b">
				{checkout.steps.map((step, index) => {
					const status = stepper.status(step.id);
					return (
						<li
							key={step.id}
							className={`flex flex-1 items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors duration-200 ${
								status === "active"
									? "bg-primary/[0.06] text-foreground"
									: "text-muted-foreground"
							}`}
						>
							<span
								className={`grid size-5 place-items-center rounded-full text-[10px] leading-none transition-colors duration-200 ${
									status === "upcoming"
										? "bg-muted"
										: "bg-primary text-primary-foreground"
								}`}
							>
								{index + 1}
							</span>
							{step.title}
						</li>
					);
				})}
			</ol>

			<div className="space-y-4 p-5">
				<h2 className="text-lg font-semibold tracking-tight">
					{stepper.current.title}
				</h2>

				<div className="min-h-12 text-sm text-muted-foreground">
					{stepper.match({
						shipping: () => <p>Where should we send your order?</p>,
						payment: () => <p>Choose how you would like to pay.</p>,
						review: () => <p>Check everything, then place the order.</p>,
					})}
				</div>

				<div className="flex justify-between gap-2">
					<button
						type="button"
						className={button}
						disabled={!stepper.canPrev}
						onClick={() => stepper.prev()}
					>
						Back
					</button>
					<button
						type="button"
						className={primaryButton}
						disabled={!stepper.canNext}
						onClick={() => stepper.next()}
					>
						Next
					</button>
				</div>
			</div>
		</section>
	);
}
