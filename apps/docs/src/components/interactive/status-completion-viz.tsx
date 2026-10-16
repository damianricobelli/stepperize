"use client";

import { defineStepper } from "@stepperize/react";
import { cn } from "@/lib/utils";
import { StatusIcon } from "../status-icon";
import { ExampleFrame } from "./example-frame";

const flow = defineStepper(
	[
		{ id: "account", title: "Account" },
		{ id: "profile", title: "Profile" },
		{ id: "plan", title: "Plan" },
		{ id: "review", title: "Review" },
	],
	{ defaultStep: "profile", defaultCompleted: ["account"] },
);

const STATUS_STYLE = {
	active: "border-primary/40 bg-primary text-primary-foreground",
	previous: "border-primary/25 bg-primary/10 text-primary",
	upcoming: "bg-muted text-muted-foreground",
} as const;

/**
 * Status vs completion as a matrix: one column per step, one row per axis.
 * Moving the active step rewrites the whole status row; the completion row
 * only changes where you click it. A real instance drives both rows.
 */
export function StatusCompletionViz() {
	const stepper = flow.useStepper();

	return (
		<ExampleFrame
			title="Two independent axes"
			description="Click a step to move. Click a completion cell to toggle it. Only one row follows the position."
		>
			<div className="@container overflow-x-auto overscroll-x-contain">
				<table className="w-full min-w-[30rem] border-separate border-spacing-0 text-left">
					<caption className="sr-only">
						Status and completion for each step
					</caption>
					<thead>
						<tr>
							<th scope="col" className="w-32 pb-3 align-bottom">
								<span className="sr-only">Axis</span>
							</th>
							{stepper.steps.map((step, i) => {
								const status = stepper.status(step.id);
								return (
									<th key={step.id} scope="col" className="pb-3 font-normal">
										<button
											type="button"
											onClick={() => void stepper.goTo(step.id)}
											aria-label={`Set ${step.title} active`}
											aria-current={status === "active" ? "step" : undefined}
											className="pressable hit-44 mx-auto flex flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<span
												className={cn(
													"grid size-10 place-items-center rounded-full border text-sm leading-none font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-300 ease-out-strong",
													STATUS_STYLE[status],
													status === "active" &&
														"shadow-[0_0_0_4px] shadow-primary/15",
												)}
											>
												{i + 1}
											</span>
											<span
												className={cn(
													"text-xs font-medium",
													status !== "active" && "text-muted-foreground",
												)}
											>
												{step.title}
											</span>
										</button>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody className="text-center">
						<tr>
							<th
								scope="row"
								className="rounded-l-xl border-y border-l bg-muted/30 py-3 pl-3 text-left align-middle font-normal"
							>
								<code className="font-mono text-xs">status(id)</code>
								<span className="block text-[11px] text-muted-foreground">
									derived from position
								</span>
							</th>
							{stepper.steps.map((step, i) => {
								const status = stepper.status(step.id);
								return (
									<td
										key={step.id}
										className={cn(
											"border-y bg-muted/30 px-1 py-3",
											i === stepper.count - 1 && "rounded-r-xl border-r",
										)}
									>
										<span
											key={status}
											className={cn(
												"inline-block rounded-md border px-2 py-1 font-mono text-[11px] duration-300 animate-in fade-in-0 motion-safe:zoom-in-95",
												STATUS_STYLE[status],
											)}
										>
											{status}
										</span>
									</td>
								);
							})}
						</tr>
						<tr>
							<td colSpan={5} className="h-2" />
						</tr>
						<tr>
							<th
								scope="row"
								className="rounded-l-xl border-y border-l py-3 pl-3 text-left align-middle font-normal"
							>
								<code className="font-mono text-xs">isComplete(id)</code>
								<span className="block text-[11px] text-muted-foreground">
									set by you
								</span>
							</th>
							{stepper.steps.map((step, i) => {
								const done = stepper.isComplete(step.id);
								return (
									<td
										key={step.id}
										className={cn(
											"border-y px-1 py-3",
											i === stepper.count - 1 && "rounded-r-xl border-r",
										)}
									>
										<button
											type="button"
											onClick={() => stepper.setComplete(step.id, !done)}
											aria-pressed={done}
											aria-label={`${step.title} completed`}
											className={cn(
												"pressable inline-flex h-8 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-10",
												done
													? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
													: "bg-background text-muted-foreground hover:bg-muted",
											)}
										>
											<StatusIcon
												tone={done ? "yes" : "neutral"}
												className="size-4"
											/>
											{String(done)}
										</button>
									</td>
								);
							})}
						</tr>
					</tbody>
				</table>
			</div>

			<div className="mt-5 grid gap-3 text-[13px] leading-relaxed text-muted-foreground @lg:grid-cols-2">
				<p>
					<span className="font-medium text-foreground">Status</span> is
					positional. Move the active step and every cell in the row recolors,
					with no extra calls.
				</p>
				<p>
					<span className="font-medium text-foreground">Completion</span> is
					business state. A <code className="font-mono">previous</code> step is{" "}
					<em>not</em> automatically complete, and moving never clears it.
				</p>
			</div>
		</ExampleFrame>
	);
}
