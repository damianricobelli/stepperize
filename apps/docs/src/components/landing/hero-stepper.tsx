"use client";

import { defineStepper } from "@stepperize/react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const demo = defineStepper([
	{
		id: "account",
		title: "Account",
		hint: "Tell us who you are",
		fields: ["Full name", "Email address"],
	},
	{
		id: "shipping",
		title: "Shipping",
		hint: "Where it should go",
		fields: ["Street address", "City & ZIP"],
	},
	{
		id: "payment",
		title: "Payment",
		hint: "How you'll pay",
		fields: ["Card number", "Expiry & CVC"],
	},
	{
		id: "review",
		title: "Review",
		hint: "Confirm and submit",
		fields: ["Order summary", "Terms & conditions"],
	},
]);

/**
 * A real, interactive Stepperize instance used as the hero visual. Built only
 * with `Stepper.*` primitives + tokens — it is the product demonstrating itself.
 */
export function HeroStepper() {
	const { Stepper } = demo;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (submitTimeoutRef.current) {
				clearTimeout(submitTimeoutRef.current);
			}
		};
	}, []);

	function submit() {
		if (isSubmitting || isSubmitted) return;

		setIsSubmitting(true);
		submitTimeoutRef.current = setTimeout(() => {
			setIsSubmitting(false);
			setIsSubmitted(true);
		}, 650);
	}

	return (
		<Stepper.Root
			linear
			className="relative w-full overflow-hidden rounded-2xl border bg-card/80 p-5 shadow-xl backdrop-blur-sm sm:p-6"
		>
			{({ stepper }) => (
				<>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-heading text-sm font-semibold">
								{stepper.current.title}
							</p>
							<p className="text-xs text-muted-foreground">
								{stepper.current.hint}
							</p>
						</div>
						<span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
							{stepper.index + 1}/{stepper.count}
						</span>
					</div>

					<Stepper.List className="mt-5 flex items-center gap-2">
						<Stepper.Items>
							{(step, index) => (
								<Stepper.Item
									key={step.id}
									step={step.id}
									className="flex flex-1 items-center gap-2"
								>
									<Stepper.Trigger className="group flex w-full flex-col items-center gap-2">
										<Stepper.Indicator className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300 group-data-[status=active]:border-primary group-data-[status=active]:bg-primary group-data-[status=active]:text-primary-foreground group-data-[status=previous]:border-primary/40 group-data-[status=previous]:bg-primary/10 group-data-[status=previous]:text-primary group-data-[status=upcoming]:border-border group-data-[status=upcoming]:bg-muted group-data-[status=upcoming]:text-muted-foreground">
											{stepper.status(step.id) === "previous" ? (
												<Check className="h-4 w-4" aria-hidden />
											) : (
												index + 1
											)}
										</Stepper.Indicator>
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>

					<div className="mt-5 space-y-2.5 rounded-xl border bg-muted/30 p-4">
						{stepper.current.fields.map((field) => (
							<div key={field}>
								<p className="text-[11px] font-medium text-muted-foreground">
									{field}
								</p>
								<div className="mt-1 h-8 rounded-md border bg-background/80 px-2.5 py-1.5">
									<div className="h-full w-1/2 rounded bg-muted-foreground/15" />
								</div>
							</div>
						))}
						<p className="pt-0.5 text-[10px] text-muted-foreground/70">
							Your fields render here — Stepperize only tracks the flow.
						</p>
					</div>

					<div className="mt-5 flex items-center justify-between gap-3">
						<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
							Back
						</Stepper.Prev>
						<div className="flex items-center gap-1.5">
							{stepper.steps.map((s) => (
								<span
									key={s.id}
									className={cn(
										"h-1.5 rounded-full transition-all duration-300",
										stepper.is(s.id) ? "w-5 bg-primary" : "w-1.5 bg-border",
									)}
								/>
							))}
						</div>
						{stepper.isLast ? (
							<button
								type="button"
								onClick={submit}
								disabled={isSubmitting || isSubmitted}
								className="inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-4 animate-spin" aria-hidden />
										Sending
									</>
								) : (
									"Submit"
								)}
							</button>
						) : (
							<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
								Next
							</Stepper.Next>
						)}
					</div>

					{isSubmitted && (
						<div
							aria-live="polite"
							className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-6 text-center backdrop-blur-sm duration-500 animate-in fade-in-0 zoom-in-95"
						>
							<div className="relative flex size-20 items-center justify-center">
								<span className="absolute inset-0 animate-ping rounded-full bg-success/20" />
								<span className="relative flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/20 duration-500 animate-in zoom-in-50">
									<Check className="size-8" aria-hidden />
								</span>
							</div>
							<p className="mt-5 font-heading text-lg font-semibold">
								Submitted successfully
							</p>
							<p className="mt-1 max-w-xs text-sm text-muted-foreground">
								The final action is yours, while Stepperize keeps the flow state
								predictable.
							</p>
							<button
								type="button"
								onClick={() => {
									setIsSubmitted(false);
									stepper.reset();
								}}
								className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
							>
								<RotateCcw className="size-3.5" aria-hidden />
								Restart
							</button>
						</div>
					)}
				</>
			)}
		</Stepper.Root>
	);
}
