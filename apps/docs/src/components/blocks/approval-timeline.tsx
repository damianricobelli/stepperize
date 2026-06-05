import { defineStepper } from "@stepperize/react";
import { Check, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";

// Every field beyond `id` is typed user data: it flows through `stepper.current`,
// the `Items` render prop, and `stepper.all` with full inference — no casts, no
// lookup tables. This is how Stepperize models per-step metadata.
const { Stepper } = defineStepper([
	{
		id: "submitted",
		title: "Submitted",
		actor: "Jane Cooper",
		role: "Requester",
		slaHours: 0,
	},
	{
		id: "manager",
		title: "Manager review",
		actor: "Tom Hardy",
		role: "Engineering Manager",
		slaHours: 24,
	},
	{
		id: "finance",
		title: "Finance approval",
		actor: "Priya Patel",
		role: "Finance",
		slaHours: 48,
	},
	{
		id: "approved",
		title: "Approved",
		actor: "System",
		role: "Automated",
		slaHours: 0,
	},
]);

export function ApprovalTimelineBlock() {
	const [acknowledged, setAcknowledged] = useState(false);

	return (
		<Stepper.Root
			linear
			orientation="vertical"
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<div className="mb-5 flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold">Expense #2043</p>
							<p className="text-xs text-muted-foreground">$1,250 · Travel</p>
						</div>
						{/* `stepper.current` is narrowed to the step's exact type, so its
                metadata is available with no casting. */}
						<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
							<ShieldCheck className="size-3.5" />
							{stepper.current.role}
						</span>
					</div>

					<Stepper.List orientation="vertical" className="flex flex-col">
						<Stepper.Items>
							{(step, index) => (
								<Stepper.Item
									key={step.id}
									step={step.id}
									className="group/item relative pb-6 pl-9 last:pb-0"
								>
									{index < stepper.count - 1 && (
										<div className="absolute top-7 bottom-1 left-3.25 w-px bg-border group-data-[status=previous]/item:bg-primary" />
									)}
									<Stepper.Trigger className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed">
										<Stepper.Indicator className="group absolute left-0 grid size-7 place-items-center rounded-full border bg-background text-xs font-semibold transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary data-[status=previous]:text-primary-foreground data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
											<span className="group-data-[status=previous]:hidden">
												{index + 1}
											</span>
											<Check className="hidden size-3.5 group-data-[status=previous]:block" />
										</Stepper.Indicator>
										<span className="flex-1">
											<span className="flex items-center justify-between gap-2">
												<Stepper.Title className="text-sm font-medium leading-none" />
												{/* Typed metadata read straight off `step` in the Items
                            render prop. */}
												{step.slaHours > 0 && (
													<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
														<Clock className="size-3" />
														{step.slaHours}h SLA
													</span>
												)}
											</span>
											<span className="mt-1 block text-xs text-muted-foreground">
												{step.actor} · {step.role}
											</span>
										</span>
									</Stepper.Trigger>

									<div className="mt-3 hidden group-data-[status=active]/item:block">
										<p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
											{acknowledged
												? "Approval acknowledged. Audit trail closed."
												: stepper.isLast
													? "All approvals collected. Reimbursement scheduled."
													: `Awaiting ${step.actor} — due within ${step.slaHours}h.`}
										</p>
										<Stepper.Actions className="mt-3 flex gap-2">
											<Stepper.Prev className="inline-flex h-8 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
												Send back
											</Stepper.Prev>
											{acknowledged ? (
												<button
													type="button"
													onClick={() => {
														setAcknowledged(false);
														stepper.reset();
													}}
													className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
												>
													Restart flow
												</button>
											) : stepper.isLast ? (
												<button
													type="button"
													onClick={() => setAcknowledged(true)}
													className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
												>
													Acknowledge
												</button>
											) : (
												<Stepper.Next className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
													Approve
												</Stepper.Next>
											)}
										</Stepper.Actions>
									</div>
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>
				</>
			)}
		</Stepper.Root>
	);
}
