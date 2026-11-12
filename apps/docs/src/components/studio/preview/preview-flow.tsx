"use client";

import {
	defineStepper,
	type Step,
	type StepperDefinition,
} from "@stepperize/react";
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
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Names } from "@/lib/studio/codegen/shared";
import type { Framework, StudioConfig, UiKit } from "@/lib/studio/config";
import { loadSchemaFactory } from "@/lib/studio/runtime-schemas";
import { cn } from "@/lib/utils";
import { PreviewField, readField } from "./preview-field";

/**
 * The live preview runs the real `@stepperize/react` with a real schema from
 * the selected library. Only the form library differs: the preview uses a
 * native form, the generated code uses the one you picked. Everything else —
 * navigation policy, guards, URL ownership, completion — is the real thing.
 */

type AnyDefinition = StepperDefinition<readonly Step[]>;

type PreviewContextValue = {
	config: StudioConfig;
	names: Names;
	definition: AnyDefinition;
	issues: Record<string, Record<string, string>>;
	setIssues: (stepId: string, issues: Record<string, string>) => void;
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
							step: current,
							onStepChange: (next: string) => {
								setBlocked(null);
								setHistory((h) => ({
									entries: [...h.entries.slice(0, h.index + 1), next],
									index: h.index + 1,
								}));
							},
						}
					: { onStepChange: () => setBlocked(null) })}
				{...(defaultData ? { defaultData } : {})}
				{...(config.behavior.persist
					? { onDataChange: (data: unknown) => writeDraft(draftKey, data) }
					: {})}
				{...(guard
					? {
							beforeStepChange: async ({
								fromIndex,
								toIndex,
								from,
								validate,
							}) => {
								if (toIndex < fromIndex) return true;
								const result = await validate();
								if (!result.success)
									setBlocked(config.steps[fromIndex]?.title ?? from.id);
								return result.success;
							},
						}
					: {})}
				orientation={config.layout === "vertical" ? "vertical" : "horizontal"}
			>
				<div className="@container p-5 sm:p-7">
					<div
						className={cn(
							config.ui !== "unstyled" &&
								(config.layout === "vertical"
									? "flex flex-col gap-8 @lg:flex-row"
									: "grid gap-7"),
						)}
					>
						<PreviewNav mobile={mobile} />
						<div
							className={cn(
								"grid min-w-0 flex-1 content-start gap-5",
								config.ui === "unstyled" && "mt-4 block",
							)}
						>
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
	"grid size-8 shrink-0 place-items-center rounded-full border bg-background text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow] duration-200 ease-out data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=active]:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_16%,transparent)] data-[status=previous]:border-primary/40 data-[status=previous]:bg-primary/10 data-[status=previous]:text-primary";

function IndicatorBody({ index }: { index: number }) {
	const { config } = usePreview();
	if (config.indicator === "dot")
		return (
			<span
				className={cn(
					config.ui !== "unstyled" && "size-2 rounded-full bg-current",
				)}
			/>
		);
	if (config.indicator === "check" && config.ui !== "unstyled") {
		return (
			<>
				<span className="group-data-[status=previous]/indicator:hidden">
					{index + 1}
				</span>
				<Check
					aria-hidden
					className="hidden size-4 group-data-[status=previous]/indicator:block"
				/>
			</>
		);
	}
	return <>{index + 1}</>;
}

function PreviewNav({ mobile }: { mobile: boolean }) {
	const { config, definition } = usePreview();
	const { Stepper } = definition;
	const raw = config.ui === "unstyled";
	const c = (classes: string) => (raw ? undefined : classes);

	switch (config.layout) {
		case "horizontal":
		case "vertical": {
			// Same markup as the generated nav: the vertical rail stacks above the content on narrow screens.
			const vertical = config.layout === "vertical";
			return (
				<Stepper.List
					orientation={vertical ? "vertical" : "horizontal"}
					className={c(
						vertical
							? "flex shrink-0 flex-col @lg:w-52"
							: "flex items-center gap-3",
					)}
				>
					<Stepper.Items>
						{(step, index) => (
							<Stepper.Item
								key={step.id}
								className={c(
									vertical
										? "group/item relative pb-6 pl-11 last:pb-0"
										: "group/item flex flex-1 items-center gap-3 last:flex-none",
								)}
							>
								<Stepper.Trigger
									className={c(
										cn(
											"flex rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
											vertical ? "items-start gap-3" : "items-center gap-2",
										),
									)}
								>
									<Stepper.Indicator
										className={c(
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
										<span className={c("pt-1.5")}>
											<Stepper.Title
												className={c("block text-sm font-medium")}
											/>
											<Stepper.Description
												className={c(
													"mt-0.5 block text-xs text-muted-foreground",
												)}
											/>
										</span>
									) : (
										<Stepper.Title
											className={c(
												cn(
													"text-sm font-medium whitespace-nowrap",
													mobile &&
														"not-group-data-[status=active]/item:hidden",
												),
											)}
										/>
									)}
								</Stepper.Trigger>
								<span
									aria-hidden
									className={c(
										vertical
											? "absolute top-9 bottom-1 left-4 w-px bg-border group-last/item:hidden group-data-[status=previous]/item:bg-primary"
											: "h-px min-w-6 flex-1 bg-border transition-colors duration-200 group-last/item:hidden group-data-[status=previous]/item:bg-primary",
									)}
								/>
							</Stepper.Item>
						)}
					</Stepper.Items>
				</Stepper.List>
			);
		}
		case "segmented":
			return (
				<Stepper.List
					className={c("flex gap-1 overflow-x-auto rounded-xl bg-muted p-1")}
				>
					<Stepper.Items>
						{(step) => (
							<Stepper.Item key={step.id} className={c("flex-1")}>
								<Stepper.Trigger
									className={c(
										"h-9 w-full rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm data-[status=previous]:text-primary",
									)}
								>
									<Stepper.Title />
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</Stepper.Items>
				</Stepper.List>
			);
		case "breadcrumb":
			return (
				<Stepper.List
					className={c("flex flex-wrap items-center gap-1 text-sm")}
				>
					<Stepper.Items>
						{(step, index) => (
							<Stepper.Item
								key={step.id}
								className={c("flex items-center gap-1")}
							>
								{index > 0 && !raw ? (
									<ChevronRight
										aria-hidden
										className="size-4 text-muted-foreground/60"
									/>
								) : null}
								<Stepper.Trigger
									className={c(
										"rounded-md px-2 py-1 font-medium text-muted-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed data-[status=active]:bg-muted data-[status=active]:text-foreground data-[status=previous]:text-primary",
									)}
								>
									<Stepper.Title />
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</Stepper.Items>
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
	const raw = config.ui === "unstyled";
	return (
		<div className={cn(!raw && "grid gap-2")}>
			<div
				className={cn(
					!raw && "flex items-baseline justify-between gap-4 text-sm",
				)}
			>
				<span className={cn(!raw && "font-medium tabular-nums")}>
					Step {index + 1} of {definition.steps.length}
				</span>
				<span className={cn(!raw && "text-muted-foreground")}>
					{config.steps[index]?.title}
				</span>
			</div>
			{config.ui === "shadcn" ? (
				<Progress value={progress * 100} aria-label="Progress" />
			) : raw ? (
				<progress value={progress} />
			) : (
				<div className="h-2 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full origin-left bg-primary transition-transform duration-300 ease-out-strong"
						style={{ transform: `scaleX(${progress})` }}
					/>
				</div>
			)}
		</div>
	);
}

const CIRCUMFERENCE = 2 * Math.PI * 26;

function CircularNav() {
	const { config, definition } = usePreview();
	const index = definition.useStepperContext((s) => s.index);
	const count = definition.steps.length;
	const next = config.steps[index + 1];
	const raw = config.ui === "unstyled";
	return (
		<div className={cn(!raw && "flex items-center gap-4")}>
			{raw ? null : (
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
			)}
			<div>
				<p className={cn(!raw && "font-semibold")}>
					{config.steps[index]?.title}
				</p>
				<p className={cn(!raw && "text-sm text-muted-foreground")}>
					{next ? `Next: ${next.title}` : "Last step"}
				</p>
			</div>
		</div>
	);
}

// ─── Step content ────────────────────────────────────────────────────────────

function PreviewContent() {
	const { config, names, definition } = usePreview();
	const id = definition.useStepperContext((s) => s.id);
	const lastId = names.stepIds[names.stepIds.length - 1];
	const finished = definition.useStepperContext((s) => s.isComplete(lastId));
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
	const { config, definition } = usePreview();
	const step = definition.useStepperContext((s) => s.current) as Step & {
		title?: string;
		description?: string;
	};
	const raw = config.ui === "unstyled";
	return (
		<header className={cn(!raw && "grid gap-1")}>
			<h2
				className={cn(
					!raw && "text-lg font-semibold tracking-tight text-balance",
				)}
			>
				{step.title}
			</h2>
			{step.description ? (
				<p className={cn(!raw && "text-sm text-muted-foreground")}>
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
	const saved = stepper.data.get(id) as Record<string, unknown> | undefined;
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
			const result = await definition.validate(id, value);
			if (!result.success) {
				setIssues(
					id,
					Object.fromEntries(
						result.issues.map((issue) => {
							const key = issue.path?.[0];
							return [
								String(typeof key === "object" ? key.key : key),
								issue.message,
							];
						}),
					),
				);
				// Focus the first invalid control so keyboard users land on the problem.
				const first = form.querySelector<HTMLElement>(
					`[name="${String(result.issues[0]?.path?.[0] ?? "")}"]`,
				);
				first?.focus();
				return;
			}
			setIssues(id, {});
			if (last) {
				stepper.data.set(id, result.data as never);
				stepper.setComplete(id);
			} else {
				await stepper.next({ data: result.data, complete: true });
			}
		} finally {
			setPending(false);
		}
	}

	const ui = config.ui;
	return (
		<form
			noValidate
			onSubmit={handleSubmit}
			className={cn(ui !== "unstyled" && "grid gap-4 @md:grid-cols-2")}
		>
			{step.fields.map((field, j) => (
				<PreviewField
					key={keys[j]}
					field={field}
					name={keys[j]}
					defaultValue={saved?.[keys[j]]}
					error={stepIssues[keys[j]]}
					ui={ui}
				/>
			))}
			<Actions ui={ui}>
				<KitButton
					ui={ui}
					variant="back"
					disabled={stepper.isFirst}
					onClick={() => stepper.prev()}
				>
					Back
				</KitButton>
				<KitButton ui={ui} variant="primary" type="submit" disabled={pending}>
					{last ? "Finish" : "Continue"}
				</KitButton>
			</Actions>
		</form>
	);
}

function Actions({ ui, children }: { ui: UiKit; children: ReactNode }) {
	return (
		<div
			className={cn(
				ui === "unstyled"
					? "mt-3 flex gap-2"
					: "flex justify-between gap-2 @md:col-span-2",
			)}
		>
			{children}
		</div>
	);
}

const TW_BUTTON = {
	back: "pressable inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
	primary:
		"pressable inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
};

function KitButton({
	ui,
	variant,
	type = "button",
	disabled,
	onClick,
	children,
}: {
	ui: UiKit;
	variant: "back" | "primary";
	type?: "button" | "submit";
	disabled?: boolean;
	onClick?: () => void;
	children: ReactNode;
}) {
	if (ui === "shadcn") {
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
	return (
		<button
			type={type}
			disabled={disabled}
			onClick={onClick}
			className={cn(ui === "tailwind" && TW_BUTTON[variant])}
		>
			{children}
		</button>
	);
}

function ContentStep() {
	const { config, definition } = usePreview();
	const stepper = definition.useStepperContext();
	return (
		<section className={cn(config.ui !== "unstyled" && "grid gap-4")}>
			<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				No fields here. The generated step renders a placeholder for your own
				content.
			</p>
			<Actions ui={config.ui}>
				<KitButton
					ui={config.ui}
					variant="back"
					disabled={stepper.isFirst}
					onClick={() => stepper.prev()}
				>
					Back
				</KitButton>
				<KitButton
					ui={config.ui}
					variant="primary"
					onClick={() => stepper.next({ complete: true })}
				>
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
	const raw = config.ui === "unstyled";
	const lastId = names.stepIds[names.stepIds.length - 1];
	return (
		<section className={cn(!raw && "grid gap-3")}>
			{config.steps.slice(0, -1).map((step, i) => {
				if (!step.fields.length) return null;
				const id = names.stepIds[i];
				const data = stepper.data.get(id) as
					| Record<string, unknown>
					| undefined;
				return (
					<div key={id} className={cn(!raw && "rounded-lg border p-4")}>
						<div className={cn(!raw && "flex items-center justify-between")}>
							<h3 className={cn(!raw && "text-sm font-medium")}>
								{step.title}
							</h3>
							{config.ui === "shadcn" ? (
								<Button
									type="button"
									variant="link"
									size="sm"
									onClick={() => stepper.goTo(id)}
								>
									Edit
								</Button>
							) : (
								<button
									type="button"
									onClick={() => stepper.goTo(id)}
									className={cn(
										!raw &&
											"pressable rounded px-1 text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring",
									)}
								>
									Edit
								</button>
							)}
						</div>
						<dl
							className={cn(
								!raw &&
									"mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm",
							)}
						>
							{step.fields.map((field, j) => (
								<Fragment key={names.fields[i][j]}>
									<dt className={cn(!raw && "text-muted-foreground")}>
										{field.label}
									</dt>
									<dd className="min-w-0 break-words">
										{display(data?.[names.fields[i][j]])}
									</dd>
								</Fragment>
							))}
						</dl>
					</div>
				);
			})}
			<Actions ui={config.ui}>
				<KitButton ui={config.ui} variant="back" onClick={() => stepper.prev()}>
					Back
				</KitButton>
				<KitButton
					ui={config.ui}
					variant="primary"
					onClick={() => stepper.setComplete(lastId)}
				>
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
	const completed = definition.steps
		.filter((s) => stepper.isComplete(s.id))
		.map((s) => s.id);
	const data = Object.fromEntries(
		definition.steps.flatMap((s) => {
			const value = stepper.data.get(s.id);
			return value === undefined ? [] : [[s.id, value]];
		}),
	);
	return (
		<div className="grid gap-1 border-t bg-muted/30 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
			<div className="flex flex-wrap gap-x-4 gap-y-1">
				<span>
					id <span className="text-foreground">"{stepper.id}"</span>
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
