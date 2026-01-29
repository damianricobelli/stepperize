"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { defineStepper, Get } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/registry/new-york/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/registry/new-york/ui/form";
import { Input } from "@/registry/new-york/ui/input";

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

const { Stepper, ...stepperDefinition } = defineStepper([
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
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
				<FormField
					control={form.control}
					name="firstName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>First Name</FormLabel>
							<FormControl>
								<Input placeholder="John" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="lastName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Last Name</FormLabel>
							<FormControl>
								<Input placeholder="Doe" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end">
					<Button type="submit">Next</Button>
				</div>
			</form>
		</Form>
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
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="john@example.com"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Phone</FormLabel>
							<FormControl>
								<Input placeholder="1234567890" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end gap-4">
					<Button type="button" variant="secondary" onClick={onPrev}>
						Previous
					</Button>
					<Button type="submit">Next</Button>
				</div>
			</form>
		</Form>
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
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
				<FormField
					control={form.control}
					name="street"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Street Address</FormLabel>
							<FormControl>
								<Input placeholder="123 Main St" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="city"
					render={({ field }) => (
						<FormItem>
							<FormLabel>City</FormLabel>
							<FormControl>
								<Input placeholder="New York" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="zipCode"
					render={({ field }) => (
						<FormItem>
							<FormLabel>ZIP Code</FormLabel>
							<FormControl>
								<Input placeholder="10001" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end gap-4">
					<Button type="button" variant="secondary" onClick={onPrev}>
						Previous
					</Button>
					<Button type="submit">Next</Button>
				</div>
			</form>
		</Form>
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
							{stepper.steps.map((stepInfo, index) => {
								const { status } = stepInfo;
								const isLast =
									index === stepper.steps.length - 1;
								const stepData = stepInfo.data as {
									id: string;
									title: string;
									description?: string;
								};

								return [
									<Stepper.Item
										key={stepInfo.data.id}
										step={stepInfo.data.id}
										className="group peer relative flex items-center gap-2"
									>
										<StepperTriggerWrapper />
										<div className="flex flex-col items-start gap-1">
											<StepperTitleWrapper
												title={stepData.title}
											/>
											<StepperDescriptionWrapper
												description={
													stepData.description
												}
											/>
										</div>
									</Stepper.Item>,
									<StepperSeparatorWithStatus
										key={`separator-${stepInfo.data.id}`}
										status={status}
										isLast={isLast}
									/>,
								];
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
