import { defineStepper } from "@stepperize/react";
import {
	Check,
	Hammer,
	Loader2,
	Rocket,
	ShieldCheck,
	TestTube,
} from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";

// `duration` is typed metadata on each stage, read back off the typed `step` in
// the render prop — no parallel timing map to keep in sync.
const steps = [
	{
		id: "build",
		title: "Build",
		description: "Compile & bundle",
		icon: Hammer,
		duration: "1m 12s",
	},
	{
		id: "test",
		title: "Test",
		description: "Run the suite",
		icon: TestTube,
		duration: "3m 04s",
	},
	{
		id: "deploy",
		title: "Deploy",
		description: "Push to production",
		icon: Rocket,
		duration: "0m 48s",
	},
	{
		id: "verify",
		title: "Verify",
		description: "Smoke checks",
		icon: ShieldCheck,
		duration: "0m 22s",
	},
] as const;

const icons: Record<
	string,
	ComponentType<{ className?: string }>
> = Object.fromEntries(steps.map((s) => [s.id, s.icon]));

const { Stepper } = defineStepper(steps);

export function CicdPipelineBlock() {
	const [released, setReleased] = useState(false);

	return (
		<Stepper.Root
			orientation="vertical"
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<div className="mb-5 flex items-center gap-2 font-mono text-sm">
						<span className="size-2 rounded-full bg-chart-2" />
						<span className="font-semibold">pipeline</span>
						<span className="text-muted-foreground">#1024 · main</span>
					</div>

					<Stepper.List orientation="vertical" className="flex flex-col">
						<Stepper.Items>
							{(step, index) => {
								const Icon = icons[step.id];
								return (
									<Stepper.Item
										key={step.id}
										step={step.id}
										className="group/item relative flex gap-3 pb-5 last:pb-0"
									>
										{index < stepper.count - 1 && (
											<div className="absolute top-9 left-4 h-[calc(100%-2.25rem)] w-px bg-border group-data-[status=previous]/item:bg-chart-2" />
										)}
										<Stepper.Indicator className="grid size-8 shrink-0 place-items-center rounded-lg border transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary/10 data-[status=active]:text-primary data-[status=previous]:border-chart-2/40 data-[status=previous]:bg-chart-2/10 data-[status=previous]:text-chart-2 data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
											<Check className="hidden size-4 group-data-[status=previous]/item:block" />
											<Loader2 className="hidden size-4 animate-spin group-data-[status=active]/item:block" />
											<Icon className="size-4 group-data-[status=active]/item:hidden group-data-[status=previous]/item:hidden" />
										</Stepper.Indicator>

										<div className="flex-1">
											<div className="flex items-center justify-between">
												<Stepper.Title className="text-sm font-medium" />
												<span className="text-xs font-medium text-muted-foreground group-data-[status=previous]/item:text-chart-2 group-data-[status=active]/item:text-primary">
													<span className="hidden group-data-[status=previous]/item:inline">
														passed
													</span>
													<span className="hidden group-data-[status=active]/item:inline">
														{released ? "released" : "running"}
													</span>
													<span className="hidden group-data-[status=upcoming]/item:inline">
														queued
													</span>
												</span>
											</div>
											<div className="flex items-center justify-between">
												<Stepper.Description className="text-xs text-muted-foreground" />
												{/* typed metadata: only show timing once a stage has run */}
												<span className="hidden font-mono text-xs text-muted-foreground group-data-[status=previous]/item:inline group-data-[status=active]/item:inline">
													{step.duration}
												</span>
											</div>
										</div>
									</Stepper.Item>
								);
							}}
						</Stepper.Items>
					</Stepper.List>

					<Stepper.Actions className="mt-5 flex gap-2 border-t pt-5">
						<button
							type="button"
							onClick={() => {
								setReleased(false);
								stepper.reset();
							}}
							className="inline-flex h-8 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
						>
							Restart
						</button>
						{stepper.isLast ? (
							<button
								type="button"
								onClick={() => setReleased(true)}
								className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Release build
							</button>
						) : (
							<Stepper.Next className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
								Run next stage
							</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}
