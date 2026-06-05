"use client";

import { defineStepper } from "@stepperize/react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	CircleDot,
	RotateCcw,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const onboarding = defineStepper([
	{
		id: "account",
		title: "Account",
		description: "Collect the sign-in details for this flow.",
	},
	{
		id: "profile",
		title: "Profile",
		description: "Add the personal details that shape the experience.",
	},
	{
		id: "plan",
		title: "Plan",
		description: "Choose the package before reviewing everything.",
	},
	{
		id: "review",
		title: "Review",
		description: "Confirm the full setup before finishing.",
	},
]);

type StepId = (typeof onboarding.steps)[number]["id"];

type Update = {
	id: number;
	label: string;
	detail: string;
};

type Insight = {
	id: string;
	tone: "good" | "muted" | "blocked";
	icon: typeof Check | typeof X;
	label: string;
	detail: string;
	value: string | boolean | number;
};

/**
 * Stepper State Inspector — a real `useStepper` instance presented as a guided
 * explanation. Instead of dumping instance fields, every section maps state to
 * visible behavior in the stepper above it.
 */
export function StepperInspector() {
	const stepper = onboarding.useStepper();
	const updateId = useRef(0);
	const [updates, setUpdates] = useState<Update[]>([
		{
			id: 0,
			label: "Flow ready",
			detail: "Account is the starting step.",
		},
	]);

	const completedCount = stepper.completed.length;
	const progressPercent = Math.round(stepper.progress * 100);
	const completedTitles = stepper.completed.map(
		(id) => stepper.steps.find((step) => step.id === id)?.title ?? id,
	);

	const explainPosition = stepper.isFirst
		? "You're at the beginning, so Stepperize blocks backward movement."
		: stepper.isLast
			? "You're at the final step, so forward navigation becomes unavailable."
			: "You're between the edges, so both directions are available.";

	const insights: Insight[] = [
		{
			id: "first",
			tone: stepper.isFirst ? "good" : "muted",
			icon: stepper.isFirst ? Check : X,
			label: stepper.isFirst ? "First step" : "Not first",
			detail: stepper.isFirst
				? "Previous navigation is disabled."
				: "A previous step exists.",
			value: stepper.isFirst,
		},
		{
			id: "last",
			tone: stepper.isLast ? "good" : "muted",
			icon: stepper.isLast ? Check : X,
			label: stepper.isLast ? "Last step" : "Not last",
			detail: stepper.isLast
				? "Next navigation is disabled."
				: "Another step is still ahead.",
			value: stepper.isLast,
		},
		{
			id: "prev",
			tone: stepper.canPrev ? "good" : "blocked",
			icon: stepper.canPrev ? Check : X,
			label: stepper.canPrev ? "Can go back" : "Back disabled",
			detail: stepper.canPrev
				? "The Previous button can move."
				: "There is no earlier step to visit.",
			value: stepper.canPrev,
		},
		{
			id: "next",
			tone: stepper.canNext ? "good" : "blocked",
			icon: stepper.canNext ? Check : X,
			label: stepper.canNext ? "Can continue" : "Continue disabled",
			detail: stepper.canNext
				? "The Next button can move."
				: "The flow is already at the end.",
			value: stepper.canNext,
		},
	];

	function record(label: string, detail: string) {
		updateId.current += 1;
		setUpdates((current) =>
			[{ id: updateId.current, label, detail }, ...current].slice(0, 3),
		);
	}

	function moveTo(stepId: StepId) {
		const target = stepper.steps.find((step) => step.id === stepId);
		if (!target || target.id === stepper.id) return;

		record("Jumped to step", `${stepper.current.title} -> ${target.title}`);
		stepper.goTo(stepId);
	}

	function goPrevious() {
		const from = stepper.current.title;
		const target = stepper.steps[stepper.index - 1];
		if (!target) return;

		record("Moved backward", `${from} -> ${target.title}`);
		stepper.prev();
	}

	function goNext() {
		const from = stepper.current.title;
		const target = stepper.steps[stepper.index + 1];
		if (!target) return;

		record("Moved forward", `${from} -> ${target.title}`);
		stepper.next();
	}

	function toggleComplete() {
		const isComplete = stepper.isComplete();

		record(
			isComplete ? "Completion removed" : "Step completed",
			stepper.current.title,
		);
		stepper.setComplete(undefined, !isComplete);
	}

	function reset() {
		record("Flow reset", "Returned to Account and cleared completion.");
		for (const id of stepper.completed) {
			stepper.setComplete(id, false);
		}
		stepper.reset();
	}

	return (
		<div className="not-prose my-6 rounded-xl border bg-card p-4 md:p-6">
			<section aria-labelledby="stepper-stage">
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div>
						<p
							id="stepper-stage"
							className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
						>
							Stepper UI
						</p>
						<h3 className="mt-1 text-lg font-semibold">
							{stepper.current.title}
						</h3>
						<p className="text-sm text-muted-foreground">
							Step {stepper.index + 1} of {stepper.count}.{" "}
							{stepper.current.description}
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={goPrevious}
							disabled={!stepper.canPrev}
						>
							<ArrowLeft aria-hidden="true" />
							Previous
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={goNext}
							disabled={!stepper.canNext}
						>
							Next
							<ArrowRight aria-hidden="true" />
						</Button>
						<Button
							type="button"
							variant={stepper.isComplete() ? "secondary" : "outline"}
							size="sm"
							onClick={toggleComplete}
						>
							<CheckCircle2 aria-hidden="true" />
							{stepper.isComplete() ? "Completed" : "Mark complete"}
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={reset}>
							<RotateCcw aria-hidden="true" />
							Reset
						</Button>
					</div>
				</div>

				<div className="mt-4 rounded-lg border bg-muted/20 p-4">
					<div className="flex items-start">
						{stepper.steps.map((step, i) => {
							const status = stepper.status(step.id);
							const done = stepper.isComplete(step.id);
							const isActive = status === "active";

							return (
								<div
									key={step.id}
									className="flex min-w-0 flex-1 items-start last:flex-none"
								>
									<button
										type="button"
										onClick={() => moveTo(step.id)}
										className={cn(
											"group flex min-w-14 flex-col items-center gap-2 text-center transition-colors",
											!isActive && "text-muted-foreground",
										)}
										aria-label={`Show ${step.title}`}
										aria-current={isActive ? "step" : undefined}
									>
										<span
											className={cn(
												"grid size-11 place-items-center rounded-full border-2 bg-background text-sm font-semibold shadow-sm transition-all",
												isActive &&
													"scale-105 border-primary bg-primary text-primary-foreground shadow-primary/20",
												status === "previous" &&
													"border-primary/40 bg-primary/10 text-primary",
												status === "upcoming" &&
													"border-border text-muted-foreground",
												done && "border-emerald-500 bg-emerald-500 text-white",
											)}
										>
											{done ? (
												<Check className="size-5" aria-hidden="true" />
											) : isActive ? (
												<CircleDot className="size-5" aria-hidden="true" />
											) : (
												i + 1
											)}
										</span>
										<span className="max-w-16 text-xs font-medium leading-tight">
											{step.title}
										</span>
									</button>

									{i < stepper.count - 1 && (
										<span
											className={cn(
												"mx-1 mt-5 h-0.5 flex-1 rounded bg-border transition-colors",
												i < stepper.index && "bg-primary",
											)}
											aria-hidden="true"
										/>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</section>

			<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
				<FlashValue
					value={stepper.id}
					className="rounded-lg border bg-background p-3"
				>
					<div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
						<div>
							<p className="text-sm font-medium">Current position</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{explainPosition}
							</p>
						</div>
						<Badge className="h-7 px-3">{stepper.current.title}</Badge>
					</div>
				</FlashValue>

				<FlashValue
					value={`${progressPercent}-${completedCount}`}
					className="rounded-lg border bg-background p-3"
				>
					<div className="mb-2 flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium">Progress</p>
							<p className="text-xs text-muted-foreground">
								{completedCount} of {stepper.count} completed
							</p>
						</div>
						<span className="text-lg font-semibold tabular-nums">
							{progressPercent}%
						</span>
					</div>
					<Progress value={progressPercent} aria-label="Stepper progress" />
				</FlashValue>
			</div>

			<section
				className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]"
				aria-labelledby="understanding-state"
			>
				<div className="rounded-lg border bg-muted/20 p-3">
					<p
						id="understanding-state"
						className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
					>
						Understanding this state
					</p>

					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						{insights.map((item) => (
							<StateInsight key={item.id} {...item} />
						))}
					</div>
				</div>

				<div className="grid gap-3">
					<div className="rounded-lg border bg-background p-3">
						<div className="mb-2 flex items-center justify-between gap-3">
							<p className="text-sm font-medium">Completed steps</p>
							<Badge variant="outline">
								{completedCount} / {stepper.count}
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground">
							{completedTitles.length
								? completedTitles.join(", ")
								: "No completed steps yet"}
						</p>
					</div>

					<div className="rounded-lg border bg-background p-3">
						<div className="mb-2 flex items-center justify-between gap-3">
							<p className="text-sm font-medium">Recent updates</p>
							<Badge variant="secondary">state changes</Badge>
						</div>
						<ol className="space-y-1.5" aria-label="Recent Stepperize updates">
							{updates.map((update, index) => (
								<li
									key={update.id}
									className={cn(
										"flex gap-2 rounded-md px-2 py-1.5 transition-colors",
										index === 0 && "bg-primary/10",
									)}
								>
									<span
										className={cn(
											"mt-1 size-2 rounded-full",
											index === 0 ? "bg-primary" : "bg-border",
										)}
										aria-hidden="true"
									/>
									<div>
										<p className="text-xs font-medium">{update.label}</p>
										<p className="text-xs text-muted-foreground">
											{update.detail}
										</p>
									</div>
								</li>
							))}
						</ol>
					</div>
				</div>
			</section>
		</div>
	);
}

function StateInsight({ tone, icon: Icon, label, detail, value }: Insight) {
	return (
		<FlashValue
			value={value}
			className={cn(
				"rounded-lg border bg-background p-3",
				tone === "good" && "border-emerald-500/30",
				tone === "blocked" && "border-rose-500/30",
			)}
		>
			<div className="flex items-start gap-2">
				<span
					className={cn(
						"mt-0.5 grid size-5 place-items-center rounded-full",
						tone === "good" &&
							"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
						tone === "blocked" &&
							"bg-rose-500/10 text-rose-600 dark:text-rose-400",
						tone === "muted" && "bg-muted text-muted-foreground",
					)}
				>
					<Icon className="size-3.5" aria-hidden="true" />
				</span>
				<div>
					<p className="text-sm font-medium">{label}</p>
					<p className="text-xs text-muted-foreground">{detail}</p>
				</div>
			</div>
		</FlashValue>
	);
}

function FlashValue({
	value,
	className,
	children,
}: {
	value: string | boolean | number;
	className?: string;
	children: ReactNode;
}) {
	const [flash, setFlash] = useState(false);
	const previous = useRef(value);
	const normalized = useMemo(() => String(value), [value]);

	useEffect(() => {
		if (String(previous.current) !== normalized) {
			previous.current = value;
			setFlash(true);
			const timeout = setTimeout(() => setFlash(false), 550);
			return () => clearTimeout(timeout);
		}
	}, [normalized, value]);

	return (
		<div
			className={cn(
				"transition-[background-color,border-color,box-shadow]",
				flash && "border-primary/60 bg-primary/10 shadow-sm shadow-primary/10",
				className,
			)}
		>
			{children}
		</div>
	);
}
