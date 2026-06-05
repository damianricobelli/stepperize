import { defineStepper } from "@stepperize/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const { Stepper } = defineStepper([
	{ id: "plan", title: "Plan" },
	{ id: "billing", title: "Billing" },
	{ id: "payment", title: "Payment" },
	{ id: "done", title: "Done" },
]);

const PLANS = [
	{ id: "starter", name: "Starter", price: "$0", note: "For individuals" },
	{ id: "pro", name: "Pro", price: "$12", note: "For small teams" },
	{ id: "team", name: "Team", price: "$29", note: "For companies" },
];

export function PlanPickerBlock() {
	const [openedDashboard, setOpenedDashboard] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<Stepper.List className="flex items-center justify-between">
						<Stepper.Items>
							{(step, index) => (
								<div
									key={step.id}
									className="flex flex-1 items-center last:flex-none"
								>
									<Stepper.Item
										step={step.id}
										className="flex items-center gap-2"
									>
										<Stepper.Indicator className="group grid size-7 place-items-center rounded-full border text-xs font-semibold transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary data-[status=previous]:text-primary-foreground data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
											<span className="group-data-[status=previous]:hidden">
												{index + 1}
											</span>
											<Check className="hidden size-3.5 group-data-[status=previous]:block" />
										</Stepper.Indicator>
										<Stepper.Title className="hidden text-xs font-medium sm:block" />
									</Stepper.Item>
									{index < stepper.count - 1 && (
										<div className="mx-2 h-px flex-1 bg-border" />
									)}
								</div>
							)}
						</Stepper.Items>
					</Stepper.List>

					<div className="mt-6 min-h-40">
						<Stepper.Content step="plan">
							<RadioGroup defaultValue="pro">
								{PLANS.map((plan) => (
									<Label
										key={plan.id}
										className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
									>
										<RadioGroupItem value={plan.id} />
										<span className="flex-1">
											<span className="block text-sm font-medium">
												{plan.name}
											</span>
											<span className="block text-xs text-muted-foreground">
												{plan.note}
											</span>
										</span>
										<span className="text-sm font-semibold">
											{plan.price}
											<span className="text-xs font-normal text-muted-foreground">
												/mo
											</span>
										</span>
									</Label>
								))}
							</RadioGroup>
						</Stepper.Content>

						<Stepper.Content step="billing">
							<RadioGroup defaultValue="monthly">
								<Cycle
									value="monthly"
									label="Monthly"
									hint="$12 billed monthly"
								/>
								<Cycle
									value="yearly"
									label="Yearly"
									hint="$120 billed yearly — save 16%"
								/>
							</RadioGroup>
						</Stepper.Content>

						<Stepper.Content step="payment" className="space-y-3">
							<Field label="Card number" placeholder="4242 4242 4242 4242" />
							<div className="grid grid-cols-2 gap-3">
								<Field label="Expiry" placeholder="12 / 28" />
								<Field label="CVC" placeholder="123" />
							</div>
						</Stepper.Content>

						<Stepper.Content
							step="done"
							className="grid place-items-center gap-2 py-6 text-center"
						>
							<span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
								<Check className="size-5" />
							</span>
							<p className="text-sm font-medium">You're on Pro 🎉</p>
							{openedDashboard && (
								<p className="text-xs text-muted-foreground">
									Dashboard opened with your Pro workspace.
								</p>
							)}
						</Stepper.Content>
					</div>

					<Stepper.Actions className="mt-6 flex justify-between">
						<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
							Back
						</Stepper.Prev>
						{openedDashboard ? (
							<button
								type="button"
								onClick={() => {
									setOpenedDashboard(false);
									stepper.reset();
								}}
								className={buttonVariants()}
							>
								Restart checkout
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setOpenedDashboard(true)}
								className={buttonVariants()}
							>
								Go to dashboard
							</button>
						) : (
							<Stepper.Next className={buttonVariants()}>
								{stepper.index === stepper.count - 2 ? "Subscribe" : "Continue"}
							</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}

function Cycle({
	value,
	label,
	hint,
}: {
	value: string;
	label: string;
	hint: string;
}) {
	return (
		<Label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
			<RadioGroupItem value={value} />
			<span className="font-medium">{label}</span>
			<span className="ml-auto text-xs text-muted-foreground">{hint}</span>
		</Label>
	);
}

function Field({
	label,
	...props
}: { label: string } & React.ComponentProps<"input">) {
	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>
			<Input {...props} />
		</div>
	);
}
