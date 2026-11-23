"use client";

import { defineStepper } from "@stepperize/react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Loader2,
	Package,
	RotateCcw,
	Truck,
	Zap,
} from "lucide-react";
import {
	type CSSProperties,
	type ReactNode,
	type Ref,
	useRef,
	useState,
} from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DEFAULT_FRAMEWORK, type DocsFramework } from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { Tokens } from "./code";
import {
	CHOICE_LABELS,
	CHOICES,
	setFramework,
	useFramework,
} from "./framework-choice";
import { HERO_MAX_LINES, HERO_SOURCES, type LineMap } from "./hero-code";

/* ────────────────────────────── the flow ─────────────────────────────── */

const checkout = defineStepper([
	{ id: "account", title: "Account", hint: "Where we send the receipt" },
	{ id: "shipping", title: "Shipping", hint: "How fast it should arrive" },
	{ id: "review", title: "Review", hint: "Check it, then place the order" },
	{ id: "done", title: "Done", hint: "Order confirmed" },
]);

type StepId = (typeof checkout.steps)[number]["id"];
type Result =
	| { accepted: true; to: StepId | null }
	| { accepted: false; reason: string };
type Method = "next" | "prev" | "goTo";
/**
 * `from` is where the call started: the result itself only says where it led.
 * `target` is the step a `goTo()` (a click on the step list) asked for.
 */
type LastCall = {
	method: Method;
	from: StepId;
	target?: StepId;
	result: Result;
};

const SHIPPING = {
	standard: { label: "Standard", detail: "3–5 business days", price: 0 },
	express: { label: "Express", detail: "Next business day", price: 12 },
} as const;
type ShippingId = keyof typeof SHIPPING;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEMO_EMAIL = "ada@lovelace.dev";
const ORDER_DELAY_MS = 900;

/* ───────────────────────────── component ─────────────────────────────── */

/**
 * The hero is the product explaining itself: a real Stepperize instance on the
 * right, the code that drives it on the left, and an inspector strip that
 * prints the typed result of every navigation call. The highlighted lines
 * follow the live state, so "what does this code do?" answers itself.
 *
 * The code is shown in the visitor's framework (`hero-code.ts`). The preview
 * is always the React binding: every binding runs the same core flow, so the
 * step, the guard and the pending state it shows are what each version does.
 */
export function HeroPlayground() {
	const { Stepper } = checkout;
	const framework = useFramework();
	const [email, setEmail] = useState("");
	const [shipping, setShipping] = useState<ShippingId>("standard");
	const [lastCall, setLastCall] = useState<LastCall | null>(null);
	// 0 until the first move, so the first step does not animate in on load.
	const [direction, setDirection] = useState<0 | 1 | -1>(0);
	// The guard reads the latest email without re-creating the stepper options.
	const emailRef = useRef(email);
	emailRef.current = email;
	const emailInputRef = useRef<HTMLInputElement>(null);
	const lastIndex = useRef(0);

	return (
		<Stepper.Root
			linear
			guard={async ({ from, direction: move, signal }) => {
				// Back, and jumps from the step list, are never checked: only
				// `next()` validates the email and places the order.
				if (move !== "next") return true;
				if (from.id === "account") return EMAIL_RE.test(emailRef.current);
				if (from.id === "review") await placeOrder(signal);
			}}
			onChange={(snapshot) => {
				const index = checkout.steps.findIndex(
					(step) => step.id === snapshot.step,
				);
				if (index !== lastIndex.current) {
					setDirection(index > lastIndex.current ? 1 : -1);
					lastIndex.current = index;
				}
			}}
			className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
		>
			{(stepper) => {
				const run = async (method: Method, target?: StepId) => {
					const from = stepper.current.id;
					const result: Result =
						method === "goTo" && target
							? await stepper.goTo(target)
							: await stepper[method === "prev" ? "prev" : "next"]();
					// Every call lands in the inspector, so it never shows a stale result.
					setLastCall({ method, from, target, result });
					if (!result.accepted && result.reason === "guard") {
						rejectEmail(emailInputRef.current);
					}
				};
				const restart = () => {
					stepper.reset();
					setEmail("");
					setShipping("standard");
					setLastCall(null);
				};
				const rejected =
					lastCall?.result.accepted === false &&
					lastCall.result.reason === "guard";

				return (
					<>
						<WindowBar
							isPending={stepper.isPending}
							file={HERO_SOURCES[framework].file}
						/>
						{/*
						 * Desktop: code | preview, inspector across the bottom.
						 * Phones: preview, then the inspector right under it (so the
						 * result of a tap is on screen), then the code.
						 */}
						<div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
							<CodePane
								framework={framework}
								index={stepper.index}
								guardLine={getGuardLine(lastCall, stepper.isPending)}
							/>
							<div className="order-1 flex min-w-0 flex-col bg-background/40 p-5 sm:p-6 lg:order-none lg:border-l">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="text-[15px] font-semibold tracking-tight">
											{stepper.current.title}
										</p>
										<p className="truncate text-[13px] text-muted-foreground">
											{stepper.current.hint}
										</p>
									</div>
									<span className="shrink-0 rounded-full border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
										{stepper.index + 1} / {stepper.steps.length}
									</span>
								</div>

								<Stepper.List className="mt-5 flex items-center">
									{(step, index) => (
										<Stepper.Item
											key={step.id}
											step={step.id}
											className="group/item flex items-center not-last:flex-1"
										>
											<Stepper.Trigger
												aria-label={step.title}
												// The list's own goTo(), run here so its result is shown.
												onClick={(event) => {
													event.preventDefault();
													if (!stepper.isPending) void run("goTo", step.id);
												}}
												className="pressable hit-44 group/trigger flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:active:scale-100"
											>
												<Stepper.Indicator className="flex size-8 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-200 ease-out-strong group-data-[state=current]/trigger:border-primary group-data-[state=current]/trigger:bg-primary group-data-[state=current]/trigger:text-primary-foreground group-data-[state=current]/trigger:shadow-[0_0_0_4px] group-data-[state=current]/trigger:shadow-primary/15 group-data-[state=complete]/trigger:border-primary/30 group-data-[state=complete]/trigger:bg-primary/10 group-data-[state=complete]/trigger:text-primary group-data-[state=pending]/trigger:bg-muted group-data-[state=pending]/trigger:text-muted-foreground">
													{stepper.state(step.id) === "complete" ? (
														<Check
															className="lp-swap size-3.5"
															strokeWidth={3}
															aria-hidden
														/>
													) : (
														index + 1
													)}
												</Stepper.Indicator>
											</Stepper.Trigger>
											{index < stepper.steps.length - 1 && (
												<span
													aria-hidden
													className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-border"
												>
													<span className="absolute inset-0 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 ease-in-out-strong group-data-[state=complete]/item:scale-x-100 motion-reduce:transition-none" />
												</span>
											)}
										</Stepper.Item>
									)}
								</Stepper.List>

								<div className="relative mt-5 min-h-[196px] flex-1">
									<div
										key={stepper.current.id}
										// No entrance on first paint (it would play during
										// hydration); after that, a short slide in the
										// direction of travel. Transform and opacity only.
										className={
											direction === 1
												? "lp-from-right"
												: direction === -1
													? "lp-from-left"
													: undefined
										}
									>
										{stepper.match({
											account: () => (
												<AccountStep
													inputRef={emailInputRef}
													email={email}
													onEmailChange={setEmail}
													invalid={rejected && stepper.current.id === "account"}
													onSubmit={() => run("next")}
												/>
											),
											shipping: () => (
												<ShippingStep value={shipping} onChange={setShipping} />
											),
											review: () => (
												<ReviewStep email={email} shipping={shipping} />
											),
											done: () => (
												<DoneStep email={email} onRestart={restart} />
											),
										})}
									</div>
								</div>

								{!stepper.isLast && (
									<div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
										<button
											type="button"
											onClick={() => run("prev")}
											disabled={stepper.isFirst || stepper.isPending}
											className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm pointer-coarse:h-11 font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
										>
											<ArrowLeft className="size-4" aria-hidden />
											Back
										</button>
										<button
											type="button"
											onClick={() => run("next")}
											disabled={stepper.isPending}
											className="pressable inline-flex h-9 min-w-30 items-center pointer-coarse:h-11 justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/25 outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-80"
										>
											{stepper.isPending ? (
												<>
													<Loader2
														className="size-4 animate-spin"
														aria-hidden
													/>
													Placing…
												</>
											) : stepper.current.id === "review" ? (
												"Place order"
											) : (
												<>
													Continue
													<ArrowRight className="size-4" aria-hidden />
												</>
											)}
										</button>
									</div>
								)}
							</div>
							<Inspector
								id={stepper.current.id}
								index={stepper.index}
								isPending={stepper.isPending}
								lastCall={lastCall}
							/>
						</div>
					</>
				);
			}}
		</Stepper.Root>
	);
}

/**
 * A short horizontal shake says "no" without a modal. Driven from the event
 * (WAAPI), so it replays on every rejection, not just the first.
 */
function rejectEmail(input: HTMLInputElement | null) {
	if (!input) return;
	// Focus helps a keyboard user fix it; on a phone it would throw the
	// keyboard over the very message explaining what happened.
	if (window.matchMedia("(pointer: fine)").matches) input.focus();
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	input.animate(
		[
			{ transform: "translateX(0)" },
			{ transform: "translateX(-4px)" },
			{ transform: "translateX(3px)" },
			{ transform: "translateX(-2px)" },
			{ transform: "translateX(0)" },
		],
		{ duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
	);
}

function placeOrder(signal: AbortSignal) {
	return new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ORDER_DELAY_MS);
		signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
	});
}

type GuardHighlight = {
	line: keyof LineMap["guard"];
	tone: "pass" | "reject" | "pending";
} | null;

/** Which guard line the last navigation call went through, if any. */
function getGuardLine(
	lastCall: LastCall | null,
	isPending: boolean,
): GuardHighlight {
	if (isPending) return { line: "order", tone: "pending" };
	if (!lastCall) return null;
	const { method, from, target, result } = lastCall;
	if (!result.accepted) {
		return result.reason === "guard" ? { line: "email", tone: "reject" } : null;
	}
	// goTo() to the step already shown is not a move: the guard never ran.
	if (method === "goTo" && target === from) return null;
	if (method !== "next") return { line: "others", tone: "pass" };
	if (from === "account") return { line: "email", tone: "pass" };
	if (from === "review") return { line: "order", tone: "pass" };
	return null;
}

/* ────────────────────────────── chrome ───────────────────────────────── */

function WindowBar({ isPending, file }: { isPending: boolean; file: string }) {
	return (
		<div className="flex h-11 items-center gap-3 border-b bg-muted/40 px-4">
			<div className="flex gap-1.5 max-sm:hidden" aria-hidden>
				<span className="size-2.5 rounded-full bg-foreground/15" />
				<span className="size-2.5 rounded-full bg-foreground/15" />
				<span className="size-2.5 rounded-full bg-foreground/15" />
			</div>
			{/*
			 * Desktop: the bar sits over the code, so it names the file. Phones:
			 * the live preview comes first, so the bar names what is under it.
			 */}
			<span className="min-w-0 truncate font-mono text-xs text-muted-foreground max-lg:hidden">
				{file}
			</span>
			<span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground lg:hidden">
				<FrameworkIcon id="react" className="size-3.5" />
				<span className="truncate">Checkout preview, in React</span>
			</span>
			<span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
				<span
					aria-hidden
					className={cn(
						"size-1.5 rounded-full transition-colors duration-200",
						isPending ? "bg-amber-500" : "bg-emerald-500",
					)}
				/>
				Live<span className="max-lg:hidden">&nbsp;preview</span>
			</span>
		</div>
	);
}

const GUARD_TONE = {
	pass: "bg-emerald-500/10",
	reject: "bg-red-500/12",
	pending: "bg-amber-500/12",
} as const;

const CODE_PAD_Y = 16;

function CodePane({
	framework,
	index,
	guardLine,
}: {
	framework: DocsFramework;
	index: number;
	guardLine: GuardHighlight;
}) {
	const { lines, map } = HERO_SOURCES[framework];
	const active = new Set([map.steps[index], map.render[index]]);
	const isMain = framework === DEFAULT_FRAMEWORK;
	const guard = guardLine && map.guard[guardLine.line];

	return (
		<div className="order-3 flex min-w-0 flex-col bg-card lg:order-none">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 sm:px-4">
				<FrameworkSelect value={framework} />
				{/*
				 * The preview on the right is the React binding. Every binding
				 * runs the same core flow, so the state it shows is what this
				 * code would do too: say so, without making a fuss.
				 */}
				<p className="text-[11px] leading-snug text-muted-foreground sm:ml-auto">
					{isMain
						? "The code behind the preview"
						: "Same core flow as the preview, which runs React"}
				</p>
			</div>
			<div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
				{/* --lh drives both the text and the highlight bars, so they stay in register. */}
				<pre
					className="relative min-w-max font-mono text-[11.5px] [--lh:20px] sm:text-[12.5px] sm:[--lh:22px] lg:min-h-(--code-h)"
					style={
						{
							paddingBlock: CODE_PAD_Y,
							lineHeight: "var(--lh)",
							// The longest framework's height: switching never moves the page.
							"--code-h": `calc(${CODE_PAD_Y * 2}px + var(--lh) * ${HERO_MAX_LINES})`,
						} as CSSProperties
					}
				>
					{/*
					 * Moving highlights: they slide between lines as the state
					 * changes. Keyed by framework so a new snippet places them
					 * instantly instead of sliding across unrelated code.
					 */}
					<HighlightBar key={`${framework}-steps`} line={map.steps[index]} />
					<HighlightBar key={`${framework}-render`} line={map.render[index]} />
					{guardLine && guard != null && (
						<span
							aria-hidden
							key={`${framework}-${guard}-${guardLine.tone}`}
							className={cn(
								"lp-fade absolute inset-x-0",
								GUARD_TONE[guardLine.tone],
							)}
							style={{
								top: `calc(${CODE_PAD_Y}px + var(--lh) * ${guard})`,
								height: "var(--lh)",
							}}
						/>
					)}
					<code className="relative block">
						{lines.map((tokens, i) => (
							<div key={i} className="flex pr-6">
								<span
									aria-hidden
									className={cn(
										"w-10 shrink-0 pr-4 text-right tabular-nums select-none",
										active.has(i) ? "text-foreground/70" : "text-foreground/20",
									)}
								>
									{i + 1}
								</span>
								<span>
									<Tokens tokens={tokens} />
								</span>
							</div>
						))}
					</code>
				</pre>
			</div>
		</div>
	);
}

/** Picks the framework the code is shown in: the same choice as the rest of the page. */
function FrameworkSelect({ value }: { value: DocsFramework }) {
	return (
		<Select
			items={CHOICE_LABELS}
			value={value}
			onValueChange={(id) => {
				if (id) setFramework(id);
			}}
		>
			<SelectTrigger
				size="sm"
				aria-label="Show the code in"
				className="hit-44 h-7 gap-1.5 bg-background pr-1.5 pl-2 text-xs font-medium dark:bg-background"
			>
				<FrameworkIcon id={value} className="size-3.5" />
				<SelectValue />
			</SelectTrigger>
			<SelectContent
				align="start"
				alignItemWithTrigger={false}
				aria-label="Show the code in"
			>
				{CHOICES.map((entry) => (
					<SelectItem key={entry.id} value={entry.id}>
						<FrameworkIcon id={entry.id} />
						{entry.title}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function HighlightBar({ line }: { line: number }) {
	return (
		<span
			aria-hidden
			className="absolute inset-x-0 top-0 border-l-2 border-primary bg-primary/[0.07] transition-transform duration-250 ease-in-out-strong motion-reduce:transition-none"
			style={{
				height: "var(--lh)",
				transform: `translateY(calc(${CODE_PAD_Y}px + var(--lh) * ${line}))`,
			}}
		/>
	);
}

/* ───────────────────────────── inspector ─────────────────────────────── */

function Inspector({
	id,
	index,
	isPending,
	lastCall,
}: {
	id: StepId;
	index: number;
	isPending: boolean;
	lastCall: LastCall | null;
}) {
	return (
		<div className="order-2 flex flex-col gap-x-6 gap-y-2 border-y bg-muted/30 px-4 py-3 font-mono text-[11.5px] sm:flex-row sm:items-center sm:px-5 lg:order-none lg:col-span-2 lg:border-b-0">
			<div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
				<Field label="current.id">
					<span className="text-emerald-700 dark:text-emerald-300">"{id}"</span>
				</Field>
				<Field label="index">{index}</Field>
				<Field label="isPending">
					<span
						className={isPending ? "text-amber-600 dark:text-amber-300" : ""}
					>
						{String(isPending)}
					</span>
				</Field>
			</div>
			<div className="flex min-w-0 items-start gap-2 sm:ml-auto sm:items-center">
				<span className="shrink-0 text-muted-foreground">
					{lastCall ? `${callLabel(lastCall)} →` : "result →"}
				</span>
				{lastCall ? (
					<span
						key={JSON.stringify(lastCall)}
						className={cn(
							"lp-from-below rounded-md px-1.5 py-0.5 [overflow-wrap:anywhere] sm:truncate",
							lastCall.result.accepted
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "bg-red-500/10 text-red-600 dark:text-red-300",
						)}
					>
						{formatResult(lastCall.result)}
					</span>
				) : (
					<span className="truncate text-muted-foreground">press Continue</span>
				)}
			</div>
		</div>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1.5 whitespace-nowrap">
			<span>{label}</span>
			<span className="text-foreground">{children}</span>
		</span>
	);
}

function callLabel({ method, target }: LastCall) {
	return method === "goTo" ? `goTo("${target}")` : `${method}()`;
}

function formatResult(result: Result) {
	return result.accepted
		? `{ accepted: true, to: "${result.to}" }`
		: `{ accepted: false, reason: "${result.reason}" }`;
}

/* ─────────────────────────────── steps ───────────────────────────────── */

function AccountStep({
	inputRef,
	email,
	onEmailChange,
	invalid,
	onSubmit,
}: {
	inputRef: Ref<HTMLInputElement>;
	email: string;
	onEmailChange: (value: string) => void;
	invalid: boolean;
	onSubmit: () => void;
}) {
	return (
		<form
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor="hero-email" className="text-[13px] font-medium">
					Work email
				</label>
				<button
					type="button"
					onClick={() => onEmailChange(DEMO_EMAIL)}
					className="hit-44 rounded text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
				>
					Use demo email
				</button>
			</div>
			<Input
				ref={inputRef}
				id="hero-email"
				type="email"
				inputMode="email"
				autoComplete="off"
				autoCapitalize="none"
				spellCheck={false}
				enterKeyHint="next"
				placeholder="you@company.com"
				value={email}
				onChange={(event) => onEmailChange(event.target.value)}
				aria-invalid={invalid || undefined}
				aria-describedby="hero-email-hint"
				className={cn(
					"mt-2 h-10 w-full rounded-lg border bg-background px-3 shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-primary/60 focus:ring-3 focus:ring-primary/15",
					invalid &&
						"border-red-500/60 focus:border-red-500/70 focus:ring-red-500/15",
				)}
			/>
			<p
				id="hero-email-hint"
				className={cn(
					"mt-2 text-xs transition-colors duration-150",
					invalid ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
				)}
			>
				{invalid
					? "The guard returned false, so the move was cancelled."
					: "The guard blocks Continue until this is a valid email."}
			</p>
		</form>
	);
}

function ShippingStep({
	value,
	onChange,
}: {
	value: ShippingId;
	onChange: (value: ShippingId) => void;
}) {
	return (
		<fieldset>
			<legend className="text-[13px] font-medium">Delivery speed</legend>
			<div className="mt-2 grid gap-2">
				{(Object.keys(SHIPPING) as ShippingId[]).map((id) => {
					const option = SHIPPING[id];
					const Icon = id === "express" ? Zap : Truck;
					const selected = value === id;
					return (
						<label
							key={id}
							className={cn(
								"pressable flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 has-focus-visible:ring-2 has-focus-visible:ring-ring",
								selected
									? "border-primary/60 bg-primary/[0.04] shadow-[0_0_0_1px] shadow-primary/30"
									: "hover:border-foreground/20",
							)}
						>
							<input
								type="radio"
								name="hero-shipping"
								value={id}
								checked={selected}
								onChange={() => onChange(id)}
								className="sr-only"
							/>
							<span
								className={cn(
									"flex size-8 items-center justify-center rounded-md border transition-colors duration-150",
									selected
										? "border-primary/30 bg-primary/10 text-primary"
										: "bg-muted text-muted-foreground",
								)}
							>
								<Icon className="size-4" aria-hidden />
							</span>
							<span className="flex-1">
								<span className="block text-sm font-medium">
									{option.label}
								</span>
								<span className="block text-xs text-muted-foreground">
									{option.detail}
								</span>
							</span>
							<span className="text-sm font-medium tabular-nums">
								{option.price === 0 ? "Free" : `$${option.price}`}
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function ReviewStep({
	email,
	shipping,
}: {
	email: string;
	shipping: ShippingId;
}) {
	const option = SHIPPING[shipping];
	const rows = [
		{ label: "Receipt to", value: email },
		{ label: "Delivery", value: `${option.label} · ${option.detail}` },
		{
			label: "Total",
			value: `$${(48 + option.price).toFixed(2)}`,
			strong: true,
		},
	];

	return (
		<div className="rounded-lg border bg-background">
			<div className="flex items-center gap-3 border-b px-3 py-2.5">
				<span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
					<Package className="size-4" aria-hidden />
				</span>
				<span className="flex-1 text-sm font-medium">Stepperize hoodie</span>
				<span className="text-sm tabular-nums">$48.00</span>
			</div>
			<dl className="space-y-1.5 px-3 py-2.5 text-[13px]">
				{rows.map((row) => (
					<div key={row.label} className="flex justify-between gap-4">
						<dt className="text-muted-foreground">{row.label}</dt>
						<dd
							className={cn(
								"truncate tabular-nums",
								row.strong && "font-semibold",
							)}
						>
							{row.value}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function DoneStep({
	email,
	onRestart,
}: {
	email: string;
	onRestart: () => void;
}) {
	return (
		<div className="flex flex-col items-center py-3 text-center">
			<span className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 animate-in duration-250 ease-out-strong zoom-in-95 fade-in-0 motion-reduce:animate-none">
				<Check className="size-6" strokeWidth={2.75} aria-hidden />
			</span>
			<p className="mt-4 text-[15px] font-semibold tracking-tight">
				Order confirmed
			</p>
			<p className="mt-1 max-w-64 text-[13px] text-muted-foreground">
				The async guard resolved, so the move to <code>done</code> committed.
				Receipt sent to {email}.
			</p>
			<button
				type="button"
				onClick={onRestart}
				className="pressable mt-5 inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium outline-none pointer-coarse:h-11 pointer-coarse:px-4 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
			>
				<RotateCcw className="size-3.5" aria-hidden />
				stepper.reset()
			</button>
		</div>
	);
}
