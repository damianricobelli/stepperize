"use client";

import { cn } from "@/lib/cn";
import { defineStepper } from "@stepperize/react";
import { CreditCard, Home, User } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

const stepper = defineStepper([
	{ id: "personal-info", label: "Personal Information", icon: User },
	{ id: "address", label: "Address Information", icon: Home },
	{ id: "payment", label: "Payment Information", icon: CreditCard },
	{ id: "success", label: "Success", icon: CheckCircle },
]);

const slideVariants = {
	enter: (direction: number) => ({ x: direction > 0 ? 500 : -500, opacity: 0 }),
	center: { x: 0, opacity: 1 },
	exit: (direction: number) => ({ x: direction < 0 ? 500 : -500, opacity: 0 }),
};

export const DemoSection = ({ className }: { className?: string }) => {
	return (
		<stepper.Scoped>
			<section id="demo" className={cn("px-4 sm:px-6 lg:px-8 relative", className)}>
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
		if (!methods.isLast) {
			methods.next();
		}
	};

	const isComplete = methods.isLast;

	return (
		<div className="max-w-5xl mx-auto relative z-10">
			<motion.div
				className="text-center mb-12"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
				viewport={{ once: true, margin: "-100px" }}
			>
				<motion.h2
					className="text-3xl sm:text-4xl font-bold mb-4"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					viewport={{ once: true, margin: "-100px" }}
				>
					<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-9 via-purple-9 to-pink-9">
						See It In Action
					</span>
				</motion.h2>
				<motion.p
					className="max-w-2xl mx-auto text-lg text-gray-12"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					viewport={{ once: true, margin: "-100px" }}
				>
					Interactive demo of a multi-step form using @stepperize/react
				</motion.p>
			</motion.div>

			<motion.div
				className="backdrop-blur-sm border rounded-xl overflow-hidden shadow-xl"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.5,
					delay: 0.2,
					type: "spring",
					stiffness: 50,
				}}
				viewport={{ once: true, margin: "-100px" }}
			>
				<StepperHeader methods={methods} isComplete={isComplete} />
				<div className="p-8">
					<form onSubmit={handleSubmit}>
						<AnimatePresence mode="wait" custom={methods.current.data.id}>
							{methods.when("personal-info", () => (
								<motion.div
									key="step1"
									custom={methods.current.data.id}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{
										x: { type: "spring", stiffness: 300, damping: 30 },
										opacity: { duration: 0.2 },
									}}
								>
									<PersonalInfoStep formData={formData} handleChange={handleChange} />
								</motion.div>
							))}
							{methods.when("address", () => (
								<motion.div
									key="step2"
									custom={methods.current.data.id}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{
										x: { type: "spring", stiffness: 300, damping: 30 },
										opacity: { duration: 0.2 },
									}}
								>
									<AddressStep formData={formData} handleChange={handleChange} />
								</motion.div>
							))}
							{methods.when("payment", () => (
								<motion.div
									key="step3"
									custom={methods.current.data.id}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{
										x: { type: "spring", stiffness: 300, damping: 30 },
										opacity: { duration: 0.2 },
									}}
								>
									<PaymentStep formData={formData} handleChange={handleChange} />
								</motion.div>
							))}
							{methods.when("success", () => (
								<motion.div
									key="step4"
									custom={methods.current.data.id}
									variants={slideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{
										x: { type: "spring", stiffness: 300, damping: 30 },
										opacity: { duration: 0.2 },
									}}
								>
									<CompletionScreen
										onReset={() => {
											methods.reset();
										}}
									/>
								</motion.div>
							))}
						</AnimatePresence>
						<div className="mt-8 flex justify-between">
							{!methods.isFirst && (
								<motion.button
									type="button"
									onClick={methods.prev}
									className="px-4 py-2 border border-gray-11 text-gray-12 rounded-md hover:bg-gray-12 transition-colors"
									whileHover={{
										scale: 1.05,
										backgroundColor: "rgba(99, 102, 241, 0.2)",
									}}
									whileTap={{ scale: 0.95 }}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.3 }}
								>
									Back
								</motion.button>
							)}
							<motion.div
								className="ml-auto"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.3 }}
							>
								<motion.button
									type="submit"
									className="px-6 py-2 bg-gradient-to-r from-indigo-11 to-purple-11 text-gray-1 rounded-md hover:from-indigo-12 hover:to-purple-12 transition-all duration-300 shadow-md hover:shadow-indigo-11/30"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									{isComplete ? "Submit" : "Next"}
								</motion.button>
							</motion.div>
						</div>
					</form>
				</div>
			</motion.div>
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
}) => {
	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { type: "spring", stiffness: 100, damping: 10 },
		},
	} as const;
	return (
		<motion.div variants={itemVariants}>
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
				className="w-full px-3 py-2 bg-gray-1 border border-gray-4 rounded-md text-gray-12 focus:outline-none focus:ring-2 focus:ring-indigo-11 transition-all duration-200"
			/>
		</motion.div>
	);
};

// #endregion InputField

// #region StepperHeader

const StepperHeader = ({
	methods,
	isComplete,
}: {
	methods: ReturnType<typeof stepper.useStepper>;
	isComplete: boolean;
}) => {
	const currentIndex = methods.steps.findIndex((step: any) => step.data.id === methods.current.data.id);

	return (
		<nav className="bg-gray-4/30 p-8">
			<ol className="flex justify-between items-center relative">
				<div className="absolute top-5 left-4 sm:left-12 right-4 h-0.5 bg-gray-9 z-0">
					<motion.div
						className="h-full bg-indigo-11"
						initial={{ width: "0%" }}
						animate={{
							width:
								methods.current.data.id === methods.steps[methods.steps.length - 1].data.id || isComplete
									? "100%"
									: `${(currentIndex / (methods.steps.length - 1)) * 100}%`,
						}}
						transition={{ duration: 0.5 }}
					/>
				</div>
				{methods.steps.map((step, index: number) => {
					const isActive = step.data.id === methods.current.data.id;
					return (
						<motion.li
							key={step.data.id}
							className="flex flex-col items-center relative flex-shrink-0 z-10"
							onClick={() => methods.goTo(step.data.id)}
							whileHover={!isComplete ? { scale: 1.05 } : {}}
							whileTap={!isComplete ? { scale: 0.95 } : {}}
						>
							<motion.div
								className={cn(
									"size-10 rounded-full flex items-center justify-center cursor-pointer",
									index <= currentIndex
										? "bg-indigo-11 text-indigo-1"
										: isActive || isComplete
											? "bg-green-11 text-green-1"
											: "bg-gray-12 text-gray-1",
								)}
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{
									type: "spring",
									stiffness: 200,
									damping: 10,
									delay: 0.1 * index,
								}}
							>
								{index < currentIndex || isComplete ? (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 200 }}
									>
										<CheckCircle className="size-5" />
									</motion.div>
								) : (
									<step.data.icon className="size-5" />
								)}
							</motion.div>
							<motion.span
								className={cn(
									"text-xs mt-2 hidden sm:block",
									isActive ? "text-indigo-11 font-medium" : !isComplete && "text-gray-11",
								)}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.2 + 0.1 * index }}
							>
								{step.data.label}
							</motion.span>
						</motion.li>
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
	formData: any;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1, delayChildren: 0.2 },
		},
	};
	return (
		<motion.div variants={containerVariants} initial="hidden" animate="visible">
			<h3 className="text-xl font-semibold mb-6 text-gray-12">Personal Information</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
				<InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
				<div className="md:col-span-2">
					<InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
				</div>
			</div>
		</motion.div>
	);
};

// #endregion PersonalInfoStep

// #region AddressStep

const AddressStep = ({
	formData,
	handleChange,
}: {
	formData: any;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1, delayChildren: 0.2 },
		},
	};

	return (
		<motion.div variants={containerVariants} initial="hidden" animate="visible">
			<h3 className="text-xl font-semibold mb-6 text-gray-12">Address Information</h3>
			<div className="space-y-6">
				<InputField label="Street Address" name="address" value={formData.address} onChange={handleChange} required />
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<InputField label="City" name="city" value={formData.city} onChange={handleChange} required />
					<InputField label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} required />
				</div>
			</div>
		</motion.div>
	);
};

// #endregion AddressStep

// #region PaymentStep

const PaymentStep = ({
	formData,
	handleChange,
}: {
	formData: any;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1, delayChildren: 0.2 },
		},
	};

	return (
		<motion.div variants={containerVariants} initial="hidden" animate="visible">
			<h3 className="text-xl font-semibold mb-6 text-gray-12">Payment Information</h3>
			<div className="space-y-6">
				<InputField label="Name on Card" name="cardName" value={formData.cardName} onChange={handleChange} required />
				<InputField
					label="Card Number"
					name="cardNumber"
					value={formData.cardNumber}
					onChange={handleChange}
					placeholder="XXXX XXXX XXXX XXXX"
					required
				/>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<InputField
						label="Expiry Date"
						name="expiry"
						value={formData.expiry}
						onChange={handleChange}
						placeholder="MM/YY"
						required
					/>
					<InputField label="CVV" name="cvv" value={formData.cvv} onChange={handleChange} placeholder="XXX" required />
				</div>
			</div>
		</motion.div>
	);
};

// #endregion PaymentStep

// #region CompletionScreen

const CompletionScreen = ({ onReset }: { onReset: () => void }) => (
	<motion.div
		className="text-center py-10"
		initial={{ opacity: 0, scale: 0.9 }}
		animate={{ opacity: 1, scale: 1 }}
		transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
	>
		<motion.div
			className="size-20 bg-green-11 rounded-full flex items-center justify-center mx-auto mb-6"
			initial={{ scale: 0 }}
			animate={{ scale: 1 }}
			transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
		>
			<CheckCircle className="size-10 text-gray-1" />
		</motion.div>
		<motion.h3
			className="text-2xl font-bold text-gray-12 mb-2"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			Success!
		</motion.h3>
		<motion.p
			className="text-gray-12 mb-6"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4 }}
		>
			Your form has been submitted successfully.
		</motion.p>
		<motion.button
			type="button"
			onClick={onReset}
			className="px-4 py-2 bg-indigo-11 text-gray-1 rounded-md hover:bg-indigo-12 transition-colors"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.5 }}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
		>
			Start Over
		</motion.button>
	</motion.div>
);

// #endregion CompletionScreen
