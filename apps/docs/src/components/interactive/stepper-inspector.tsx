"use client";

import { defineStepper } from "@stepperize/react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ExampleFrame } from "./example-frame";

const onboarding = defineStepper([
	{ id: "account", title: "Account", description: "Sign-in details" },
	{ id: "profile", title: "Profile", description: "Personal details" },
	{ id: "plan", title: "Plan", description: "Choose a package" },
	{ id: "review", title: "Review", description: "Confirm the setup" },
]);

type Field =
	| "id"
	| "index"
	| "progress"
	| "isFirst"
	| "isLast"
	| "canPrev"
	| "canNext"
	| "completed";

type Call = { code: string; result: string; accepted: boolean | null };

/** Only navigation is async; setComplete is a plain synchronous call. */
const isNavigation = (code: string) => !code.startsWith("setComplete");

const button =
	"pressable inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 pointer-coarse:h-10 [&_svg]:size-4";

/**
 * The stepper instance, live. A real `useStepper()` drives a small stepper on
 * top; underneath, every field the reader needs on day one is printed exactly
 * as they would read it in code, flashing when it changes. Pointing at a
 * control highlights the fields it depends on, so "why is Previous disabled?"
 * answers itself.
 */
export function StepperInspector() {
	const stepper = onboarding.useStepper();
	const [focus, setFocus] = useState<Field[]>([]);
	const [call, setCall] = useState<Call | null>(null);

	const run = async (code: string, action: () => unknown) => {
		const result = await action();
		if (result && typeof result === "object" && "accepted" in result) {
			setCall({
				code,
				result: JSON.stringify(result),
				accepted: Boolean((result as { accepted: boolean }).accepted),
			});
		} else {
			setCall({
				code,
				result: "returns void (not a navigation)",
				accepted: null,
			});
		}
	};

	const highlight = (fields: Field[]) => ({
		onPointerEnter: () => setFocus(fields),
		onPointerLeave: () => setFocus([]),
		onFocus: () => setFocus(fields),
		onBlur: () => setFocus([]),
	});

	const rows: { field: Field; value: ReactNode; raw: string; note: string }[] =
		[
			{
				field: "id",
				raw: stepper.id,
				value: <Str>{stepper.id}</Str>,
				note: "The active step's typed id.",
			},
			{
				field: "index",
				raw: String(stepper.index),
				value: <Num>{stepper.index}</Num>,
				note: "Its position in the steps array.",
			},
			{
				field: "progress",
				raw: String(stepper.progress),
				value: (
					<span className="flex items-center gap-2">
						<Num>{Number(stepper.progress.toFixed(2))}</Num>
						<span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
							<span
								className="block h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out-strong"
								style={{ transform: `scaleX(${stepper.progress})` }}
							/>
						</span>
					</span>
				),
				note: "Position from 0 to 1. Not the share of completed steps.",
			},
			{
				field: "isFirst",
				raw: String(stepper.isFirst),
				value: <Bool value={stepper.isFirst} />,
				note: "At the start of the flow.",
			},
			{
				field: "isLast",
				raw: String(stepper.isLast),
				value: <Bool value={stepper.isLast} />,
				note: "At the end of the flow.",
			},
			{
				field: "canPrev",
				raw: String(stepper.canPrev),
				value: <Bool value={stepper.canPrev} />,
				note: "Bind it to your Back button's disabled state.",
			},
			{
				field: "canNext",
				raw: String(stepper.canNext),
				value: <Bool value={stepper.canNext} />,
				note: "Bind it to your Next button's disabled state.",
			},
			{
				field: "completed",
				raw: stepper.completed.join(","),
				value: (
					<span className="font-mono">
						<span className="text-foreground/45">[</span>
						{stepper.completed.map((id, i) => (
							<span key={id}>
								{i > 0 && <span className="text-foreground/45">, </span>}
								<Str>{id}</Str>
							</span>
						))}
						<span className="text-foreground/45">]</span>
					</span>
				),
				note: "Only what you marked complete. Moving never fills it.",
			},
		];

	return (
		<ExampleFrame
			title="Drive a real instance"
			description="Every value below is read from useStepper(). Use the controls and watch them change."
		>
			<div className="space-y-5">
				{/* The UI a user would see. */}
				<div className="rounded-xl border bg-muted/30 p-4">
					<ol className="flex items-start">
						{stepper.steps.map((step, i) => {
							const status = stepper.status(step.id);
							const done = stepper.isComplete(step.id);
							return (
								<li
									key={step.id}
									className="flex min-w-0 flex-1 items-start last:flex-none"
								>
									<button
										type="button"
										onClick={() =>
											void run(`goTo("${step.id}")`, () =>
												stepper.goTo(step.id),
											)
										}
										{...highlight(["id", "index", "progress"])}
										className="pressable hit-44 flex min-w-12 flex-col items-center gap-1.5 rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
										aria-label={`Go to ${step.title}`}
										aria-current={status === "active" ? "step" : undefined}
									>
										<span
											className={cn(
												"relative grid size-9 place-items-center rounded-full border text-sm leading-none font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-300 ease-out-strong",
												status === "active" &&
													"border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
												status === "previous" &&
													"border-primary/30 bg-primary/10 text-primary",
												status === "upcoming" &&
													"bg-background text-muted-foreground",
											)}
										>
											{i + 1}
											{done && (
												<span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full leading-none bg-emerald-500 text-white ring-2 ring-card duration-200 animate-in zoom-in-75 fade-in-0">
													<Check className="block size-2.5" strokeWidth={3.5} />
												</span>
											)}
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
									{i < stepper.count - 1 && (
										<span
											aria-hidden
											className="relative mx-1 mt-[18px] h-0.5 flex-1 overflow-hidden rounded-full bg-border"
										>
											<span
												className={cn(
													"absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-500 ease-in-out-strong",
													i < stepper.index ? "scale-x-100" : "scale-x-0",
												)}
											/>
										</span>
									)}
								</li>
							);
						})}
					</ol>

					<div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
						<button
							type="button"
							className={button}
							disabled={!stepper.canPrev}
							onClick={() => void run("prev()", () => stepper.prev())}
							{...highlight(["canPrev", "isFirst"])}
						>
							<ArrowLeft aria-hidden />
							Previous
						</button>
						<button
							type="button"
							className={cn(
								button,
								"border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
							)}
							disabled={!stepper.canNext}
							onClick={() => void run("next()", () => stepper.next())}
							{...highlight(["canNext", "isLast"])}
						>
							Next
							<ArrowRight aria-hidden />
						</button>
						<button
							type="button"
							className={button}
							onClick={() =>
								void run(
									`setComplete("${stepper.id}", ${!stepper.isComplete()})`,
									() => stepper.setComplete(undefined, !stepper.isComplete()),
								)
							}
							{...highlight(["completed"])}
						>
							<Check aria-hidden />
							{stepper.isComplete() ? "Unmark complete" : "Mark complete"}
						</button>
						<button
							type="button"
							className={cn(button, "ml-auto border-transparent shadow-none")}
							onClick={() => void run("reset()", () => stepper.reset())}
							{...highlight(["id", "index", "completed"])}
						>
							<RotateCcw aria-hidden />
							Reset
						</button>
					</div>
				</div>

				{/* The instance, as code reads it. */}
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
					<div className="overflow-hidden rounded-xl border bg-background">
						<p className="border-b bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
							const stepper = onboarding.useStepper();
						</p>
						<dl className="divide-y">
							{rows.map((row) => (
								<Flash key={row.field} value={row.raw}>
									<div
										className={cn(
											"grid grid-cols-[7.5rem_1fr] items-center gap-x-3 gap-y-0.5 px-3 py-2 transition-colors duration-150 sm:grid-cols-[7.5rem_9rem_1fr]",
											focus.includes(row.field) && "bg-primary/[0.07]",
										)}
									>
										<dt className="font-mono text-[12px]">
											<span className="text-muted-foreground">stepper.</span>
											{row.field}
										</dt>
										<dd className="font-mono text-[12px]">{row.value}</dd>
										<dd className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
											{row.note}
										</dd>
									</div>
								</Flash>
							))}
						</dl>
					</div>

					<div className="flex flex-col gap-3">
						<div className="rounded-xl border bg-background p-3">
							<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
								Last call
							</p>
							{call ? (
								<div
									key={`${call.code}-${call.result}`}
									className="mt-2 space-y-1.5 duration-200 animate-in fade-in-0 motion-safe:slide-in-from-bottom-1"
								>
									<code className="block font-mono text-[12px]">
										{isNavigation(call.code) ? "await " : ""}stepper.{call.code}
									</code>
									<code
										className={cn(
											"block rounded-md px-2 py-1.5 font-mono text-[11.5px] break-all",
											call.accepted === true &&
												"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
											call.accepted === false &&
												"bg-red-500/10 text-red-600 dark:text-red-300",
											call.accepted === null &&
												"bg-muted text-muted-foreground",
										)}
									>
										{call.result}
									</code>
								</div>
							) : (
								<p className="mt-2 text-sm text-muted-foreground">
									Click a control. Navigation returns a typed result you can
									check.
								</p>
							)}
						</div>
						<div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
							<p className="font-medium text-foreground">Try this</p>
							<ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px]">
								<li>Point at Previous: it reads canPrev.</li>
								<li>Go forward: completed stays empty.</li>
								<li>Mark a step complete, then move: it stays marked.</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</ExampleFrame>
	);
}

function Str({ children }: { children: ReactNode }) {
	return (
		<span className="text-emerald-700 dark:text-emerald-300">"{children}"</span>
	);
}

function Num({ children }: { children: ReactNode }) {
	return <span className="text-sky-700 dark:text-sky-300">{children}</span>;
}

function Bool({ value }: { value: boolean }) {
	return (
		<span
			className={
				value ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"
			}
		>
			{String(value)}
		</span>
	);
}

/** Briefly tints a row when its value changes, so the eye finds what moved. */
function Flash({ value, children }: { value: string; children: ReactNode }) {
	const [flash, setFlash] = useState(false);
	const previous = useRef(value);

	useEffect(() => {
		if (previous.current === value) return;
		previous.current = value;
		setFlash(true);
		const timeout = setTimeout(() => setFlash(false), 600);
		return () => clearTimeout(timeout);
	}, [value]);

	return (
		<div
			className={cn(
				"transition-colors duration-500 ease-out",
				flash && "bg-amber-500/10 duration-0",
			)}
		>
			{children}
		</div>
	);
}
