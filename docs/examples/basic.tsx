"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { defineStepper } from "@stepperize/react";

const { useStepper, steps } = defineStepper(
	{ id: "shipping", label: "Shipping" },
	{ id: "payment", label: "Payment" },
	{ id: "review", label: "Review" },
	{ id: "complete", label: "Complete" },
);

export function BasicHorizontalExample() {
	const stepper = useStepper();

	return (
		<div className="space-y-6 p-6 border rounded-lg">
			<div className="flex items-center">
				<h2 className="flex-1 text-lg font-medium">Checkout</h2>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Step {stepper.current.index + 1} of {steps.length}
					</span>
					<div />
				</div>
			</div>
			<nav aria-label="Checkout Steps" role="tablist" className="group my-4">
				<ol className="flex items-center justify-between gap-2" aria-orientation="horizontal">
					{stepper.all.map((step, index, array) => (
						<React.Fragment key={step.id}>
							<li className="flex items-center gap-4 flex-shrink-0">
								<Button
									type="button"
									role="tab"
									variant={index <= stepper.current.index ? "default" : "secondary"}
									aria-current={stepper.current.id === step.id ? "step" : undefined}
									aria-posinset={index + 1}
									aria-setsize={steps.length}
									aria-selected={stepper.current.id === step.id}
									className="flex size-10 items-center justify-center rounded-full"
									onClick={() => stepper.goTo(step.id)}
								>
									{index + 1}
								</Button>
								<span className="text-sm font-medium">{step.label}</span>
							</li>
							{index < array.length - 1 && (
								<Separator className={`flex-1 ${index < stepper.current.index ? "bg-primary" : "bg-muted"}`} />
							)}
						</React.Fragment>
					))}
				</ol>
			</nav>
			<div className="space-y-4">
				{stepper.switch({
					shipping: () => <ShippingComponent />,
					payment: () => <PaymentComponent />,
					review: () => <ReviewComponent />,
					complete: () => <CompleteComponent />,
				})}
				{!stepper.isLast ? (
					<div className="flex justify-end gap-4">
						<Button variant="secondary" onClick={stepper.prev} disabled={stepper.isFirst}>
							Back
						</Button>
						<Button onClick={stepper.next}>{stepper.isLast ? "Complete" : "Next"}</Button>
					</div>
				) : (
					<Button onClick={stepper.reset}>Reset</Button>
				)}
			</div>
		</div>
	);
}

export function BasicVerticalExample() {
	const stepper = useStepper();

	return (
		<div className="space-y-6 p-6 border rounded-lg">
			<div className="flex items-center">
				<h2 className="flex-1 text-lg font-medium">Checkout</h2>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Step {stepper.current.index + 1} of {steps.length}
					</span>
					<div />
				</div>
			</div>
			<nav aria-label="Checkout Steps" role="tablist" className="group my-4">
				<ol className="flex flex-col gap-2" aria-orientation="vertical">
					{stepper.all.map((step, index, array) => (
						<React.Fragment key={step.id}>
							<li className="flex items-center gap-4 flex-shrink-0">
								<Button
									type="button"
									role="tab"
									variant={index <= stepper.current.index ? "default" : "secondary"}
									aria-current={stepper.current.id === step.id ? "step" : undefined}
									aria-posinset={index + 1}
									aria-setsize={steps.length}
									aria-selected={stepper.current.id === step.id}
									className="flex size-10 items-center justify-center rounded-full"
									onClick={() => stepper.goTo(step.id)}
								>
									{index + 1}
								</Button>
								<span className="text-sm font-medium">{step.label}</span>
							</li>
							<div className="flex gap-4">
								{index < array.length - 1 && (
									<div
										className="flex justify-center"
										style={{
											paddingInlineStart: "1.25rem",
										}}
									>
										<Separator
											orientation="vertical"
											className={`w-[1px] h-full ${index < stepper.current.index ? "bg-primary" : "bg-muted"}`}
										/>
									</div>
								)}
								<div className="flex-1 my-4">
									{stepper.current.id === step.id &&
										stepper.switch({
											shipping: () => <ShippingComponent />,
											payment: () => <PaymentComponent />,
											review: () => <ReviewComponent />,
											complete: () => <CompleteComponent />,
										})}
								</div>
							</div>
						</React.Fragment>
					))}
				</ol>
			</nav>
			<div className="space-y-4">
				{!stepper.isLast ? (
					<div className="flex justify-end gap-4">
						<Button variant="secondary" onClick={stepper.prev} disabled={stepper.isFirst}>
							Back
						</Button>
						<Button onClick={stepper.next}>{stepper.isLast ? "Complete" : "Next"}</Button>
					</div>
				) : (
					<Button onClick={stepper.reset}>Reset</Button>
				)}
			</div>
		</div>
	);
}

const ShippingComponent = () => {
	return (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<label htmlFor="name" className="text-sm font-medium">
					Name
				</label>
				<Input id="name" placeholder="John Doe" className="w-full" />
			</div>
			<div className="grid gap-2">
				<label htmlFor="address" className="text-sm font-medium">
					Address
				</label>
				<Textarea id="address" placeholder="123 Main St, Anytown USA" className="w-full" />
			</div>
		</div>
	);
};

const PaymentComponent = () => {
	return (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<label htmlFor="card-number" className="text-sm font-medium">
					Card Number
				</label>
				<Input id="card-number" placeholder="4111 1111 1111 1111" className="w-full" />
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="grid gap-2">
					<label htmlFor="expiry-date" className="text-sm font-medium">
						Expiry Date
					</label>
					<Input id="expiry-date" placeholder="MM/YY" className="w-full" />
				</div>
				<div className="grid gap-2">
					<label htmlFor="cvc" className="text-sm font-medium">
						CVC
					</label>
					<Input id="cvc" placeholder="123" className="w-full" />
				</div>
			</div>
		</div>
	);
};

const ReviewComponent = () => {
	return (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<label htmlFor="review" className="text-sm font-medium">
					Review
				</label>
				<Textarea id="review" placeholder="Please review your order" className="w-full" />
			</div>
		</div>
	);
};

const CompleteComponent = () => {
	return <h3 className="text-lg py-4 font-medium">Stepper complete 🔥</h3>;
};