"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { defineStepper } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/registry/base-ui/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/registry/base-ui/ui/field";
import { Input } from "@/registry/base-ui/ui/input";
import React from "react";

const personalInfoSchema = z.object({
	firstName: z.string().min(2, "First name must be at least 2 characters"),
	lastName: z.string().min(2, "Last name must be at least 2 characters"),
});

const contactInfoSchema = z.object({
	email: z.string().email("Invalid email address"),
	phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

const addressSchema = z.object({
	street: z.string().min(5, "Street address is required"),
	city: z.string().min(2, "City is required"),
	zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type ContactInfo = z.infer<typeof contactInfoSchema>;
type Address = z.infer<typeof addressSchema>;

const { Stepper } = defineStepper([
	{
		id: "personal",
		title: "Personal Info",
		description: "Enter your personal details",
	},
	{
		id: "contact",
		title: "Contact Info",
		description: "How can we reach you?",
	},
	{
		id: "address",
		title: "Address",
		description: "Where do you live?",
	},
	{
		id: "complete",
		title: "Complete",
		description: "Review and submit",
	},
]);

const StepperTriggerWrapper = () => {
	const item = useStepItemContext();
	const isInactive = item.status === "inactive";

	return (
		<Stepper.Trigger
			render={(domProps) => (
				<Button
					className="rounded-full"
					variant={isInactive ? "secondary" : "default"}
					size="icon"
					{...domProps}
				>
					<Stepper.Indicator />
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
}: { status: string; isLast: boolean }) => {
	if (isLast) return null;

	return (
		<Stepper.Separator
			orientation="horizontal"
			data-status={status}
			className="bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:flex-1"
		/>
	);
};

function PersonalInfoForm({
	onNext,
	defaultValues,
}: {
	onNext: (data: PersonalInfo) => void;
	defaultValues?: PersonalInfo;
}) {
	const form = useForm<PersonalInfo>({
		resolver: zodResolver(personalInfoSchema),
		defaultValues: defaultValues || { firstName: "", lastName: "" },
	});

	return (
		<form
			id="stepper-form-personal"
			onSubmit={form.handleSubmit(onNext)}
			className="space-y-4"
		>
			<FieldGroup>
				<Controller
					name="firstName"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-personal-firstName">
								First Name
							</FieldLabel>
							<Input
								{...field}
								id="stepper-form-personal-firstName"
								aria-invalid={fieldState.invalid}
								placeholder="John"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
				<Controller
					name="lastName"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-personal-lastName">
								Last Name
							</FieldLabel>
							<Input
								{...field}
								id="stepper-form-personal-lastName"
								aria-invalid={fieldState.invalid}
								placeholder="Doe"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
			</FieldGroup>
			<div className="flex justify-end">
				<Button type="submit">Next</Button>
			</div>
		</form>
	);
}

function ContactInfoForm({
	onNext,
	onPrev,
	defaultValues,
}: {
	onNext: (data: ContactInfo) => void;
	onPrev: () => void;
	defaultValues?: ContactInfo;
}) {
	const form = useForm<ContactInfo>({
		resolver: zodResolver(contactInfoSchema),
		defaultValues: defaultValues || { email: "", phone: "" },
	});

	return (
		<form
			id="stepper-form-contact"
			onSubmit={form.handleSubmit(onNext)}
			className="space-y-4"
		>
			<FieldGroup>
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-contact-email">
								Email
							</FieldLabel>
							<Input
								{...field}
								type="email"
								id="stepper-form-contact-email"
								aria-invalid={fieldState.invalid}
								placeholder="john@example.com"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
				<Controller
					name="phone"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-contact-phone">
								Phone
							</FieldLabel>
							<Input
								{...field}
								id="stepper-form-contact-phone"
								aria-invalid={fieldState.invalid}
								placeholder="1234567890"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
			</FieldGroup>
			<div className="flex justify-end gap-4">
				<Button type="button" variant="secondary" onClick={onPrev}>
					Previous
				</Button>
				<Button type="submit">Next</Button>
			</div>
		</form>
	);
}

function AddressForm({
	onNext,
	onPrev,
	defaultValues,
}: {
	onNext: (data: Address) => void;
	onPrev: () => void;
	defaultValues?: Address;
}) {
	const form = useForm<Address>({
		resolver: zodResolver(addressSchema),
		defaultValues: defaultValues || { street: "", city: "", zipCode: "" },
	});

	return (
		<form
			id="stepper-form-address"
			onSubmit={form.handleSubmit(onNext)}
			className="space-y-4"
		>
			<FieldGroup>
				<Controller
					name="street"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-address-street">
								Street Address
							</FieldLabel>
							<Input
								{...field}
								id="stepper-form-address-street"
								aria-invalid={fieldState.invalid}
								placeholder="123 Main St"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
				<Controller
					name="city"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-address-city">
								City
							</FieldLabel>
							<Input
								{...field}
								id="stepper-form-address-city"
								aria-invalid={fieldState.invalid}
								placeholder="New York"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
				<Controller
					name="zipCode"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="stepper-form-address-zipCode">
								ZIP Code
							</FieldLabel>
							<Input
								{...field}
								id="stepper-form-address-zipCode"
								aria-invalid={fieldState.invalid}
								placeholder="10001"
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>
			</FieldGroup>
			<div className="flex justify-end gap-4">
				<Button type="button" variant="secondary" onClick={onPrev}>
					Previous
				</Button>
				<Button type="submit">Next</Button>
			</div>
		</form>
	);
}

function CompleteStep({
	formData,
	onReset,
	onPrev,
}: {
	formData: {
		personal?: PersonalInfo;
		contact?: ContactInfo;
		address?: Address;
	};
	onReset: () => void;
	onPrev: () => void;
}) {
	return (
		<div className="space-y-4">
			<div className="rounded border bg-secondary p-4 space-y-3">
				<h3 className="font-semibold">Summary</h3>
				{formData.personal && (
					<div>
						<p className="text-sm text-muted-foreground">Name</p>
						<p>
							{formData.personal.firstName}{" "}
							{formData.personal.lastName}
						</p>
					</div>
				)}
				{formData.contact && (
					<div>
						<p className="text-sm text-muted-foreground">Contact</p>
						<p>{formData.contact.email}</p>
						<p>{formData.contact.phone}</p>
					</div>
				)}
				{formData.address && (
					<div>
						<p className="text-sm text-muted-foreground">Address</p>
						<p>{formData.address.street}</p>
						<p>
							{formData.address.city}, {formData.address.zipCode}
						</p>
					</div>
				)}
			</div>
			<div className="flex justify-end gap-4">
				<Button type="button" variant="secondary" onClick={onPrev}>
					Previous
				</Button>
				<Button type="button" onClick={onReset}>
					Start Over
				</Button>
			</div>
		</div>
	);
}

type FormData = {
	personal?: PersonalInfo;
	contact?: ContactInfo;
	address?: Address;
};

export function StepperWithForm() {
	return (
		<Stepper.Root className="w-full space-y-4" orientation="horizontal">
			{({ stepper }) => {
				const formData: FormData = (stepper.current.metadata as FormData) ?? {};

				return (
					<>
						<Stepper.List className="flex gap-2 flex-row items-center justify-between">
							{stepper.all.map((stepData, index) => {
								const currentIndex = stepper.all.findIndex((s) => s.id === stepper.current.id);
								const status = index < currentIndex ? "success" : index === currentIndex ? "active" : "inactive";
								const isLast =
									index === stepper.all.length - 1;
								const data = stepData as {
									id: string;
									title: string;
									description?: string;
								};

								return (
									<React.Fragment key={stepData.id}>
										<Stepper.Item
											step={stepData.id}
											className="group peer relative flex items-center gap-2"
										>
											<StepperTriggerWrapper />
											<div className="flex flex-col items-start gap-1">
												<StepperTitleWrapper
													title={data.title}
												/>
												<StepperDescriptionWrapper
													description={
														data.description
													}
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

						<div className="min-h-[280px] rounded border bg-card p-6">
							{stepper.switch({
								personal: () => (
									<PersonalInfoForm
										defaultValues={stepper.current.metadata?.personal as PersonalInfo | undefined}
										onNext={(data) => {
											stepper.current.setMetadata({
												...formData,
												personal: data,
											});
											stepper.next();
										}}
									/>
								),
								contact: () => (
									<ContactInfoForm
										defaultValues={formData.contact}
										onNext={(data) => {
											stepper.current.setMetadata({
												...formData,
												contact: data,
											});
											stepper.next();
										}}
										onPrev={() => stepper.prev()}
									/>
								),
								address: () => (
									<AddressForm
										defaultValues={formData.address}
										onNext={(data) => {
											stepper.current.setMetadata({
												...formData,
												address: data,
											});
											stepper.next();
										}}
										onPrev={() => stepper.prev()}
									/>
								),
								complete: () => (
									<CompleteStep
										formData={formData}
										onReset={() => {
											stepper.current.setMetadata({});
											stepper.reset();
										}}
										onPrev={() => stepper.prev()}
									/>
								),
							})}
						</div>
					</>
				);
			}}
		</Stepper.Root>
	);
}
