import type { StudioConfig } from "../config";
import { cls, indent, type Names, source, USE_CLIENT } from "./shared";

/**
 * Layout adapters. Each one emits `<Flow>Nav`, the only component that knows
 * how progress is drawn. The flow composes it next to the step content, so
 * swapping layouts never touches forms or routing.
 */

const INDICATOR =
	"grid size-8 shrink-0 place-items-center rounded-full border bg-background text-sm font-medium text-muted-foreground transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary/40 data-[status=previous]:bg-primary/10 data-[status=previous]:text-primary";

function indicatorBody(config: StudioConfig): string {
	const { ui, indicator } = config;
	if (indicator === "dot")
		return `<span${cls(ui, "size-2 rounded-full bg-current")} />`;
	if (indicator === "check") {
		return [
			`<span${cls(ui, "group-data-[status=previous]/indicator:hidden")}>{index + 1}</span>`,
			`<Check aria-hidden${cls(ui, "hidden size-4 group-data-[status=previous]/indicator:block")} />`,
		].join("\n");
	}
	return "{index + 1}";
}

const indicatorClass = (config: StudioConfig) =>
	config.indicator === "check" ? `group/indicator ${INDICATOR}` : INDICATOR;

function stepList(config: StudioConfig, vertical: boolean): string {
	const { ui } = config;
	const item = vertical
		? "group/item relative pb-6 pl-11 last:pb-0"
		: "group/item flex flex-1 items-center gap-3 last:flex-none";
	const connector = vertical
		? `<span aria-hidden${cls(ui, "absolute top-9 bottom-1 left-4 w-px bg-border group-last/item:hidden group-data-[status=previous]/item:bg-primary")} />`
		: `<span aria-hidden${cls(ui, "h-px min-w-6 flex-1 bg-border group-last/item:hidden group-data-[status=previous]/item:bg-primary")} />`;
	const trigger = vertical
		? "flex items-start gap-3 text-left"
		: "flex items-center gap-2 rounded-md text-left";
	const indicator = vertical
		? `absolute left-0 ${indicatorClass(config)}`
		: indicatorClass(config);
	const title = vertical
		? "block text-sm font-medium"
		: "text-sm font-medium max-sm:not-group-data-[status=active]/item:hidden";
	return source([
		`<Stepper.List${vertical ? ' orientation="vertical"' : ""}${cls(ui, vertical ? "flex flex-col sm:w-52" : "flex items-center gap-3")}>`,
		"\t<Stepper.Items>",
		config.indicator === "dot" ? "\t\t{(step) => (" : "\t\t{(step, index) => (",
		`\t\t\t<Stepper.Item key={step.id}${cls(ui, item)}>`,
		`\t\t\t\t<Stepper.Trigger${cls(ui, trigger)}>`,
		`\t\t\t\t\t<Stepper.Indicator${cls(ui, indicator)}>`,
		indent(indicatorBody(config), 6),
		"\t\t\t\t\t</Stepper.Indicator>",
		vertical
			? [
					`\t\t\t\t\t<span${cls(ui, "pt-1.5")}>`,
					`\t\t\t\t\t\t<Stepper.Title${cls(ui, title)} />`,
					`\t\t\t\t\t\t<Stepper.Description${cls(ui, "mt-0.5 block text-xs text-muted-foreground")} />`,
					"\t\t\t\t\t</span>",
				].join("\n")
			: `\t\t\t\t\t<Stepper.Title${cls(ui, title)} />`,
		"\t\t\t\t</Stepper.Trigger>",
		indent(connector, 4),
		"\t\t\t</Stepper.Item>",
		"\t\t)}",
		"\t</Stepper.Items>",
		"</Stepper.List>",
	]).trimEnd();
}

function segmented(config: StudioConfig): string {
	const { ui } = config;
	return [
		`<Stepper.List${cls(ui, "flex gap-1 overflow-x-auto rounded-xl bg-muted p-1")}>`,
		"\t<Stepper.Items>",
		"\t\t{(step) => (",
		`\t\t\t<Stepper.Item key={step.id}${cls(ui, "flex-1")}>`,
		`\t\t\t\t<Stepper.Trigger${cls(ui, "h-9 w-full rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm data-[status=previous]:text-primary")}>`,
		"\t\t\t\t\t<Stepper.Title />",
		"\t\t\t\t</Stepper.Trigger>",
		"\t\t\t</Stepper.Item>",
		"\t\t)}",
		"\t</Stepper.Items>",
		"</Stepper.List>",
	].join("\n");
}

function breadcrumb(config: StudioConfig): string {
	const { ui } = config;
	return [
		`<Stepper.List${cls(ui, "flex flex-wrap items-center gap-1 text-sm")}>`,
		"\t<Stepper.Items>",
		"\t\t{(step, index) => (",
		`\t\t\t<Stepper.Item key={step.id}${cls(ui, "flex items-center gap-1")}>`,
		`\t\t\t\t{index > 0 ? <ChevronRight aria-hidden${cls(ui, "size-4 text-muted-foreground/60")} /> : null}`,
		`\t\t\t\t<Stepper.Trigger${cls(ui, "rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors data-[status=active]:bg-muted data-[status=active]:text-foreground data-[status=previous]:text-primary")}>`,
		"\t\t\t\t\t<Stepper.Title />",
		"\t\t\t\t</Stepper.Trigger>",
		"\t\t\t</Stepper.Item>",
		"\t\t)}",
		"\t</Stepper.Items>",
		"</Stepper.List>",
	].join("\n");
}

function progress(config: StudioConfig, names: Names): string {
	const { ui } = config;
	const bar =
		ui === "shadcn"
			? `<Progress value={progress * 100} aria-label="Progress" />`
			: [
					`<div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}${cls(ui, "h-2 overflow-hidden rounded-full bg-muted")}>`,
					`\t<div${cls(ui, "h-full origin-left bg-primary transition-transform duration-300 ease-out")} style={{ transform: \`scaleX(\${progress})\` }} />`,
					"</div>",
				].join("\n");
	return [
		`<div${cls(ui, "grid gap-2")}>`,
		`\t<div${cls(ui, "flex items-baseline justify-between gap-4 text-sm")}>`,
		`\t\t<span${cls(ui, "font-medium tabular-nums")}>Step {index + 1} of {${names.flow}.steps.length}</span>`,
		`\t\t<span${cls(ui, "text-muted-foreground")}>{${names.flow}.at(index)?.title}</span>`,
		"\t</div>",
		indent(bar, 1),
		"</div>",
	].join("\n");
}

function circular(config: StudioConfig, names: Names): string {
	const { ui } = config;
	return [
		`<div${cls(ui, "flex items-center gap-4")}>`,
		`\t<ProgressRing value={(index + 1) / ${names.flow}.steps.length} label={\`\${index + 1}/\${${names.flow}.steps.length}\`} />`,
		"\t<div>",
		`\t\t<p${cls(ui, "font-semibold")}>{${names.flow}.at(index)?.title}</p>`,
		`\t\t<p${cls(ui, "text-sm text-muted-foreground")}>`,
		`\t\t\t{next ? \`Next: \${next.title}\` : "Last step"}`,
		"\t\t</p>",
		"\t</div>",
		"</div>",
	].join("\n");
}

export function generateNav(config: StudioConfig, names: Names): string {
	const { layout } = config;
	const imports: string[] = [];
	if (
		config.indicator === "check" &&
		(layout === "horizontal" || layout === "vertical")
	) {
		imports.push('import { Check } from "lucide-react";');
	}
	if (layout === "breadcrumb")
		imports.push('import { ChevronRight } from "lucide-react";');
	if (layout === "progress" && config.ui === "shadcn")
		imports.push('import { Progress } from "@/components/ui/progress";');
	imports.push(`import { ${names.flow} } from "./definition";`);
	if (layout === "circular")
		imports.push('import { ProgressRing } from "./progress-ring";');

	// Progress-style layouts subscribe to primitives only, so typing in a field
	// never re-renders the nav.
	const selectsIndex = layout === "progress" || layout === "circular";
	const body: string[] = [];
	if (selectsIndex)
		body.push(
			`\tconst index = ${names.flow}.useStepperContext((stepper) => stepper.index);`,
		);
	if (layout === "progress")
		body.push(
			`\tconst progress = ${names.flow}.useStepperContext((stepper) => stepper.progress);`,
		);
	if (layout === "circular")
		body.push(`\tconst next = ${names.flow}.at(index + 1);`);
	if (body.length) body.push("");

	const markup =
		layout === "horizontal" || layout === "vertical"
			? stepList(config, layout === "vertical")
			: layout === "segmented"
				? segmented(config)
				: layout === "breadcrumb"
					? breadcrumb(config)
					: layout === "progress"
						? progress(config, names)
						: circular(config, names);

	return source([
		USE_CLIENT,
		"",
		...imports,
		"",
		selectsIndex ? null : `const { Stepper } = ${names.flow};`,
		selectsIndex ? null : "",
		`export function ${names.Flow}Nav() {`,
		...body,
		"\treturn (",
		indent(markup, 2),
		"\t);",
		"}",
	]);
}

export const PROGRESS_RING = source([
	"type ProgressRingProps = { value: number; label: string };",
	"",
	"const CIRCUMFERENCE = 2 * Math.PI * 26;",
	"",
	"export function ProgressRing({ value, label }: ProgressRingProps) {",
	"\treturn (",
	'\t\t<div className="relative grid size-16 shrink-0 place-items-center">',
	'\t\t\t<svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>',
	'\t\t\t\t<circle cx="32" cy="32" r="26" className="fill-none stroke-muted" strokeWidth={6} />',
	"\t\t\t\t<circle",
	'\t\t\t\t\tcx="32"',
	'\t\t\t\t\tcy="32"',
	'\t\t\t\t\tr="26"',
	'\t\t\t\t\tclassName="fill-none stroke-primary transition-[stroke-dashoffset] duration-300 ease-out"',
	"\t\t\t\t\tstrokeWidth={6}",
	'\t\t\t\t\tstrokeLinecap="round"',
	"\t\t\t\t\tstrokeDasharray={CIRCUMFERENCE}",
	"\t\t\t\t\tstrokeDashoffset={CIRCUMFERENCE * (1 - value)}",
	"\t\t\t\t/>",
	"\t\t\t</svg>",
	'\t\t\t<span className="text-sm font-semibold tabular-nums">{label}</span>',
	"\t\t</div>",
	"\t);",
	"}",
]);
