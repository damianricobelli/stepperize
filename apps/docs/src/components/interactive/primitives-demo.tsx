"use client";

import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const checkout = defineStepper([
	{ id: "shipping", title: "Shipping", description: "Where to send it" },
	{ id: "payment", title: "Payment", description: "How you'll pay" },
	{ id: "review", title: "Review", description: "Confirm the order" },
]);

const { Stepper } = checkout;

/* Styling only, and all of it keyed off the primitives' data attributes. */
const button =
	"inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const eyebrow =
	"text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

export function PrimitivesDemo() {
	const [linear, setLinear] = useState(true);

	return (
		<div className="@container space-y-4">
			<div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
				<div>
					<label htmlFor="primitives-linear" className="font-mono text-sm">
						{"<Stepper.Root linear>"}
					</label>
					<p className="text-xs text-muted-foreground">
						Linear disables triggers you cannot reach yet.
					</p>
				</div>
				<span className="relative inline-flex shrink-0">
					<input
						id="primitives-linear"
						type="checkbox"
						role="switch"
						aria-checked={linear}
						checked={linear}
						onChange={(event) => setLinear(event.target.checked)}
						className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-200 checked:bg-primary"
					/>
					<span
						aria-hidden
						className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4"
					/>
				</span>
			</div>

			{/* `linear` is a mount-time option; remount the root when it changes. */}
			<Stepper.Root key={String(linear)} linear={linear} className="space-y-4">
				{({ stepper }) => (
					<div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
						<div className="space-y-4 rounded-xl border bg-background p-4">
							<Stepper.List className="flex items-start">
								<Stepper.Items>
									{(step, index) => (
										<Stepper.Item
											key={step.id}
											className="group/item flex flex-1 items-start last:flex-none"
										>
											<Stepper.Trigger className="group/trigger flex min-w-16 flex-col items-center gap-1.5 rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
												<Stepper.Indicator className="relative grid size-9 place-items-center rounded-full border text-sm leading-none font-semibold transition-[background-color,border-color,color] duration-300 data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary/30 data-[status=previous]:bg-primary/10 data-[status=previous]:text-primary data-[status=upcoming]:bg-muted data-[status=upcoming]:text-muted-foreground">
													{index + 1}
													<span className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-background group-data-complete/trigger:grid">
														<svg
															viewBox="0 0 16 16"
															className="block size-2.5"
															aria-hidden
														>
															<path
																d="M4 8.5l2.5 2.5L12 5.5"
																fill="none"
																stroke="currentColor"
																strokeWidth="2.75"
																strokeLinecap="round"
																strokeLinejoin="round"
															/>
														</svg>
													</span>
												</Stepper.Indicator>
												<Stepper.Title className="text-xs font-medium group-data-[status=upcoming]/trigger:text-muted-foreground">
													{step.title}
												</Stepper.Title>
											</Stepper.Trigger>
											{index < stepper.count - 1 && (
												<Stepper.Separator className="mx-1 mt-[18px] h-0.5 flex-1 rounded-full bg-border transition-colors duration-300 group-data-[status=previous]/item:bg-primary" />
											)}
										</Stepper.Item>
									)}
								</Stepper.Items>
							</Stepper.List>

							{checkout.steps.map((step) => (
								<Stepper.Content
									key={step.id}
									step={step.id}
									className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
								>
									<span className="font-medium text-foreground">
										{step.title}
									</span>{" "}
									· {step.description}
								</Stepper.Content>
							))}

							<Stepper.Actions className="flex flex-wrap items-center gap-2">
								<Stepper.Prev className={button}>Back</Stepper.Prev>
								<Stepper.Next
									className={`${button} border-transparent bg-primary text-primary-foreground hover:bg-primary/90`}
								>
									Next
								</Stepper.Next>
								<button
									type="button"
									className={`${button} ml-auto`}
									onClick={() =>
										stepper.setComplete(stepper.id, !stepper.isComplete())
									}
								>
									{stepper.isComplete() ? "Unmark complete" : "Mark complete"}
								</button>
							</Stepper.Actions>
						</div>

						{/* What the primitives render, as attributes you can style against. */}
						<div className="overflow-hidden rounded-xl border bg-background">
							<p className={`${eyebrow} border-b px-3 py-2`}>
								Rendered attributes
							</p>
							<ul className="divide-y font-mono text-[11.5px] leading-relaxed">
								{checkout.steps.map((step) => {
									const status = stepper.status(step.id);
									const complete = stepper.isComplete(step.id);
									const reachable =
										!linear ||
										stepper.canGoTo(step.id) ||
										step.id === stepper.id;
									return (
										<li key={step.id} className="px-3 py-2">
											<span className="text-foreground/45">{"<button "}</span>
											<span className="text-sky-700 dark:text-sky-300">
												data-status
											</span>
											=
											<span
												key={status}
												className={`rounded px-0.5 transition-colors ${
													status === "active"
														? "bg-primary/15 text-primary"
														: "text-emerald-700 dark:text-emerald-300"
												}`}
											>
												"{status}"
											</span>
											{complete && (
												<>
													{" "}
													<span className="text-sky-700 dark:text-sky-300">
														data-complete
													</span>
												</>
											)}
											{!reachable && (
												<>
													{" "}
													<span className="text-sky-700 dark:text-sky-300">
														disabled
													</span>
												</>
											)}
											<span className="text-foreground/45">{">"}</span>
											<span className="text-foreground">{step.title}</span>
										</li>
									);
								})}
							</ul>
							<p className="border-t px-3 py-2 text-xs text-muted-foreground">
								Style with{" "}
								<code className="font-mono">data-[status=active]:</code> and{" "}
								<code className="font-mono">group-data-complete:</code>. No
								state props needed.
							</p>
						</div>
					</div>
				)}
			</Stepper.Root>
		</div>
	);
}
