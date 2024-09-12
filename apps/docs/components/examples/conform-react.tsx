"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { defineStepper } from "@stepperize/react";

const shippingSchema = z.object({
	address: z.string().min(1, "Address is required"),
	city: z.string().min(1, "City is required"),
	postalCode: z.string().min(5, "Postal code is required"),
});

const paymentSchema = z.object({
	cardNumber: z.string().min(16, "Card number is required"),
	expirationDate: z.string().min(5, "Expiration date is required"),
	cvv: z.string().min(3, "CVV is required"),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

const { useStepper, steps } = defineStepper(
	{ id: "shipping", label: "Shipping", schema: shippingSchema },
	{ id: "payment", label: "Payment", schema: paymentSchema },
	{ id: "complete", label: "Complete", schema: z.object({}) },
);

export function CheckoutFormWithConform() {
	const stepper = useStepper();
	const [form, fields] = useForm({
		id: "checkout",
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		constraint: getZodConstraint(stepper.current.schema),
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: stepper.current.schema });
		},
		onSubmit(event, { submission }) {
			event.preventDefault();
			// biome-ignore lint/suspicious/noConsoleLog: <We want to log the form values>
			console.log(`Form values for step ${stepper.current.id}:`, submission);
			if (stepper.isLast) {
				stepper.reset();
			} else {
				stepper.next();
			}
		},
	});

	return (
		<form method="post" {...getFormProps(form)} className="space-y-6 p-6 border rounded-lg">
			<div id={form.errorId}>{form.errors}</div>
			<div className="flex items-center">
				<h2 className="flex-1 text-lg font-medium">Checkout</h2>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Step {stepper.current.index + 1} of {steps.length}
					</span>
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
					shipping: () => <ShippingComponent fields={fields as ReturnType<typeof useForm<ShippingFormValues>>[1]} />,
					payment: () => <PaymentComponent fields={fields as ReturnType<typeof useForm<PaymentFormValues>>[1]} />,
					complete: () => <CompleteComponent />,
				})}
				{!stepper.isLast ? (
					<div className="flex justify-end gap-4">
						<Button type="button" variant="secondary" onClick={stepper.prev} disabled={stepper.isFirst}>
							Back
						</Button>
						<Button>{stepper.isLast ? "Complete" : "Next"}</Button>
					</div>
				) : (
					<Button type="button" onClick={stepper.reset}>
						Reset
					</Button>
				)}
			</div>
		</form>
	);
}

function ShippingComponent({ fields }: { fields: ReturnType<typeof useForm<ShippingFormValues>>[1] }) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label htmlFor={fields.address.id} className="block text-sm font-medium text-primary">
					Address
				</label>
				<Input {...getInputProps(fields.address, { type: "text" })} className="block w-full p-2 border rounded-md" />
				{fields.address.errors && (
					<p className="text-sm text-destructive" id={fields.address.errorId}>
						{fields.address.errors}
					</p>
				)}
			</div>
			<div className="space-y-2">
				<label htmlFor={fields.city.id} className="block text-sm font-medium text-primary">
					City
				</label>
				<Input {...getInputProps(fields.city, { type: "text" })} className="block w-full p-2 border rounded-md" />
				{fields.city.errors && <span className="text-sm text-destructive">{fields.city.errors}</span>}
			</div>
			<div className="space-y-2">
				<label htmlFor={fields.postalCode.id} className="block text-sm font-medium text-primary">
					Postal Code
				</label>
				<Input {...getInputProps(fields.postalCode, { type: "text" })} className="block w-full p-2 border rounded-md" />
				{fields.postalCode.errors && <span className="text-sm text-destructive">{fields.postalCode.errors}</span>}
			</div>
		</div>
	);
}

function PaymentComponent({ fields }: { fields: ReturnType<typeof useForm<PaymentFormValues>>[1] }) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label htmlFor={fields.cardNumber.id} className="block text-sm font-medium text-primary">
					Card Number
				</label>
				<Input {...getInputProps(fields.cardNumber, { type: "text" })} className="block w-full p-2 border rounded-md" />
				{fields.cardNumber.errors && <span className="text-sm text-destructive">{fields.cardNumber.errors}</span>}
			</div>
			<div className="space-y-2">
				<label htmlFor={fields.expirationDate.id} className="block text-sm font-medium text-primary">
					Expiration Date
				</label>
				<Input
					{...getInputProps(fields.expirationDate, { type: "text" })}
					className="block w-full p-2 border rounded-md"
				/>
				{fields.expirationDate.errors && (
					<span className="text-sm text-destructive">{fields.expirationDate.errors}</span>
				)}
			</div>
			<div className="space-y-2">
				<label htmlFor={fields.cvv.id} className="block text-sm font-medium text-primary">
					CVV
				</label>
				<Input {...getInputProps(fields.cvv, { type: "text" })} className="block w-full p-2 border rounded-md" />
				{fields.cvv.errors && <span className="text-sm text-destructive">{fields.cvv.errors}</span>}
			</div>
		</div>
	);
}

function CompleteComponent() {
	return <div className="text-center">Thank you! Your order is complete.</div>;
}
