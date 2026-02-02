"use client";

import { cn } from "@/lib/cn";
import { defineStepper } from "@stepperize/react";
import { CheckCircle, CreditCard, Home, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

const stepper = defineStepper(
	{ id: "personal-info", label: "Personal Info", icon: User },
	{ id: "address", label: "Address", icon: Home },
	{ id: "payment", label: "Payment", icon: CreditCard },
	{ id: "success", label: "Done", icon: CheckCircle }
);

const slideVariants = {
	enter: { opacity: 0 },
	center: { opacity: 1 },
	exit: { opacity: 0 },
};

export const DemoSection = ({ className }: { className?: string }) => {
	return (
		<stepper.Scoped>
			<section id="demo" className={cn("px-4 sm:px-6 lg:px-8 py-20", className)}>
				<DemoContent />
			</section>
		</stepper.Scoped>
	);
};

// #region DemoContent

const DemoContent = () => {
	const methods = stepper.useStepper();

	const [formData, setFormData] = React.useState({
		firstName: "",
		lastName: "",
		email: "",
		address: "",
		city: "",
		zipCode: "",
		cardName: "",
		cardNumber: "",
		expiry: "",
		cvv: "",
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!methods.state.isLast) {
			methods.navigation.next();
		}
	};

	const isComplete = methods.state.isLast;

	return (
		<div className="max-w-2xl mx-auto">
			<h2 className="text-2xl font-semibold text-gray-12 mb-2 text-center">See it in action</h2>
			<p className="text-gray-11 text-center mb-10 text-sm">Multi-step form with @stepperize/react</p>

			<div className="border border-gray-6 rounded-xl overflow-hidden bg-gray-2/30">
				<StepperHeader methods={methods} isComplete={isComplete} />
				<div className="p-6">
					<form onSubmit={handleSubmit}>
						<AnimatePresence mode="wait">
							{methods.flow.when("personal-info", () => (
								<motion.div
									key="step1"
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.15 }}
								>
									<PersonalInfoStep formData={formData} handleChange={handleChange} />
								</motion.div>
							))}
							{methods.flow.when("address", () => (
								<motion.div
									key="step2"
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.15 }}
								>
									<AddressStep formData={formData} handleChange={handleChange} />
								</motion.div>
							))}
							{methods.flow.when("payment", () => (
								<motion.div
									key="step3"
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.15 }}
								>
									<PaymentStep formData={formData} handleChange={handleChange} />
								</motion.div>
							))}
							{methods.flow.when("success", () => (
								<motion.div
									key="step4"
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.15 }}
								>
									<CompletionScreen
										onReset={() => {
											methods.navigation.reset();
										}}
									/>
								</motion.div>
							))}
						</AnimatePresence>
						<div className="mt-6 flex justify-between">
							{!methods.state.isFirst && (
								<button
									type="button"
									onClick={methods.navigation.prev}
									className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-7 text-gray-12 hover:bg-gray-4 transition-colors"
								>
									Back
								</button>
							)}
							<button
								type="submit"
								className="ml-auto px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-9 hover:bg-indigo-10 transition-colors"
							>
								{isComplete ? "Submit" : "Next"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

// #endregion DemoContent

// #region InputField

const InputField = ({
	label,
	name,
	type = "text",
	value,
	onChange,
	placeholder,
	required = false,
}: {
	label: string;
	name: string;
	type?: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder?: string;
	required?: boolean;
}) => (
	<div>
		<label htmlFor={name} className="block text-sm font-medium text-gray-12 mb-1">
			{label}
		</label>
		<input
			type={type}
			name={name}
			id={name}
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			required={required}
			className="w-full px-3 py-2 text-sm bg-gray-2 border border-gray-6 rounded-lg text-gray-12 placeholder:text-gray-9 focus:outline-none focus:ring-2 focus:ring-indigo-8 focus:border-indigo-8"
		/>
	</div>
);

// #endregion InputField

// #region StepperHeader

const StepperHeader = ({
	methods,
	isComplete,
}: {
	methods: ReturnType<typeof stepper.useStepper>;
	isComplete: boolean;
}) => {
	const steps = methods.state.all;
	const currentIndex = methods.state.current.index;
	const progress =
		methods.state.current.data.id === steps[steps.length - 1].id || isComplete
			? "100%"
			: `${(currentIndex / (steps.length - 1)) * 100}%`;

	return (
		<nav className="bg-gray-3/50 border-b border-gray-6 px-4 py-5">
			<ol className="flex justify-between items-center relative">
				{/* Line from center of first step to center of last step (4 steps = 12.5% / 87.5%) */}
				<div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-gray-6 z-0 rounded-full">
					<div
						className="h-full bg-indigo-9 rounded-full transition-all duration-300"
						style={{ width: progress }}
					/>
				</div>
				{steps.map((step, index) => {
					const isActive = step.id === methods.state.current.data.id;
					const isPast = index < currentIndex;
					return (
						<li
							key={step.id}
							className="flex flex-col items-center relative z-10 flex-1"
						>
							<button
								type="button"
								onClick={() => !isComplete && methods.navigation.goTo(step.id)}
								className={cn(
									"size-9 rounded-full flex items-center justify-center transition-colors shrink-0",
									isPast || (isComplete && index < steps.length - 1)
										? "bg-indigo-9 text-white"
										: isActive || (isComplete && index === steps.length - 1)
											? "bg-indigo-9 text-white"
											: "bg-gray-6 text-gray-10",
								)}
								disabled={isComplete}
							>
								{isPast || (isComplete && index <= currentIndex) ? (
									<CheckCircle className="size-4" />
								) : (
									<step.icon className="size-4" />
								)}
							</button>
							<span
								className={cn(
									"text-xs mt-1.5 hidden sm:block",
									isActive ? "text-gray-12 font-medium" : "text-gray-10",
								)}
							>
								{step.label}
							</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
};

// #endregion StepperHeader

// #region PersonalInfoStep

const PersonalInfoStep = ({
	formData,
	handleChange,
}: {
	formData: Record<string, string>;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
	<div>
		<h3 className="text-base font-semibold text-gray-12 mb-4">Personal Information</h3>
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
			<InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
			<div className="sm:col-span-2">
				<InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
			</div>
		</div>
	</div>
);

// #endregion PersonalInfoStep

// #region AddressStep

const AddressStep = ({
	formData,
	handleChange,
}: {
	formData: Record<string, string>;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
	<div>
		<h3 className="text-base font-semibold text-gray-12 mb-4">Address</h3>
		<div className="space-y-4">
			<InputField label="Street Address" name="address" value={formData.address} onChange={handleChange} required />
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<InputField label="City" name="city" value={formData.city} onChange={handleChange} required />
				<InputField label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} required />
			</div>
		</div>
	</div>
);

// #endregion AddressStep

// #region PaymentStep

const PaymentStep = ({
	formData,
	handleChange,
}: {
	formData: Record<string, string>;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
	<div>
		<h3 className="text-base font-semibold text-gray-12 mb-4">Payment</h3>
		<div className="space-y-4">
			<InputField label="Name on Card" name="cardName" value={formData.cardName} onChange={handleChange} required />
			<InputField
				label="Card Number"
				name="cardNumber"
				value={formData.cardNumber}
				onChange={handleChange}
				placeholder="XXXX XXXX XXXX XXXX"
				required
			/>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<InputField
					label="Expiry"
					name="expiry"
					value={formData.expiry}
					onChange={handleChange}
					placeholder="MM/YY"
					required
				/>
				<InputField label="CVV" name="cvv" value={formData.cvv} onChange={handleChange} placeholder="XXX" required />
			</div>
		</div>
	</div>
);

// #endregion PaymentStep

// #region CompletionScreen

const CompletionScreen = ({ onReset }: { onReset: () => void }) => (
	<div className="text-center py-8">
		<div className="size-14 bg-green-9 rounded-full flex items-center justify-center mx-auto mb-4">
			<CheckCircle className="size-7 text-white" />
		</div>
		<h3 className="text-lg font-semibold text-gray-12 mb-1">Done!</h3>
		<p className="text-sm text-gray-11 mb-6">Form submitted successfully.</p>
		<button
			type="button"
			onClick={onReset}
			className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-9 hover:bg-indigo-10 transition-colors"
		>
			Start over
		</button>
	</div>
);

// #endregion CompletionScreen
