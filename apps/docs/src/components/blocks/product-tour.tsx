import { defineStepper } from "@stepperize/react";
import { Sparkles, Wand2, Zap } from "lucide-react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{
		id: "welcome",
		title: "Welcome aboard",
		description: "A quick tour of what you can do here.",
	},
	{
		id: "automate",
		title: "Automate everything",
		description: "Turn repetitive work into one-click flows.",
	},
	{
		id: "ship",
		title: "Ship faster",
		description: "Go from idea to production in minutes.",
	},
]);

const art: Record<string, { icon: typeof Zap; tint: string }> = {
	welcome: { icon: Sparkles, tint: "bg-primary/10 text-primary" },
	automate: { icon: Wand2, tint: "bg-chart-2/15 text-chart-2" },
	ship: { icon: Zap, tint: "bg-chart-3/15 text-chart-3" },
};

export function ProductTourBlock() {
	const [started, setStarted] = useState(false);

	return (
		<Stepper.Root className="w-full max-w-sm overflow-hidden rounded-2xl border bg-background shadow-sm">
			{({ stepper }) => {
				const { icon: Icon, tint } = art[stepper.current.id];
				return (
					<>
						<div
							className={`flex h-36 items-center justify-center ${tint.split(" ")[0]}`}
						>
							<Icon className={`size-12 ${tint.split(" ")[1]}`} />
						</div>

						<div className="p-6">
							<Stepper.Content step={stepper.current.id}>
								<h3 className="text-lg font-semibold">
									{started ? "You're ready to start" : stepper.current.title}
								</h3>
								<p className="mt-1.5 text-sm text-muted-foreground">
									{started
										? "The tour is complete. Jump into the workspace."
										: stepper.current.description}
								</p>
							</Stepper.Content>

							<div className="mt-6 flex items-center justify-between">
								<Stepper.List className="flex gap-1.5">
									<Stepper.Items>
										{(step) => (
											<Stepper.Item key={step.id} step={step.id}>
												<Stepper.Trigger>
													<Stepper.Indicator className="block h-1.5 rounded-full transition-all data-[status=active]:w-6 data-[status=active]:bg-primary data-[status=previous]:w-1.5 data-[status=previous]:bg-primary data-[status=upcoming]:w-1.5 data-[status=upcoming]:bg-border" />
												</Stepper.Trigger>
											</Stepper.Item>
										)}
									</Stepper.Items>
								</Stepper.List>

								<Stepper.Actions className="flex gap-2">
									{!stepper.isLast && (
										<button
											type="button"
											onClick={() => stepper.goTo("ship")}
											className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
										>
											Skip
										</button>
									)}
									{started ? (
										<button
											type="button"
											onClick={() => {
												setStarted(false);
												stepper.reset();
											}}
											className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
										>
											Restart tour
										</button>
									) : stepper.isLast ? (
										<button
											type="button"
											onClick={() => setStarted(true)}
											className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
										>
											Get started
										</button>
									) : (
										<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
											Next
										</Stepper.Next>
									)}
								</Stepper.Actions>
							</div>
						</div>
					</>
				);
			}}
		</Stepper.Root>
	);
}
