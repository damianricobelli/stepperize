"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { defineStepper } from "@stepperize/react";

const { useStepper, steps } = defineStepper(
	{ id: "shipping", title: "Shipping", description: "Enter your shipping details" },
	{ id: "payment", title: "Payment", description: "Enter your payment details" },
	{ id: "complete", title: "Complete", description: "Checkout complete" },
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
			<nav aria-label="Checkout Steps" className="group my-4">
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
								<span className="text-sm font-medium">{step.title}</span>
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
			<nav aria-label="Checkout Steps" className="group my-4">
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
								<span className="text-sm font-medium">{step.title}</span>
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

export const BasicCircleExample = () => {
	const stepper = useStepper();

	return (
		<div className="space-y-6 p-6 border rounded-lg">
			<div className="flex items-center gap-4">
				<StepIndicator currentStep={stepper.current.index + 1} totalSteps={stepper.all.length} />
				<div className="flex flex-col">
					<h2 className="flex-1 text-lg font-medium">{stepper.current.title}</h2>
					<p className="text-sm text-muted-foreground">{stepper.current.description}</p>
				</div>
			</div>
			{stepper.switch({
				shipping: () => <ShippingComponent />,
				payment: () => <PaymentComponent />,
				complete: () => <CompleteComponent />,
			})}
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
};

interface StepIndicatorProps {
	currentStep: number;
	totalSteps: number;
	size?: number;
	strokeWidth?: number;
}

const StepIndicator = ({ currentStep, totalSteps, size = 80, strokeWidth = 6 }: StepIndicatorProps) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const fillPercentage = (currentStep / totalSteps) * 100;
	const dashOffset = circumference - (circumference * fillPercentage) / 100;

	return (
		<div className="relative inline-flex items-center justify-center">
			<svg width={size} height={size}>
				<title>Step Indicator</title>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					className="text-muted-foreground"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					strokeDasharray={circumference}
					strokeDashoffset={dashOffset}
					className="text-primary transition-all duration-300 ease-in-out"
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="text-sm font-medium" aria-live="polite">
					{currentStep} of {totalSteps}
				</span>
			</div>
		</div>
	);
};

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

const CompleteComponent = () => {
	return <h3 className="text-lg py-4 font-medium">Stepper complete 🔥</h3>;
};
