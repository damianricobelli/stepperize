import { defineStepper } from "@stepperize/react";
import { Check, GraduationCap, Lock, Play } from "lucide-react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "intro", title: "Introduction", duration: "3 min" },
	{ id: "lesson1", title: "Core concepts", duration: "8 min" },
	{ id: "lesson2", title: "Hands-on", duration: "12 min" },
	{ id: "quiz", title: "Final quiz", duration: "5 min" },
]);

export function CoursePlayerBlock() {
	const [completed, setCompleted] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-xl rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<div className="grid gap-6 sm:grid-cols-[180px_1fr]">
					<div>
						<div className="mb-3 flex items-center gap-2 text-sm font-semibold">
							<GraduationCap className="size-4 text-primary" />
							React basics
						</div>
						<Stepper.List className="flex flex-col gap-0.5">
							<Stepper.Items>
								{(step) => (
									<Stepper.Item key={step.id} step={step.id}>
										<Stepper.Trigger className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors disabled:cursor-not-allowed data-[status=active]:bg-muted">
											<span className="grid size-5 shrink-0 place-items-center rounded-full border text-muted-foreground group-data-[status=active]:border-primary group-data-[status=active]:text-primary group-data-[status=previous]:border-chart-2 group-data-[status=previous]:bg-chart-2 group-data-[status=previous]:text-white">
												<Check className="hidden size-3 group-data-[status=previous]:block" />
												<Play className="hidden size-2.5 group-data-[status=active]:block" />
												<Lock className="hidden size-2.5 group-data-[status=upcoming]:block" />
											</span>
											<span className="min-w-0 flex-1">
												<Stepper.Title className="block truncate text-sm font-medium" />
											</span>
										</Stepper.Trigger>
									</Stepper.Item>
								)}
							</Stepper.Items>
						</Stepper.List>
					</div>

					<div className="flex min-h-44 flex-col">
						<Stepper.Content step={stepper.current.id} className="flex-1">
							<div className="grid h-28 place-items-center rounded-lg bg-linear-to-br from-primary/15 to-primary/5 text-primary">
								<Play className="size-8" />
							</div>
							<h3 className="mt-3 text-base font-semibold">
								{completed ? "Course complete" : stepper.current.title}
							</h3>
							<p className="text-sm text-muted-foreground">
								{completed
									? "All lessons and the final quiz are finished."
									: `Lesson ${stepper.index + 1} · ${stepper.current.duration}`}
							</p>
						</Stepper.Content>

						<Stepper.Actions className="mt-4 flex justify-between">
							<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
								Previous
							</Stepper.Prev>
							{completed ? (
								<button
									type="button"
									onClick={() => {
										setCompleted(false);
										stepper.reset();
									}}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Restart course
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setCompleted(true)}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Finish course
								</button>
							) : (
								<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
									Mark complete
								</Stepper.Next>
							)}
						</Stepper.Actions>
					</div>
				</div>
			)}
		</Stepper.Root>
	);
}
