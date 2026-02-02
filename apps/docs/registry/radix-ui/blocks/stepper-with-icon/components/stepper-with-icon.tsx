"use client";

import { defineStepper, Get } from "@stepperize/react";
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives";
import {
	CheckCircle2,
	CreditCard,
	Package,
	ShoppingCart,
	Truck,
} from "lucide-react";

import { Button } from "@/registry/radix-ui/ui/button";
import React from "react";

const { Stepper, ...stepperDefinition } = defineStepper(
	{
		id: "cart",
		title: "Cart",
		description: "Review your items",
		icon: ShoppingCart,
	},
	{
		id: "shipping",
		title: "Shipping",
		description: "Enter shipping details",
		icon: Truck,
	},
	{
		id: "payment",
		title: "Payment",
		description: "Complete payment",
		icon: CreditCard,
	},
	{
		id: "confirmation",
		title: "Confirmation",
		description: "Order confirmed",
		icon: Package,
	}
);

type StepData = {
	id: string;
	title: string;
	description?: string;
	icon: React.ComponentType<{ className?: string }>;
};

const StepperTriggerWrapper = ({ icon: Icon }: { icon: StepData["icon"] }) => {
	const item = useStepItemContext();
	const isInactive = item.status === "inactive";
	const isCompleted = item.status === "success";

	return (
		<Stepper.Trigger
			render={(domProps) => (
				<Button
					className="rounded-full"
					variant={isInactive ? "secondary" : "default"}
					size="icon"
					{...domProps}
				>
					{isCompleted ? (
						<CheckCircle2 className="h-4 w-4" />
					) : (
						<Icon className="h-4 w-4" />
					)}
				</Button>
			)}
		/>
	);
};

const StepperTitleWrapper = ({ title }: { title: string }) => {
	return (
		<Stepper.Title
			render={(domProps) => (
				<h4 className="text-base font-medium" {...domProps}>
					{title}
				</h4>
			)}
		/>
	);
};

const StepperDescriptionWrapper = ({
	description,
}: { description?: string }) => {
	if (!description) return null;
	return (
		<Stepper.Description
			render={(domProps) => (
				<p className="text-sm text-muted-foreground" {...domProps}>
					{description}
				</p>
			)}
		/>
	);
};

const StepperSeparatorWithStatus = ({
	status,
	isLast,
}: { status: StepStatus; isLast: boolean }) => {
	if (isLast) return null;

	return (
		<Stepper.Separator
			orientation="horizontal"
			data-status={status}
			className="self-center bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:min-w-4 data-[orientation=horizontal]:flex-1"
		/>
	);
};

export function StepperWithIcon() {
	return (
		<Stepper.Root className="w-full space-y-4" orientation="horizontal">
			{({ stepper }) => (
				<>
					<Stepper.List className="flex list-none gap-2 flex-row items-center justify-between">
						{stepper.state.all.map((stepData, index) => {
							const currentIndex = stepper.state.current.index;
							const status = index < currentIndex ? "success" : index === currentIndex ? "active" : "inactive";
							const isLast = index === stepper.state.all.length - 1;
							const data = stepData as StepData;
							return (
								<React.Fragment key={stepData.id}>
									<Stepper.Item
										step={stepData.id}
										className="group peer relative flex shrink-0 items-center gap-2"
									>
										<StepperTriggerWrapper
											icon={data.icon}
										/>
										<div className="flex flex-col items-start gap-1">
											<StepperTitleWrapper
												title={data.title}
											/>
											<StepperDescriptionWrapper
												description={data.description}
											/>
										</div>
									</Stepper.Item>
									<StepperSeparatorWithStatus
										key={`separator-${stepData.id}`}
										status={status}
										isLast={isLast}
									/>
								</React.Fragment>
							);
						})}
					</Stepper.List>
					{stepper.flow.switch({
						cart: (data) => <Content id={data.id} />,
						shipping: (data) => <Content id={data.id} />,
						payment: (data) => <Content id={data.id} />,
						confirmation: (data) => <Content id={data.id} />,
					})}
					<Stepper.Actions className="flex justify-end gap-4">
						{!stepper.state.isLast && (
							<Stepper.Prev
								render={(domProps) => (
									<Button
										type="button"
										variant="secondary"
										{...domProps}
									>
										Previous
									</Button>
								)}
							/>
						)}
						{stepper.state.isLast ? (
							<Button
								type="button"
								onClick={() => stepper.navigation.reset()}
							>
								Place New Order
							</Button>
						) : (
							<Stepper.Next
								render={(domProps) => (
									<Button type="button" {...domProps}>
										{stepper.state.current.index ===
										stepper.state.all.length - 2
											? "Confirm Order"
											: "Continue"}
									</Button>
								)}
							/>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}

const Content = ({ id }: { id: Get.Id<typeof stepperDefinition.steps> }) => {
	const contentMap: Record<string, { title: string; description: string }> = {
		cart: {
			title: "Shopping Cart",
			description: "Review the items in your cart before proceeding.",
		},
		shipping: {
			title: "Shipping Information",
			description:
				"Enter your shipping address and select a delivery method.",
		},
		payment: {
			title: "Payment Details",
			description:
				"Enter your payment information to complete the purchase.",
		},
		confirmation: {
			title: "Order Confirmed!",
			description:
				"Thank you for your purchase. Your order has been placed successfully.",
		},
	};

	const content = contentMap[id];

	return (
		<Stepper.Content
			step={id}
			render={(props) => (
				<div
					{...props}
					className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8"
				>
					<p className="text-xl font-medium">{content.title}</p>
					<p className="text-sm text-muted-foreground mt-2">
						{content.description}
					</p>
				</div>
			)}
		/>
	);
};
