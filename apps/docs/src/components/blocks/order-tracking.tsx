import { defineStepper } from "@stepperize/react";
import { Check, Package, Truck, Warehouse } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";

// `location`, `detail`, and `eta` are typed metadata on each step. They're read
// back off `stepper.current` with full inference — no separate status table.
const steps = [
	{
		id: "placed",
		title: "Order placed",
		icon: Check,
		location: "Online",
		detail: "We received your order.",
		eta: "Ships in 1 day",
	},
	{
		id: "packed",
		title: "Packed",
		icon: Package,
		location: "Newark, NJ",
		detail: "Your parcel is packed and labelled.",
		eta: "Picked up today",
	},
	{
		id: "transit",
		title: "In transit",
		icon: Truck,
		location: "Columbus, OH",
		detail: "Out with the carrier, moving your way.",
		eta: "Arrives tomorrow",
	},
	{
		id: "delivered",
		title: "Delivered",
		icon: Warehouse,
		location: "Your address",
		detail: "Left at the front door.",
		eta: "Delivered",
	},
] as const;

const icons: Record<
	string,
	ComponentType<{ className?: string }>
> = Object.fromEntries(steps.map((s) => [s.id, s.icon]));

const { Stepper } = defineStepper(steps);

export function OrderTrackingBlock() {
	const [confirmed, setConfirmed] = useState(false);

	return (
		<Stepper.Root
			defaultStep="transit"
			className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<div className="mb-6 flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold">Order #4815</p>
							<p className="text-xs text-muted-foreground">
								{stepper.current.eta}
							</p>
						</div>
						<span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
							{stepper.current.title}
						</span>
					</div>

					<Stepper.List className="flex items-start">
						<Stepper.Items>
							{(step, index) => {
								const Icon = icons[step.id];
								return (
									<div
										key={step.id}
										className="flex flex-1 items-start last:flex-none"
									>
										<Stepper.Item
											step={step.id}
											className="flex flex-col items-center gap-2"
										>
											<Stepper.Indicator className="group grid size-10 place-items-center rounded-full border-2 transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary data-[status=previous]:text-primary-foreground data-[status=upcoming]:border-border data-[status=upcoming]:bg-background data-[status=upcoming]:text-muted-foreground">
												<Check className="hidden size-5 group-data-[status=previous]:block" />
												<Icon className="size-5 group-data-[status=previous]:hidden" />
											</Stepper.Indicator>
											<Stepper.Title className="w-20 text-center text-xs font-medium" />
										</Stepper.Item>
										{index < stepper.count - 1 && (
											<div
												className="mx-1 mt-5 h-0.5 flex-1 rounded bg-border data-[done=true]:bg-primary"
												data-done={index < stepper.index}
											/>
										)}
									</div>
								);
							}}
						</Stepper.Items>
					</Stepper.List>

					{/* Detail panel driven by the current step's typed metadata. */}
					<div className="mt-6 flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
						<div>
							<p className="font-medium">
								{confirmed
									? "Delivery confirmed. Thanks for checking in."
									: stepper.current.detail}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{stepper.current.location}
							</p>
						</div>
						<span className="shrink-0 text-xs font-medium text-primary">
							{stepper.current.eta}
						</span>
					</div>

					<Stepper.Actions className="mt-6 flex justify-center gap-2">
						<button
							type="button"
							onClick={() => stepper.prev()}
							disabled={!stepper.canPrev}
							className="inline-flex h-8 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
						>
							Rewind
						</button>
						{confirmed ? (
							<button
								type="button"
								onClick={() => {
									setConfirmed(false);
									stepper.reset();
								}}
								className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Track again
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setConfirmed(true)}
								className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Confirm delivery
							</button>
						) : (
							<button
								type="button"
								onClick={() => stepper.next()}
								className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Advance status
							</button>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}
