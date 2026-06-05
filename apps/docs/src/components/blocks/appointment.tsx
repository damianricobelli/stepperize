import { defineStepper } from "@stepperize/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const { Stepper } = defineStepper([
	{ id: "service", title: "Service" },
	{ id: "staff", title: "Professional" },
	{ id: "slot", title: "Date & time" },
	{ id: "confirm", title: "Confirm" },
]);

const SLOTS = ["9:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

export function AppointmentBlock() {
	const [booked, setBooked] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-xl rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<div className="grid gap-6 sm:grid-cols-[160px_1fr]">
					<Stepper.List className="flex flex-col gap-1">
						<Stepper.Items>
							{(step, index) => (
								<Stepper.Item key={step.id} step={step.id}>
									<Stepper.Trigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed data-[status=active]:bg-muted">
										<Stepper.Indicator className="group grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary data-[status=previous]:text-primary-foreground data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
											<span className="group-data-[status=previous]:hidden">
												{index + 1}
											</span>
											<Check className="hidden size-3 group-data-[status=previous]:block" />
										</Stepper.Indicator>
										<Stepper.Title className="text-sm font-medium" />
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>

					<div className="flex min-h-44 flex-col">
						<div className="flex-1">
							<Stepper.Content step="service">
								<RadioGroup defaultValue="haircut">
									<Option value="haircut" label="Haircut" hint="45 min" />
									<Option value="color" label="Color" hint="90 min" />
									<Option value="styling" label="Styling" hint="30 min" />
								</RadioGroup>
							</Stepper.Content>

							<Stepper.Content step="staff">
								<RadioGroup defaultValue="alex">
									<Option value="alex" label="Alex Rivera" hint="Senior" />
									<Option value="sam" label="Sam Lee" hint="Stylist" />
								</RadioGroup>
							</Stepper.Content>

							<Stepper.Content step="slot">
								<RadioGroup defaultValue="12:00" className="grid-cols-3">
									{SLOTS.map((time) => (
										<Label
											key={time}
											className="group relative cursor-pointer justify-center rounded-lg border py-1.5 text-center text-sm transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 has-[[data-checked]]:font-medium has-[[data-checked]]:text-primary has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
										>
											<RadioGroupItem
												value={time}
												className="!absolute !inset-0 !h-full !w-full cursor-pointer opacity-0"
											/>
											{time}
										</Label>
									))}
								</RadioGroup>
							</Stepper.Content>

							<Stepper.Content step="confirm">
								<div className="rounded-lg border bg-muted/40 p-4 text-sm">
									<p className="font-medium">
										{booked ? "Appointment booked" : "Haircut · Alex Rivera"}
									</p>
									<p className="mt-1 text-muted-foreground">
										{booked
											? "A confirmation email has been sent."
											: "Tomorrow at 12:00 — see you then!"}
									</p>
								</div>
							</Stepper.Content>
						</div>

						<Stepper.Actions className="mt-4 flex justify-end gap-2">
							<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
								Back
							</Stepper.Prev>
							{booked ? (
								<button
									type="button"
									onClick={() => {
										setBooked(false);
										stepper.reset();
									}}
									className={buttonVariants()}
								>
									Book another
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setBooked(true)}
									className={buttonVariants()}
								>
									Book appointment
								</button>
							) : (
								<Stepper.Next className={buttonVariants()}>
									Continue
								</Stepper.Next>
							)}
						</Stepper.Actions>
					</div>
				</div>
			)}
		</Stepper.Root>
	);
}

function Option({
	value,
	label,
	hint,
}: {
	value: string;
	label: string;
	hint: string;
}) {
	return (
		<Label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-normal transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
			<RadioGroupItem value={value} />
			<span className="font-medium">{label}</span>
			<span className="ml-auto text-xs text-muted-foreground">{hint}</span>
		</Label>
	);
}
