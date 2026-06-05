import { defineStepper } from "@stepperize/react";
import { Check, Clock } from "lucide-react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "submitted", title: "Submitted" },
	{ id: "manager", title: "Manager" },
	{ id: "finance", title: "Finance" },
	{ id: "approved", title: "Approved" },
]);

export function ApprovalFlowBlock() {
	const [acknowledged, setAcknowledged] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<div className="mb-5 flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold">Expense #2043</p>
							<p className="text-xs text-muted-foreground">$1,250 · Travel</p>
						</div>
						<span
							className="rounded-full bg-chart-3/15 px-2.5 py-1 text-xs font-medium text-chart-3 data-[done=true]:bg-chart-2/15 data-[done=true]:text-chart-2"
							data-done={stepper.isLast}
						>
							{stepper.isLast ? "Approved" : "Pending"}
						</span>
					</div>

					<Stepper.List className="flex items-start">
						<Stepper.Items>
							{(step, index) => (
								<div
									key={step.id}
									className="flex flex-1 items-start last:flex-none"
								>
									<Stepper.Item
										step={step.id}
										className="flex flex-col items-center gap-1.5"
									>
										<Stepper.Indicator className="group grid size-9 place-items-center rounded-full border-2 transition-colors data-[status=active]:border-chart-3 data-[status=active]:text-chart-3 data-[status=previous]:border-chart-2 data-[status=previous]:bg-chart-2 data-[status=previous]:text-white data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
											<Check className="hidden size-4 group-data-[status=previous]:block" />
											<Clock className="hidden size-4 group-data-[status=active]:block" />
											<span className="text-xs font-semibold group-data-[status=active]:hidden group-data-[status=previous]:hidden">
												{index + 1}
											</span>
										</Stepper.Indicator>
										<Stepper.Title className="text-[11px] font-medium" />
									</Stepper.Item>
									{index < stepper.count - 1 && (
										<div
											className="mx-1 mt-4.5 h-0.5 flex-1 rounded bg-border data-[done=true]:bg-chart-2"
											data-done={index < stepper.index}
										/>
									)}
								</div>
							)}
						</Stepper.Items>
					</Stepper.List>

					<Stepper.Content
						step={stepper.current.id}
						className="mt-5 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground"
					>
						{acknowledged
							? "Approval acknowledged. The reimbursement is queued for payout."
							: stepper.isLast
								? "All approvals collected. Reimbursement scheduled."
								: `Waiting on ${stepper.current.title} approval.`}
					</Stepper.Content>

					<Stepper.Actions className="mt-5 flex gap-2">
						<button
							type="button"
							onClick={() => stepper.prev()}
							disabled={!stepper.canPrev}
							className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
						>
							Send back
						</button>
						{acknowledged ? (
							<button
								type="button"
								onClick={() => {
									setAcknowledged(false);
									stepper.reset();
								}}
								className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Restart flow
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setAcknowledged(true)}
								className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Acknowledge approval
							</button>
						) : (
							<Stepper.Next className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
								Approve
							</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}
