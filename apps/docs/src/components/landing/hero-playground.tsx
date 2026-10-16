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
import { type ReactNode, type Ref, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────── the flow ─────────────────────────────── */

const checkout = defineStepper([
	{ id: "account", title: "Account", hint: "Where we send the receipt" },
	{ id: "shipping", title: "Shipping", hint: "How fast it should arrive" },
	{ id: "review", title: "Review", hint: "Check it, then place the order" },
	{ id: "done", title: "Done", hint: "Order confirmed" },
]);

type StepId = (typeof checkout.steps)[number]["id"];
type Result =
	| { accepted: true; from: StepId; to: StepId }
	| { accepted: false; reason: string };
type LastCall = { method: "next" | "prev" | "reset"; result: Result };

const SHIPPING = {
	standard: { label: "Standard", detail: "3–5 business days", price: 0 },
	express: { label: "Express", detail: "Next business day", price: 12 },
} as const;
type ShippingId = keyof typeof SHIPPING;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEMO_EMAIL = "ada@lovelace.dev";
const ORDER_DELAY_MS = 900;

/* ────────────────────────── the code, tokenized ──────────────────────── */

const SOURCE = `const checkout = defineStepper([
  { id: "account", title: "Account" },
  { id: "shipping", title: "Shipping" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
]);

function Checkout() {
  const stepper = checkout.useStepper({
    async beforeStepChange({ from, direction }) {
      if (direction === "prev") return true;
      if (from.id === "account") return isEmail(email);
      if (from.id === "review") await placeOrder();
    },
  });

  return stepper.match({
    account: () => <Account />,
    shipping: () => <Shipping />,
    review: () => <Review />,
    done: () => <Done />,
  });
}`;

/** Line numbers (0-based) the live state points at. */
const LINES = {
	stepDefinition: 1,
	prevGuard: 10,
	emailGuard: 11,
	orderGuard: 12,
	match: 17,
} as const;

const LINE_HEIGHT = 22;
const CODE_PAD_Y = 16;

type TokenKind = "comment" | "string" | "keyword" | "tag" | "fn" | "punct";

const TOKEN_RE =
	/(\/\/.*$)|("[^"]*")|\b(const|function|async|await|if|return|true)\b|(<\/?[A-Z]\w*|\/>)|\b([a-zA-Z_]\w*)(?=\()|([{}()[\];,.:=<>])/g;

const TOKEN_CLASS: Record<TokenKind, string> = {
	comment: "text-muted-foreground",
	string: "text-emerald-700 dark:text-emerald-300",
	keyword: "text-violet-600 dark:text-violet-300",
	tag: "text-amber-700 dark:text-amber-300",
	fn: "text-sky-700 dark:text-sky-300",
	punct: "text-foreground/45",
};

function tokenize(line: string) {
	const out: { kind?: TokenKind; text: string }[] = [];
	let last = 0;
	for (const m of line.matchAll(TOKEN_RE)) {
		const index = m.index ?? 0;
		if (index > last) out.push({ text: line.slice(last, index) });
		const kind: TokenKind = m[1]
			? "comment"
			: m[2]
				? "string"
				: m[3]
					? "keyword"
					: m[4]
						? "tag"
						: m[5]
							? "fn"
							: "punct";
		out.push({ kind, text: m[0] });
		last = index + m[0].length;
	}
	if (last < line.length) out.push({ text: line.slice(last) });
	return out;
}

// Static: tokenized once at module load, never per render.
const CODE_LINES = SOURCE.split("\n").map(tokenize);

/* ───────────────────────────── component ─────────────────────────────── */

/**
 * The hero is the product explaining itself: a real Stepperize instance on the
 * right, the code that drives it on the left, and an inspector strip that
 * prints the typed result of every navigation call. The highlighted lines
 * follow the live state, so "what does this code do?" answers itself.
 */
export function HeroPlayground() {
	const { Stepper } = checkout;
	const [email, setEmail] = useState("");
	const [shipping, setShipping] = useState<ShippingId>("standard");
	const [lastCall, setLastCall] = useState<LastCall | null>(null);
	const [direction, setDirection] = useState<1 | -1>(1);
	// The guard reads the latest email without re-creating the stepper options.
	const emailRef = useRef(email);
	emailRef.current = email;
	const emailInputRef = useRef<HTMLInputElement>(null);

	return (
		<Stepper.Root
			linear
			beforeStepChange={async ({ from, direction: move, signal }) => {
				if (move === "prev") return true;
				if (from.id === "account") return EMAIL_RE.test(emailRef.current);
				if (from.id === "review") await placeOrder(signal);
			}}
			onStepChange={(_step, context) =>
				setDirection(context.toIndex >= context.fromIndex ? 1 : -1)
			}
			className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
		>
			{({ stepper }) => {
				const run = async (method: "next" | "prev") => {
					const result = (await stepper[method]()) as Result;
					setLastCall({ method, result });
					if (!result.accepted && result.reason === "guard") {
						rejectEmail(emailInputRef.current);
					}
				};
				const restart = async () => {
					const result = (await stepper.reset()) as Result;
					setEmail("");
					setShipping("standard");
					setLastCall({ method: "reset", result });
				};
				const rejected =
					lastCall?.result.accepted === false &&
					lastCall.result.reason === "guard";

				return (
					<>
						<WindowBar isPending={stepper.isPending} />
						<div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
							<CodePane
								index={stepper.index}
								guardLine={getGuardLine(lastCall, stepper.isPending)}
							/>
							<div className="order-first flex min-w-0 flex-col border-b bg-background/40 p-5 sm:p-6 lg:order-none lg:border-b-0 lg:border-l">
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
										{stepper.index + 1} / {stepper.count}
									</span>
								</div>

								<Stepper.List className="mt-5 flex items-center">
									<Stepper.Items>
										{(step, index) => (
											<Stepper.Item
												key={step.id}
												step={step.id}
												className="group/item flex items-center not-last:flex-1"
											>
												<Stepper.Trigger
													aria-label={step.title}
													className="pressable group/trigger relative flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:active:scale-100"
												>
													<Stepper.Indicator className="flex size-8 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-300 ease-out-strong group-data-[status=active]/trigger:border-primary group-data-[status=active]/trigger:bg-primary group-data-[status=active]/trigger:text-primary-foreground group-data-[status=active]/trigger:shadow-[0_0_0_4px] group-data-[status=active]/trigger:shadow-primary/15 group-data-[status=previous]/trigger:border-primary/30 group-data-[status=previous]/trigger:bg-primary/10 group-data-[status=previous]/trigger:text-primary group-data-[status=upcoming]/trigger:bg-muted group-data-[status=upcoming]/trigger:text-muted-foreground">
														{stepper.status(step.id) === "previous" ? (
															<Check
																className="size-3.5 animate-in duration-200 zoom-in-75 fade-in-0"
																strokeWidth={3}
																aria-hidden
															/>
														) : (
															index + 1
														)}
													</Stepper.Indicator>
												</Stepper.Trigger>
												{index < stepper.count - 1 && (
													<span
														aria-hidden
														className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-border"
													>
														<span className="absolute inset-0 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-500 ease-in-out-strong group-data-[status=previous]/item:scale-x-100" />
													</span>
												)}
											</Stepper.Item>
										)}
									</Stepper.Items>
								</Stepper.List>

								<div className="relative mt-5 min-h-[196px] flex-1">
									<div
										key={stepper.id}
										className={cn(
											"duration-300 ease-out-strong animate-in fade-in-0 motion-safe:blur-in-2",
											direction === 1
												? "motion-safe:slide-in-from-right-3"
												: "motion-safe:slide-in-from-left-3",
										)}
									>
										{stepper.match({
											account: () => (
												<AccountStep
													inputRef={emailInputRef}
													email={email}
													onEmailChange={setEmail}
													invalid={rejected && stepper.id === "account"}
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
											className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
										>
											<ArrowLeft className="size-4" aria-hidden />
											Back
										</button>
										<button
											type="button"
											onClick={() => run("next")}
											disabled={stepper.isPending}
											className="pressable inline-flex h-9 min-w-30 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/25 outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-80"
										>
											{stepper.isPending ? (
												<>
													<Loader2
														className="size-4 animate-spin"
														aria-hidden
													/>
													Placing…
												</>
											) : stepper.id === "review" ? (
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
						</div>
						<Inspector
							id={stepper.id}
							index={stepper.index}
							isPending={stepper.isPending}
							lastCall={lastCall}
						/>
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
	input.focus();
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
	line: number;
	tone: "pass" | "reject" | "pending";
} | null;

/** Which guard line the last navigation call went through, if any. */
function getGuardLine(
	lastCall: LastCall | null,
	isPending: boolean,
): GuardHighlight {
	if (isPending) return { line: LINES.orderGuard, tone: "pending" };
	if (!lastCall) return null;
	const { method, result } = lastCall;
	if (!result.accepted) {
		return result.reason === "guard"
			? { line: LINES.emailGuard, tone: "reject" }
			: null;
	}
	if (method === "prev") return { line: LINES.prevGuard, tone: "pass" };
	if (result.from === "account")
		return { line: LINES.emailGuard, tone: "pass" };
	if (result.from === "review") return { line: LINES.orderGuard, tone: "pass" };
	return null;
}

/* ────────────────────────────── chrome ───────────────────────────────── */

function WindowBar({ isPending }: { isPending: boolean }) {
	return (
		<div className="flex h-11 items-center gap-3 border-b bg-muted/40 px-4">
			<div className="flex gap-1.5" aria-hidden>
				<span className="size-2.5 rounded-full bg-foreground/15" />
				<span className="size-2.5 rounded-full bg-foreground/15" />
				<span className="size-2.5 rounded-full bg-foreground/15" />
			</div>
			<span className="font-mono text-xs text-muted-foreground">
				checkout.tsx
			</span>
			<span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
				<span
					aria-hidden
					className={cn(
						"size-1.5 rounded-full transition-colors duration-200",
						isPending ? "bg-amber-500" : "bg-emerald-500",
					)}
				/>
				Live preview
			</span>
		</div>
	);
}

const GUARD_TONE = {
	pass: "bg-emerald-500/10",
	reject: "bg-red-500/12",
	pending: "bg-amber-500/12",
} as const;

function CodePane({
	index,
	guardLine,
}: {
	index: number;
	guardLine: GuardHighlight;
}) {
	return (
		<div className="relative min-w-0 overflow-x-auto overscroll-x-contain bg-card">
			<pre
				className="relative min-w-max font-mono text-[12.5px]"
				style={{ paddingBlock: CODE_PAD_Y, lineHeight: `${LINE_HEIGHT}px` }}
			>
				{/* Moving highlights: they slide between lines as the state changes. */}
				<HighlightBar line={LINES.stepDefinition + index} />
				<HighlightBar line={LINES.match + index} />
				{guardLine && (
					<span
						aria-hidden
						key={`${guardLine.line}-${guardLine.tone}`}
						className={cn(
							"absolute inset-x-0 animate-in duration-300 fade-in-0",
							GUARD_TONE[guardLine.tone],
						)}
						style={{
							top: CODE_PAD_Y + guardLine.line * LINE_HEIGHT,
							height: LINE_HEIGHT,
						}}
					/>
				)}
				<code className="relative block">
					{CODE_LINES.map((tokens, i) => {
						const active =
							i === LINES.stepDefinition + index || i === LINES.match + index;
						return (
							<div key={i} className="flex pr-6">
								<span
									aria-hidden
									className={cn(
										"w-10 shrink-0 pr-4 text-right tabular-nums transition-colors duration-200 select-none",
										active ? "text-foreground/70" : "text-foreground/20",
									)}
								>
									{i + 1}
								</span>
								<span>
									{tokens.length === 0
										? " "
										: tokens.map((t, j) =>
												t.kind ? (
													<span key={j} className={TOKEN_CLASS[t.kind]}>
														{t.text}
													</span>
												) : (
													t.text
												),
											)}
								</span>
							</div>
						);
					})}
				</code>
			</pre>
		</div>
	);
}

function HighlightBar({ line }: { line: number }) {
	return (
		<span
			aria-hidden
			className="absolute inset-x-0 top-0 border-l-2 border-primary bg-primary/[0.07] transition-transform duration-300 ease-in-out-strong motion-reduce:transition-none"
			style={{
				height: LINE_HEIGHT,
				transform: `translateY(${CODE_PAD_Y + line * LINE_HEIGHT}px)`,
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
		<div className="flex flex-col gap-x-6 gap-y-2 border-t bg-muted/30 px-4 py-3 font-mono text-[11.5px] sm:flex-row sm:items-center sm:px-5">
			<div className="flex shrink-0 items-center gap-4 text-muted-foreground">
				<Field label="stepper.id">
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
			<div className="flex min-w-0 items-center gap-2 sm:ml-auto">
				<span className="shrink-0 text-muted-foreground">
					{lastCall ? `${lastCall.method}() →` : "result →"}
				</span>
				{lastCall ? (
					<span
						key={JSON.stringify(lastCall)}
						className={cn(
							"truncate rounded-md px-1.5 py-0.5 animate-in duration-200 fade-in-0 motion-safe:slide-in-from-bottom-1",
							lastCall.result.accepted
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "bg-red-500/10 text-red-600 dark:text-red-300",
						)}
					>
						{formatResult(lastCall.result)}
					</span>
				) : (
					<span className="truncate text-muted-foreground/70">
						press Continue
					</span>
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

function formatResult(result: Result) {
	return result.accepted
		? `{ accepted: true, from: "${result.from}", to: "${result.to}" }`
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
					className="rounded text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
				>
					Use demo email
				</button>
			</div>
			<input
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
					"mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15",
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
			<span className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 animate-in duration-500 ease-out-strong zoom-in-75 fade-in-0">
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
				className="pressable mt-5 inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
			>
				<RotateCcw className="size-3.5" aria-hidden />
				stepper.reset()
			</button>
		</div>
	);
}
