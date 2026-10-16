"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { C, CodeFrame, F, K, P, S, Section, SectionHeading, T } from "./shared";

const MODES = {
	without: {
		label: "Without",
		points: [
			"Manual index and clamping on every move",
			"Stringly-typed switch: a typo still compiles",
			"Miss a case and nothing warns you",
			"Validation gating wired by hand, per step",
		],
	},
	with: {
		label: "With Stepperize",
		points: [
			"next() and prev() clamp and guard for you",
			"Step ids are a typed union: typos fail to compile",
			"match() is exhaustive: miss a case, get an error",
			"One guard decides whether any move happens",
		],
	},
} as const;

type Mode = keyof typeof MODES;

/**
 * The "why this library exists" section: the manual way every team writes the
 * first time, against the Stepperize version. One frame with a toggle instead
 * of two side-by-side columns, so the comparison is a single glance on a
 * phone too. Both versions share one grid cell, so the frame never jumps in
 * height when switching.
 */
export function BeforeAfter() {
	const [mode, setMode] = useState<Mode>("without");

	return (
		<Section className="border-y bg-muted/30">
			<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
				<div>
					<SectionHeading
						eyebrow="Why Stepperize"
						title="Stop hand-rolling step state."
					>
						Every multi-step flow starts with an index, a switch, and clamping
						logic, then quietly rots as steps and rules pile up. Stepperize
						replaces all of it with one typed instance.
					</SectionHeading>

					<fieldset className="relative mt-8 grid w-full grid-cols-2 rounded-xl border bg-card p-1 shadow-xs sm:inline-grid sm:w-auto">
						<legend className="sr-only">Compare code</legend>
						<span
							aria-hidden
							className={cn(
								"absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg transition-[transform,background-color] duration-300 ease-out-strong",
								mode === "with"
									? "translate-x-full bg-primary"
									: "translate-x-0 bg-foreground",
							)}
						/>
						{(Object.keys(MODES) as Mode[]).map((m) => (
							<button
								key={m}
								type="button"
								aria-pressed={mode === m}
								onClick={() => setMode(m)}
								className={cn(
									"pressable relative h-9 rounded-lg px-4 text-sm font-medium whitespace-nowrap pointer-coarse:h-10 outline-none focus-visible:ring-2 focus-visible:ring-ring",
									mode !== m && "text-muted-foreground hover:text-foreground",
									mode === m &&
										(m === "with"
											? "text-primary-foreground"
											: "text-background"),
								)}
							>
								{MODES[m].label}
							</button>
						))}
					</fieldset>

					<div className="mt-6 grid">
						{(Object.keys(MODES) as Mode[]).map((m) => (
							<ul
								key={m}
								aria-hidden={mode !== m}
								className={cn(
									"col-start-1 row-start-1 space-y-2.5 text-[15px] transition-[opacity,filter] duration-300 ease-out-strong",
									mode === m
										? "opacity-100"
										: "pointer-events-none opacity-0 blur-[2px]",
								)}
							>
								{MODES[m].points.map((point) => (
									<li key={point} className="flex items-start gap-3">
										<span
											className={cn(
												"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
												m === "with"
													? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
													: "bg-red-500/10 text-red-600 dark:text-red-400",
											)}
										>
											{m === "with" ? (
												<Check className="size-3" strokeWidth={3} aria-hidden />
											) : (
												<X className="size-3" strokeWidth={3} aria-hidden />
											)}
										</span>
										<span className="text-muted-foreground">{point}</span>
									</li>
								))}
							</ul>
						))}
					</div>
				</div>

				<CodeFrame
					filename="checkout.tsx"
					aside={
						<span
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors duration-300",
								mode === "with"
									? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
									: "bg-red-500/10 text-red-600 dark:text-red-300",
							)}
						>
							{mode === "with" ? "Compiles. Correct." : "Compiles. Broken."}
						</span>
					}
				>
					<div className="grid overflow-x-auto overscroll-x-contain">
						{(Object.keys(MODES) as Mode[]).map((m) => (
							<pre
								key={m}
								aria-hidden={mode !== m}
								className={cn(
									"col-start-1 row-start-1 p-4 font-mono text-[11.5px] leading-[1.75] transition-[opacity,filter] sm:p-6 sm:text-[12.5px] duration-300 ease-out-strong",
									mode === m
										? "opacity-100"
										: "pointer-events-none opacity-0 blur-[2px]",
								)}
							>
								<code>{m === "with" ? <AfterCode /> : <BeforeCode />}</code>
							</pre>
						))}
					</div>
				</CodeFrame>
			</div>
		</Section>
	);
}

function BeforeCode() {
	return (
		<>
			<K>const</K> steps <P>=</P> <P>[</P>
			<S>"shipping"</S>
			<P>,</P> <S>"payment"</S>
			<P>,</P> <S>"review"</S>
			<P>];</P>
			{"\n"}
			<K>const</K> <P>[</P>step<P>,</P> setStep<P>] =</P> <F>useState</F>
			<P>(</P>
			<T>0</T>
			<P>);</P>
			{"\n\n"}
			<C>{"// clamp by hand, every time"}</C>
			{"\n"}
			<K>const</K> next <P>{"= () =>"}</P> <F>setStep</F>
			<P>((</P>s<P>{") =>"}</P>
			{"\n"}
			{"  "}
			<F>Math</F>
			<P>.</P>
			<F>min</F>
			<P>(</P>s <P>+</P> <T>1</T>
			<P>,</P> steps<P>.</P>length <P>-</P> <T>1</T>
			<P>));</P>
			{"\n\n"}
			<C>{"// stringly-typed — typo still compiles"}</C>
			{"\n"}
			<K>switch</K> <P>(</P>steps<P>[</P>step<P>]) {"{"}</P>
			{"\n"}
			{"  "}
			<K>case</K> <S>"shiping"</S>
			<P>:</P> <K>return</K> <P>{"<"}</P>
			<T>Shipping</T> <P>{"/>;"}</P>
			{"  "}
			<C>{"// 💥"}</C>
			{"\n"}
			{"  "}
			<K>case</K> <S>"payment"</S>
			<P>:</P> {""}
			<K>return</K> <P>{"<"}</P>
			<T>Payment</T> <P>{"/>;"}</P>
			{"\n"}
			{"  "}
			<C>{"// forgot review? no warning."}</C>
			{"\n"}
			<P>{"}"}</P>
		</>
	);
}

function AfterCode() {
	return (
		<>
			<K>const</K> checkout <P>=</P> <F>defineStepper</F>
			<P>([</P>
			{"\n"}
			{"  "}
			<P>{"{ "}</P>id<P>:</P> <S>"shipping"</S> <P>{"},"}</P>
			{"\n"}
			{"  "}
			<P>{"{ "}</P>id<P>:</P> <S>"payment"</S> <P>{"},"}</P>
			{"\n"}
			{"  "}
			<P>{"{ "}</P>id<P>:</P> <S>"review"</S> <P>{"},"}</P>
			{"\n"}
			<P>]);</P>
			{"\n\n"}
			<K>const</K> stepper <P>=</P> checkout<P>.</P>
			<F>useStepper</F>
			<P>();</P>
			{"\n\n"}
			<C>{"// call from your Next button"}</C>
			{"\n"}
			<K>const</K> onNext <P>{"= () => "}</P>
			stepper<P>.</P>
			<F>next</F>
			<P>();</P>
			{"\n\n"}
			<C>{"// exhaustive — a typo is a compile error"}</C>
			{"\n"}
			<K>return</K> stepper<P>.</P>
			<F>match</F>
			<P>({"{"}</P>
			{"\n"}
			{"  "}shipping<P>:</P> <P>{"() =>"}</P> <P>{"<"}</P>
			<T>Shipping</T> <P>{"/>,"}</P>
			{"\n"}
			{"  "}payment<P>:</P> {""}
			<P>{"() =>"}</P> <P>{"<"}</P>
			<T>Payment</T> <P>{"/>,"}</P>
			{"\n"}
			{"  "}review<P>:</P> {""}
			<P>{"() =>"}</P> <P>{"<"}</P>
			<T>Review</T> <P>{"/>,"}</P>
			{"\n"}
			<P>{"});"}</P>
		</>
	);
}
