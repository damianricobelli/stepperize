"use client";

import { defineStepper, type Step } from "@stepperize/react";
import {
	ArrowLeft,
	ArrowRight,
	Braces,
	Check,
	ChevronRight,
	Lock,
	RotateCcw,
} from "lucide-react";
import {
	createContext,
	type FormEvent,
	Fragment,
	type ReactNode,
	use,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Names } from "@/lib/studio/codegen/shared";
import type { Framework, StudioConfig } from "@/lib/studio/config";
import { loadSchemaFactory } from "@/lib/studio/runtime-schemas";
import { cn } from "@/lib/utils";
import { PreviewField, readField } from "./preview-field";

/**
 * The live preview runs the real `@stepperize/react` with a real schema from
 * the selected library. Only the form library differs: the preview uses a
 * native form, the generated code uses the one you picked. Everything else —
 * navigation policy, guards, URL ownership, completion — is the real thing.
 */

type AnyDefinition = ReturnType<typeof defineStepper<readonly Step[]>>;

type PreviewContextValue = {
	config: StudioConfig;
	names: Names;
	definition: AnyDefinition;
	issues: Record<string, Record<string, string>>;
	setIssues: (stepId: string, issues: Record<string, string>) => void;
	/** `next()` completed the last step. */
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

function usePreview(): PreviewContextValue {
	const value = use(PreviewContext);
	if (!value) throw new Error("usePreview must be used inside <PreviewFlow>.");
	return value;
}

const DEV_ORIGIN: Record<Framework, string> = {
	nextjs: "localhost:3000",
	"tanstack-start": "localhost:3000",
	"react-router": "localhost:5173",
	vite: "localhost:5173",
};

function previewUrl(
	config: StudioConfig,
	names: Names,
	step: string,
): { path: string; query?: string } {
	if (config.navigation === "routes") return { path: `/${names.slug}/${step}` };
	if (config.navigation === "search-params")
		return { path: `/${names.slug}`, query: `?step=${step}` };
	return { path: `/${names.slug}` };
}

function readDraft(key: string): Record<string, unknown> | undefined {
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : undefined;
	} catch {
		return undefined;
	}
}

function writeDraft(key: string, data: unknown) {
	try {
		window.localStorage.setItem(key, JSON.stringify(data));
	} catch {
		// Storage can be blocked; the preview keeps working without it.
	}
}

type History = { entries: string[]; index: number };

export function PreviewFlow({
	config,
	names,
	mobile,
	inspect,
	onInspectChange,
}: {
	config: StudioConfig;
	names: Names;
	mobile: boolean;
	/** Shows the stepper's live state (id, index, progress, data) under the flow. */
	inspect: boolean;
	onInspectChange: (inspect: boolean) => void;
}) {
	// Suspends until the selected validation library has loaded.
	const factory = use(loadSchemaFactory(config.validation));
	const controlled = config.navigation !== "component";
	const draftKey = `stepperize-studio:${names.slug}`;

	// The parent remounts this component whenever the flow's shape changes,
	// so the definition is created once per mount.
	const [definition] = useState(() => {
		const steps = config.steps.map((step, i) => ({
			id: names.stepIds[i],
			title: step.title,
			description: step.description,
			...(factory && step.fields.length
				? {
						schema: factory(
							step.fields.map((field, j) => ({
								key: names.fields[i][j],
								field,
							})),
						),
					}
				: {}),
		}));
		return defineStepper(steps as never, {
			linear: config.behavior.linear,
		}) as unknown as AnyDefinition;
	});
	const [defaultData] = useState(() =>
		config.behavior.persist ? readDraft(draftKey) : undefined,
	);
	const [history, setHistory] = useState<History>({
		entries: [names.stepIds[0]],
		index: 0,
	});
	const [issues, setAllIssues] = useState<PreviewContextValue["issues"]>({});
	const [blocked, setBlocked] = useState<string | null>(null);
	// `onChange` also reports data changes: remember the step to tell moves apart.
	const lastStep = useRef(names.stepIds[0]);

	const current = history.entries[history.index];
	const url = previewUrl(config, names, current);
	const guard = config.behavior.guard && config.validation !== "none";

	const context: PreviewContextValue = {
		config,
		names,
		definition,
		issues,
		setIssues: (stepId, next) =>
			setAllIssues((all) => ({ ...all, [stepId]: next })),
	};

	const { Stepper } = definition;

	return (
		<PreviewContext value={context}>
			<div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
				<div className="flex items-center gap-0.5">
					<ChromeButton
						label="Back"
						disabled={!controlled || history.index === 0}
						onClick={() => setHistory((h) => ({ ...h, index: h.index - 1 }))}
					>
						<ArrowLeft aria-hidden className="size-3.5" />
					</ChromeButton>
					<ChromeButton
						label="Forward"
						disabled={
							!controlled || history.index >= history.entries.length - 1
						}
						onClick={() => setHistory((h) => ({ ...h, index: h.index + 1 }))}
					>
						<ArrowRight aria-hidden className="size-3.5" />
					</ChromeButton>
				</div>
				<div className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-background px-2.5 font-mono text-[11.5px] text-muted-foreground shadow-xs ring-1 ring-border">
					<Lock aria-hidden className="size-3 shrink-0" />
					<span className="truncate">
						<span className="max-sm:hidden">
							{DEV_ORIGIN[config.framework]}
						</span>
						<span className="text-foreground">{url.path}</span>
						{url.query ? (
							<span className="rounded bg-primary/12 px-0.5 text-accent-foreground">
								{url.query}
							</span>
						) : null}
					</span>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					aria-pressed={inspect}
					title="Show the stepper state"
					onClick={() => onInspectChange(!inspect)}
					className="text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
				>
					<Braces aria-hidden data-icon="inline-start" />
					<span className="max-sm:sr-only">State</span>
				</Button>
			</div>

			<Stepper.Root
				{...(controlled
					? {
							// The flow follows the address bar; a step it cannot be on is corrected in place.
							step: current,
							onInvalidStep: (actual: string) =>
								setHistory((h) => ({
									entries: h.entries.map((entry, i) =>
										i === h.index ? actual : entry,
									),
									index: h.index,
								})),
						}
					: {})}
				{...(defaultData ? { snapshot: { data: defaultData } } : {})}
				onChange={(snapshot) => {
					if (config.behavior.persist) writeDraft(draftKey, snapshot.data);
					if (snapshot.step === lastStep.current) return;
					lastStep.current = snapshot.step;
					setBlocked(null);
					if (controlled && snapshot.step !== current) {
						setHistory((h) => ({
							entries: [...h.entries.slice(0, h.index + 1), snapshot.step],
							index: h.index + 1,
						}));
					}
				}}
				{...(guard
					? {
							// `next()` validates each step. The guard covers the step list:
							// jumping ahead needs the step being left to be valid.
							guard: async ({ from, to, direction, data }) => {
								if (direction !== "goTo" || !to) return true;
								const fromIndex = names.stepIds.indexOf(from.id);
								if (names.stepIds.indexOf(to.id) < fromIndex) return true;
								if (!from.schema) return true;
								const result = await from.schema["~standard"].validate(
									(data as Record<string, unknown>)[from.id],
								);
								if (result.issues)
									setBlocked(config.steps[fromIndex]?.title ?? from.id);
								return !result.issues;
							},
						}
					: {})}
				orientation={config.layout === "vertical" ? "vertical" : "horizontal"}
			>
				<div className="@container p-5 sm:p-7">
					<div
						className={cn(
							config.layout === "vertical"
								? "flex flex-col gap-8 @lg:flex-row"
								: "grid gap-7",
						)}
					>
						<PreviewNav mobile={mobile} />
						<div className={cn("grid min-w-0 flex-1 content-start gap-5")}>
							{blocked ? (
								<p
									role="status"
									className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0"
								>
									Finish “{blocked}” with Continue first. The guard validates
									saved data before you jump ahead.
								</p>
							) : null}
							<PreviewContent />
						</div>
					</div>
				</div>
				{inspect ? <PreviewInspector /> : null}
			</Stepper.Root>
		</PreviewContext>
	);
}

function ChromeButton({
	label,
	disabled,
	onClick,
	children,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={label}
			title={
				disabled ? "Navigation only enters browser history in URL modes" : label
			}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

// ─── Navigation (one explicit variant per layout) ────────────────────────────

const INDICATOR =
	"grid size-8 shrink-0 place-items-center rounded-full border bg-background text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow] duration-200 ease-out data-[state=current]:border-primary data-[state=current]:bg-primary data-[state=current]:text-primary-foreground data-[state=current]:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_16%,transparent)] data-[state=complete]:border-primary/40 data-[state=complete]:bg-primary/10 data-[state=complete]:text-primary";

function IndicatorBody({ index }: { index: number }) {
	const { config } = usePreview();
	if (config.indicator === "dot")
		return <span className={cn("size-2 rounded-full bg-current")} />;
	if (config.indicator === "check") {
		return (
			<>
				<span className="group-data-[state=complete]/indicator:hidden">
					{index + 1}
				</span>
				<Check
					aria-hidden
					className="hidden size-4 group-data-[state=complete]/indicator:block"
				/>
			</>
		);
	}
	return <>{index + 1}</>;
}

function PreviewNav({ mobile }: { mobile: boolean }) {
	const { config, definition } = usePreview();
	const { Stepper } = definition;

	switch (config.layout) {
		case "horizontal":
		case "vertical": {
			// Same markup as the generated nav: the vertical rail stacks above the content on narrow screens.
			const vertical = config.layout === "vertical";
			return (
				<Stepper.List
					orientation={vertical ? "vertical" : "horizontal"}
					className={cn(
						vertical
							? "flex shrink-0 flex-col @lg:w-52"
							: "flex items-center gap-3",
					)}
				>
					{(_step, index) => (
						<Stepper.Item
							className={cn(
								vertical
									? "group/item relative pb-6 pl-11 last:pb-0"
									: "group/item flex flex-1 items-center gap-3 last:flex-none",
							)}
						>
							<Stepper.Trigger
								className={cn(
									cn(
										"flex rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
										vertical ? "items-start gap-3" : "items-center gap-2",
									),
								)}
							>
								<Stepper.Indicator
									className={cn(
										cn(
											"group/indicator",
											INDICATOR,
											vertical && "absolute left-0",
										),
									)}
								>
									<IndicatorBody index={index} />
								</Stepper.Indicator>
								{vertical ? (
									<span className={cn("pt-1.5")}>
										<Stepper.Title
											className={cn("block text-sm font-medium")}
										/>
										<Stepper.Description
											className={cn(
												"mt-0.5 block text-xs text-muted-foreground",
											)}
										/>
									</span>
								) : (
									<Stepper.Title
										className={cn(
											cn(
												"text-sm font-medium whitespace-nowrap",
												// Like the generated `max-sm:` rule, but for the preview's own width.
												mobile
													? "not-group-data-[state=current]/item:hidden"
													: "@max-sm:not-group-data-[state=current]/item:hidden",
											),
										)}
									/>
								)}
							</Stepper.Trigger>
							<span
								aria-hidden
								className={cn(
									vertical
										? "absolute top-9 bottom-1 left-4 w-px bg-border group-last/item:hidden group-data-[state=complete]/item:bg-primary"
										: "h-px min-w-6 flex-1 bg-border transition-colors duration-200 group-last/item:hidden group-data-[state=complete]/item:bg-primary",
								)}
							/>
						</Stepper.Item>
					)}
				</Stepper.List>
			);
		}
		case "segmented":
			return (
				<Stepper.List
					className={cn("flex gap-1 overflow-x-auto rounded-xl bg-muted p-1")}
				>
					{() => (
						<Stepper.Item className={cn("flex-1")}>
							<Stepper.Trigger
								className={cn(
									"h-9 w-full rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed data-[state=current]:bg-background data-[state=current]:text-foreground data-[state=current]:shadow-sm data-[state=complete]:text-primary",
								)}
							>
								<Stepper.Title />
							</Stepper.Trigger>
						</Stepper.Item>
					)}
				</Stepper.List>
			);
		case "breadcrumb":
			return (
				<Stepper.List
					className={cn("flex flex-wrap items-center gap-1 text-sm")}
				>
					{(_step, index) => (
						<Stepper.Item className={cn("flex items-center gap-1")}>
							{index > 0 ? (
								<ChevronRight
									aria-hidden
									className="size-4 text-muted-foreground/60"
								/>
							) : null}
							<Stepper.Trigger
								className={cn(
									"rounded-md px-2 py-1 font-medium text-muted-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed data-[state=current]:bg-muted data-[state=current]:text-foreground data-[state=complete]:text-primary",
								)}
							>
								<Stepper.Title />
							</Stepper.Trigger>
						</Stepper.Item>
					)}
				</Stepper.List>
			);
		case "progress":
			return <ProgressNav />;
		case "circular":
			return <CircularNav />;
	}
}

function ProgressNav() {
	const { config, definition } = usePreview();
	const index = definition.useStepperContext((s) => s.index);
	const progress = definition.useStepperContext((s) => s.progress);
	return (
		<div className={cn("grid gap-2")}>
			<div className={cn("flex items-baseline justify-between gap-4 text-sm")}>
				<span className={cn("font-medium tabular-nums")}>
					Step {index + 1} of {definition.steps.length}
				</span>
				<span className={cn("text-muted-foreground")}>
					{config.steps[index]?.title}
				</span>
			</div>
			<Progress value={progress * 100} aria-label="Progress" />
		</div>
	);
}

const CIRCUMFERENCE = 2 * Math.PI * 26;

function CircularNav() {
	const { config, definition } = usePreview();
	const index = definition.useStepperContext((s) => s.index);
	const count = definition.steps.length;
	const next = config.steps[index + 1];
	return (
		<div className={cn("flex items-center gap-4")}>
			<div className="relative grid size-16 shrink-0 place-items-center">
				<svg
					viewBox="0 0 64 64"
					className="absolute inset-0 -rotate-90"
					aria-hidden
				>
					<circle
						cx="32"
						cy="32"
						r="26"
						className="fill-none stroke-muted"
						strokeWidth={6}
					/>
					<circle
						cx="32"
						cy="32"
						r="26"
						className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300 ease-out-strong"
						strokeWidth={6}
						strokeLinecap="round"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={CIRCUMFERENCE * (1 - (index + 1) / count)}
					/>
				</svg>
				<span className="text-sm font-semibold tabular-nums">
					{index + 1}/{count}
				</span>
			</div>
			<div>
				<p className={cn("font-semibold")}>{config.steps[index]?.title}</p>
				<p className={cn("text-sm text-muted-foreground")}>
					{next ? `Next: ${next.title}` : "Last step"}
				</p>
			</div>
		</div>
	);
}

// ─── Step content ────────────────────────────────────────────────────────────

function PreviewContent() {
	const { config, names, definition } = usePreview();
	const finished = definition.useStepperContext((s) => s.isFinished);
	const id = definition.useStepperContext((s) => s.current.id);
	const { Stepper } = definition;

	if (finished) return <Finished />;

	if (config.behavior.keepMounted) {
		return (
			<>
				<StepHeader />
				{names.stepIds.map((stepId, index) => (
					<Stepper.Content key={stepId} step={stepId} forceMount>
						<StepBody index={index} />
					</Stepper.Content>
				))}
			</>
		);
	}
	const index = names.stepIds.indexOf(id);
	return (
		// Keyed so each step enters with its own short fade; forms remount and
		// re-seed from saved data, exactly like the generated code.
		<div
			key={id}
			className="grid content-start gap-5 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0"
		>
			<StepHeader />
			<StepBody index={index} />
		</div>
	);
}

function StepHeader() {
	const { definition } = usePreview();
	const step = definition.useStepperContext((s) => s.current) as Step & {
		title?: string;
		description?: string;
	};
	return (
		<header className={cn("grid gap-1")}>
			<h2 className={cn("text-lg font-semibold tracking-tight text-balance")}>
				{step.title}
			</h2>
			{step.description ? (
				<p className={cn("text-sm text-muted-foreground")}>
					{step.description}
				</p>
			) : null}
		</header>
	);
}

function StepBody({ index }: { index: number }) {
	const { config } = usePreview();
	const step = config.steps[index];
	if (step.fields.length) return <StepForm index={index} />;
	if (index === config.steps.length - 1) return <Summary />;
	return <ContentStep />;
}

function StepForm({ index }: { index: number }) {
	const { config, names, definition, issues, setIssues } = usePreview();
	const stepper = definition.useStepperContext();
	const id = names.stepIds[index];
	const keys = names.fields[index];
	const step = config.steps[index];
	// Read once: `next()` saves a rejected draft too, and uncontrolled inputs keep their own state.
	const [saved] = useState(
		() => stepper.data[id] as Record<string, unknown> | undefined,
	);
	const stepIssues = issues[id] ?? {};
	const last = index === config.steps.length - 1;
	const [pending, setPending] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		// React clears currentTarget once the handler yields, so keep the form.
		const form = event.currentTarget;
		const formData = new FormData(form);
		const value = Object.fromEntries(
			step.fields.map((field, j) => [
				keys[j],
				readField(field, keys[j], formData),
			]),
		);
		setPending(true);
		try {
			// `next()` saves the values, validates them against the step's schema and
			// moves on. On the last step it finishes the flow.
			const result = await stepper.next(value);
			const failed = result.accepted ? [] : (result.issues ?? []);
			setIssues(
				id,
				Object.fromEntries(
					failed.map((issue) => {
						const key = issue.path?.[0];
						return [
							String(typeof key === "object" ? key.key : key),
							issue.message,
						];
					}),
				),
			);
			// Focus the first invalid control so keyboard users land on the problem.
			const firstKey = failed[0]?.path?.[0];
			if (firstKey !== undefined) {
				form
					.querySelector<HTMLElement>(
						`[name="${String(typeof firstKey === "object" ? firstKey.key : firstKey)}"]`,
					)
					?.focus();
			}
		} finally {
			setPending(false);
		}
	}

	return (
		<form
			noValidate
			onSubmit={handleSubmit}
			className="grid gap-4 @md:grid-cols-2"
		>
			{step.fields.map((field, j) => (
				<PreviewField
					key={keys[j]}
					field={field}
					name={keys[j]}
					defaultValue={saved?.[keys[j]]}
					error={stepIssues[keys[j]]}
				/>
			))}
			<Actions>
				<KitButton
					variant="back"
					disabled={stepper.isFirst}
					onClick={() => stepper.prev()}
				>
					Back
				</KitButton>
				<KitButton variant="primary" type="submit" disabled={pending}>
					{last ? "Finish" : "Continue"}
				</KitButton>
			</Actions>
		</form>
	);
}

function Actions({ children }: { children: ReactNode }) {
	return (
		<div className="flex justify-between gap-2 @md:col-span-2">{children}</div>
	);
}

function KitButton({
	variant,
	type = "button",
	disabled,
	onClick,
	children,
}: {
	variant: "back" | "primary";
	type?: "button" | "submit";
	disabled?: boolean;
	onClick?: () => void;
	children: ReactNode;
}) {
	return (
		<Button
			type={type}
			variant={variant === "back" ? "outline" : "default"}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function ContentStep() {
	const { definition } = usePreview();
	const stepper = definition.useStepperContext();
	return (
		<section className={cn("grid gap-4")}>
			<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				No fields here. The generated step renders a placeholder for your own
				content.
			</p>
			<Actions>
				<KitButton
					variant="back"
					disabled={stepper.isFirst}
					onClick={() => stepper.prev()}
				>
					Back
				</KitButton>
				<KitButton variant="primary" onClick={() => stepper.next()}>
					Continue
				</KitButton>
			</Actions>
		</section>
	);
}

function display(value: unknown): string {
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
	return value === undefined || value === "" ? "—" : String(value);
}

function Summary() {
	const { config, names, definition } = usePreview();
	const stepper = definition.useStepperContext();
	return (
		<section className={cn("grid gap-3")}>
			{config.steps.slice(0, -1).map((step, i) => {
				if (!step.fields.length) return null;
				const id = names.stepIds[i];
				const data = stepper.data[id] as Record<string, unknown> | undefined;
				return (
					<div key={id} className={cn("rounded-lg border p-4")}>
						<div className={cn("flex items-center justify-between")}>
							<h3 className={cn("text-sm font-medium")}>{step.title}</h3>
							<Button
								type="button"
								variant="link"
								size="sm"
								onClick={() => stepper.goTo(id)}
							>
								Edit
							</Button>
						</div>
						<dl
							className={cn(
								"mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm",
							)}
						>
							{step.fields.map((field, j) => (
								<Fragment key={names.fields[i][j]}>
									<dt className={cn("text-muted-foreground")}>{field.label}</dt>
									<dd className="min-w-0 break-words">
										{display(data?.[names.fields[i][j]])}
									</dd>
								</Fragment>
							))}
						</dl>
					</div>
				);
			})}
			<Actions>
				<KitButton variant="back" onClick={() => stepper.prev()}>
					Back
				</KitButton>
				<KitButton variant="primary" onClick={() => stepper.next()}>
					Finish
				</KitButton>
			</Actions>
		</section>
	);
}

function Finished() {
	const { config, definition } = usePreview();
	const stepper = definition.useStepperContext();
	return (
		<div className="grid justify-items-center gap-2 py-6 text-center transition-[opacity,scale] duration-300 ease-out-strong starting:scale-95 starting:opacity-0">
			<span className="grid size-11 place-items-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
				<Check aria-hidden className="size-5" strokeWidth={2.5} />
			</span>
			<h2 className="mt-1 text-lg font-semibold">{config.name} complete</h2>
			<p className="max-w-[40ch] text-sm text-muted-foreground">
				Every step is marked complete. In your app, this is where the final
				request runs.
			</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="mt-2"
				onClick={() => stepper.reset()}
			>
				<RotateCcw aria-hidden data-icon="inline-start" /> Start over
			</Button>
		</div>
	);
}

// ─── Inspector ───────────────────────────────────────────────────────────────

function PreviewInspector() {
	const { definition } = usePreview();
	const stepper = definition.useStepperContext();
	const completed = stepper.snapshot().complete;
	const data = stepper.data;
	return (
		<div className="grid gap-1 border-t bg-muted/30 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
			<div className="flex flex-wrap gap-x-4 gap-y-1">
				<span>
					current.id{" "}
					<span className="text-foreground">"{stepper.current.id}"</span>
				</span>
				<span>
					index{" "}
					<span className="text-foreground tabular-nums">{stepper.index}</span>
				</span>
				<span>
					progress{" "}
					<span className="text-foreground tabular-nums">
						{stepper.progress.toFixed(2)}
					</span>
				</span>
				<span className="min-w-0">
					completed{" "}
					<span className="text-foreground">
						[{completed.map((c) => `"${c}"`).join(", ")}]
					</span>
				</span>
			</div>
			<div className="max-h-16 overflow-auto break-all">
				data <span className="text-foreground">{JSON.stringify(data)}</span>
			</div>
		</div>
	);
}
