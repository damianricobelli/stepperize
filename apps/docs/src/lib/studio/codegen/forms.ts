import type {
	FieldType,
	StudioConfig,
	StudioField,
	StudioStep,
	UiKit,
	Validation,
} from "../config";
import {
	cls,
	emptyValue,
	INPUT_TYPES,
	indent,
	jsxAttr,
	jsxText,
	type Names,
	source,
	str,
	USE_CLIENT,
} from "./shared";
import { RHF_RESOLVERS, schemaName, valuesType } from "./validation";

/**
 * Form adapters. Every step component follows the same contract regardless of
 * the library: seed from `stepper.data.get(id)`, validate on submit, then save
 * and complete the step in one transition with `next({ data, complete: true })`.
 */

// ─── UI kit: how a control, label, error and button are spelled ──────────────

type Control = { field: StudioField; id: string; attrs: string };

const TW_INPUT =
	"h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";

function kitImports(
	ui: UiKit,
	types: Set<FieldType>,
	{ nativeCheckbox, errors }: { nativeCheckbox: boolean; errors: boolean },
): string[] {
	if (ui !== "shadcn") return [];
	const out = [
		'import { Button } from "@/components/ui/button";',
		`import { Field, ${errors ? "FieldError, " : ""}FieldLabel } from "@/components/ui/field";`,
	];
	if (types.has("checkbox") && !nativeCheckbox)
		out.push('import { Checkbox } from "@/components/ui/checkbox";');
	if (
		[...types].some(
			(t) => t === "text" || t === "email" || t === "number" || t === "date",
		)
	) {
		out.push('import { Input } from "@/components/ui/input";');
	}
	if (types.has("select")) {
		out.push(
			'import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";',
		);
	}
	if (types.has("textarea"))
		out.push('import { Textarea } from "@/components/ui/textarea";');
	return out;
}

function optionList(ui: UiKit, field: StudioField): string {
	const Option = ui === "shadcn" ? "NativeSelectOption" : "option";
	return [
		`<${Option} value="">Select…</${Option}>`,
		...(field.options ?? []).map(
			(option) =>
				`<${Option} value=${jsxAttr(option)}>${jsxText(option)}</${Option}>`,
		),
	].join("\n");
}

/** A control. `nativeCheckbox` forces `<input type="checkbox">` (Conform spreads input props). */
function control(
	ui: UiKit,
	{ field, id, attrs }: Control,
	nativeCheckbox = false,
): string {
	const type = INPUT_TYPES[field.type]
		? ` type="${INPUT_TYPES[field.type]}"`
		: "";
	if (field.type === "checkbox") {
		if (ui === "shadcn" && !nativeCheckbox)
			return `<Checkbox id=${id} ${attrs} />`;
		return `<input id=${id} type="checkbox" ${attrs}${cls(ui, "size-4 accent-primary")} />`;
	}
	if (field.type === "select") {
		const Select = ui === "shadcn" ? "NativeSelect" : "select";
		const selectClass =
			ui === "tailwind"
				? ` className="${TW_INPUT}"`
				: ui === "shadcn"
					? ' className="w-full"'
					: "";
		return [
			`<${Select} id=${id} ${attrs}${selectClass}>`,
			indent(optionList(ui, field), 1),
			`</${Select}>`,
		].join("\n");
	}
	if (field.type === "textarea") {
		const Textarea = ui === "shadcn" ? "Textarea" : "textarea";
		return `<${Textarea} id=${id} ${attrs}${ui === "tailwind" ? ` className="${TW_INPUT.replace("h-9", "min-h-20 py-2")}"` : ""} />`;
	}
	const Input = ui === "shadcn" ? "Input" : "input";
	return `<${Input} id=${id}${type} ${attrs}${ui === "tailwind" ? ` className="${TW_INPUT}"` : ""} />`;
}

/** Wraps label + control + error. `message` is an expression of `string | undefined`. */
function fieldBlock(
	ui: UiKit,
	c: Control,
	controlJsx: string,
	message: string | null,
): string {
	const checkbox = c.field.type === "checkbox";
	const label =
		ui === "shadcn"
			? `<FieldLabel htmlFor=${c.id}>${jsxText(c.field.label)}</FieldLabel>`
			: `<label htmlFor=${c.id}${cls(ui, "text-sm font-medium")}>${jsxText(c.field.label)}</label>`;
	const error =
		message === null
			? null
			: ui === "shadcn"
				? `<FieldError>{${message}}</FieldError>`
				: `{${message} ? <p role="alert"${cls(ui, "text-sm text-destructive")}>{${message}}</p> : null}`;
	const wide = checkbox || c.field.type === "textarea" ? " sm:col-span-2" : "";
	const open =
		ui === "shadcn"
			? `<Field${checkbox ? ' orientation="horizontal"' : ""}${wide ? ` className="${wide.trim()}"` : ""}>`
			: `<div${cls(ui, `${checkbox ? "flex items-center gap-2" : "grid gap-2"}${wide}`)}>`;
	const close = ui === "shadcn" ? "</Field>" : "</div>";
	const children = checkbox
		? [controlJsx, label, error]
		: [label, controlJsx, error];
	return [
		open,
		...children.filter((c): c is string => c !== null).map((c) => indent(c, 1)),
		close,
	].join("\n");
}

function button(
	ui: UiKit,
	variant: "back" | "primary",
	attrs: string,
	label: string,
): string {
	if (ui === "shadcn")
		return `<Button ${attrs}${variant === "back" ? ' variant="outline"' : ""}>${label}</Button>`;
	const classes =
		variant === "back"
			? "inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-[background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
			: "inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
	return `<button ${attrs}${cls(ui, classes)}>${label}</button>`;
}

function actions(
	ui: UiKit,
	{ last, pending }: { last: boolean; pending?: string },
): string {
	return [
		`<div${cls(ui, "flex justify-between gap-2 sm:col-span-2")}>`,
		indent(
			button(
				ui,
				"back",
				'type="button" disabled={stepper.isFirst} onClick={() => stepper.prev()}',
				"Back",
			),
			1,
		),
		indent(
			button(
				ui,
				"primary",
				`type="submit"${pending ? ` disabled={${pending}}` : ""}`,
				last ? "Finish" : "Continue",
			),
			1,
		),
		"</div>",
	].join("\n");
}

const FORM_CLASS = "grid gap-4 sm:grid-cols-2";

// ─── Shared step context ─────────────────────────────────────────────────────

type StepContext = {
	config: StudioConfig;
	names: Names;
	step: StudioStep;
	id: string;
	keys: string[];
	Component: string;
	last: boolean;
	validation: Validation;
	types: Set<FieldType>;
	/** `XValues` — imported from schemas or declared locally. */
	Values: string;
};

function localValuesType(ctx: StepContext): string {
	const tsType = (field: StudioField) =>
		field.type === "checkbox"
			? "boolean"
			: field.type === "number"
				? "number"
				: "string";
	return `type ${ctx.Values} = {\n${ctx.step.fields.map((f, j) => `\t${ctx.keys[j]}${f.required ? "" : "?"}: ${tsType(f)};`).join("\n")}\n};`;
}

function valuesImport(ctx: StepContext, withSchema: boolean): string | null {
	if (ctx.validation === "none") return null;
	return withSchema
		? `import { ${schemaName(ctx.id)}, type ${ctx.Values} } from "../schemas";`
		: `import type { ${ctx.Values} } from "../schemas";`;
}

/**
 * Empty values for text-like fields only. Selects, checkboxes and numbers start
 * unset, so `as Values` stays a sound narrowing instead of a lie about "".
 */
function emptyDefaults(ctx: StepContext): string {
	const entries = ctx.step.fields.flatMap((f, j) =>
		emptyValue(f) === '""' ? [`${ctx.keys[j]}: ""`] : [],
	);
	return entries.length ? `{ ${entries.join(", ")} }` : "{}";
}

const header = (ctx: StepContext) => [
	`export function ${ctx.Component}() {`,
	`\tconst stepper = ${ctx.names.flow}.useStepperContext();`,
];

// ─── React Hook Form ─────────────────────────────────────────────────────────

function reactHookForm(ctx: StepContext): string {
	const { config, names, id, keys, validation } = ctx;
	const ui = config.ui;
	const validated = validation !== "none";
	const controlled = ui === "shadcn" && ctx.types.has("checkbox");
	const blocks = ctx.step.fields.map((field, j) => {
		const key = keys[j];
		const c: Control = { field, id: str(key), attrs: "" };
		const invalid = validated ? ` aria-invalid={!!errors.${key}}` : "";
		let jsx: string;
		if (field.type === "checkbox" && ui === "shadcn") {
			jsx = [
				`<Controller`,
				"\tcontrol={form.control}",
				`\tname=${str(key)}`,
				"\trender={({ field }) => (",
				`\t\t<Checkbox id=${str(key)} checked={field.value} onCheckedChange={field.onChange}${invalid} />`,
				"\t)}",
				"/>",
			].join("\n");
		} else {
			const options =
				field.type === "number" ? ", { valueAsNumber: true }" : "";
			jsx = control(ui, {
				...c,
				attrs: `{...form.register(${str(key)}${options})}${invalid}`,
			});
		}
		return fieldBlock(ui, c, jsx, validated ? `errors.${key}?.message` : null);
	});
	return source([
		USE_CLIENT,
		"",
		validated
			? `import { ${RHF_RESOLVERS[validation as Exclude<Validation, "none">]} } from "@hookform/resolvers/${validation}";`
			: null,
		`import { ${controlled ? "Controller, " : ""}useForm } from "react-hook-form";`,
		...kitImports(ui, ctx.types, { nativeCheckbox: false, errors: validated }),
		`import { ${names.flow} } from "../definition";`,
		valuesImport(ctx, true),
		"",
		validated ? null : localValuesType(ctx),
		"",
		...header(ctx),
		// With a resolver, React Hook Form infers input and output types from it.
		`\tconst form = useForm${validated ? "" : `<${ctx.Values}>`}({`,
		validated
			? `\t\tresolver: ${RHF_RESOLVERS[validation as Exclude<Validation, "none">]}(${schemaName(id)}),`
			: null,
		`\t\tdefaultValues: ${validated ? `stepper.data.get(${str(id)})` : `(stepper.data.get(${str(id)}) as ${ctx.Values} | undefined)`} ?? (${emptyDefaults(ctx)} as ${ctx.Values}),`,
		"\t});",
		`\tconst { ${validated ? "errors, " : ""}isSubmitting } = form.formState;`,
		"",
		"\treturn (",
		"\t\t<form",
		"\t\t\tnoValidate",
		"\t\t\tonSubmit={form.handleSubmit((data) => stepper.next({ data, complete: true }))}",
		ui === "unstyled" ? null : `\t\t\tclassName="${FORM_CLASS}"`,
		"\t\t>",
		...blocks.map((b) => indent(b, 3)),
		indent(actions(ui, { last: ctx.last, pending: "isSubmitting" }), 3),
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── TanStack Form ───────────────────────────────────────────────────────────

function tanstackForm(ctx: StepContext): string {
	const { config, names, id, keys, validation } = ctx;
	const ui = config.ui;
	const validated = validation !== "none";
	const blocks = ctx.step.fields.map((field, j) => {
		const key = keys[j];
		const c: Control = { field, id: "{field.name}", attrs: "" };
		const base = `name={field.name} onBlur={field.handleBlur}${validated ? " aria-invalid={!field.state.meta.isValid}" : ""}`;
		let attrs: string;
		if (field.type === "checkbox") {
			attrs =
				ui === "shadcn"
					? `${base} checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)}`
					: `${base} checked={field.state.value} onChange={(event) => field.handleChange(event.target.checked)}`;
		} else {
			const value =
				field.type === "number"
					? "event.target.valueAsNumber"
					: field.type === "select"
						? `event.target.value as ${ctx.Values}[${str(key)}]`
						: "event.target.value";
			attrs = `${base} value={field.state.value ?? ""} onChange={(event) => field.handleChange(${value})}`;
		}
		const inner = fieldBlock(
			ui,
			c,
			control(ui, { ...c, attrs }),
			validated ? "field.state.meta.errors[0]?.message" : null,
		);
		return [
			`<form.Field name=${str(key)}>`,
			"\t{(field) => (",
			indent(inner, 2),
			"\t)}",
			"</form.Field>",
		].join("\n");
	});
	return source([
		USE_CLIENT,
		"",
		'import { useForm } from "@tanstack/react-form";',
		...kitImports(ui, ctx.types, { nativeCheckbox: false, errors: validated }),
		`import { ${names.flow} } from "../definition";`,
		valuesImport(ctx, true),
		"",
		validated ? null : localValuesType(ctx),
		"",
		...header(ctx),
		"\tconst form = useForm({",
		`\t\tdefaultValues: ${validated ? `stepper.data.get(${str(id)})` : `(stepper.data.get(${str(id)}) as ${ctx.Values} | undefined)`} ?? (${emptyDefaults(ctx)} as ${ctx.Values}),`,
		validated ? `\t\tvalidators: { onSubmit: ${schemaName(id)} },` : null,
		"\t\tonSubmit: ({ value }) => stepper.next({ data: value, complete: true }),",
		"\t});",
		"",
		"\treturn (",
		"\t\t<form",
		"\t\t\tnoValidate",
		"\t\t\tonSubmit={(event) => {",
		"\t\t\t\tevent.preventDefault();",
		"\t\t\t\tvoid form.handleSubmit();",
		"\t\t\t}}",
		ui === "unstyled" ? null : `\t\t\tclassName="${FORM_CLASS}"`,
		"\t\t>",
		...blocks.map((b) => indent(b, 3)),
		"\t\t\t<form.Subscribe selector={(state) => state.isSubmitting}>",
		"\t\t\t\t{(isSubmitting) => (",
		indent(actions(ui, { last: ctx.last, pending: "isSubmitting" }), 5),
		"\t\t\t\t)}",
		"\t\t\t</form.Subscribe>",
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── Conform ─────────────────────────────────────────────────────────────────

function conform(ctx: StepContext): string {
	const { config, names, id, keys, validation } = ctx;
	const ui = config.ui;
	const parser =
		validation === "valibot"
			? ["parseWithValibot", "@conform-to/valibot"]
			: ["parseWithZod", "@conform-to/zod/v4"];
	const helpers = new Set(["getFormProps", "getInputProps", "useForm"]);
	const blocks = ctx.step.fields.map((field, j) => {
		const key = keys[j];
		const c: Control = { field, id: `{fields.${key}.id}`, attrs: "" };
		let attrs: string;
		if (field.type === "select") {
			helpers.add("getSelectProps");
			attrs = `{...getSelectProps(fields.${key})}`;
		} else if (field.type === "textarea") {
			helpers.add("getTextareaProps");
			attrs = `{...getTextareaProps(fields.${key})}`;
		} else {
			const kind =
				field.type === "checkbox"
					? "checkbox"
					: (INPUT_TYPES[field.type] ?? "text");
			attrs = `{...getInputProps(fields.${key}, { type: ${str(kind)} })}`;
		}
		// getInputProps already sets id and type.
		const jsx = control(ui, { ...c, attrs }, true)
			.replace(` id={fields.${key}.id}`, "")
			.replace(/ type="[a-z]+"/, "");
		return fieldBlock(ui, c, jsx, `fields.${key}.errors?.[0]`);
	});
	return source([
		USE_CLIENT,
		"",
		`import { ${[...helpers].sort().join(", ")} } from "@conform-to/react";`,
		`import { ${parser[0]} } from "${parser[1]}";`,
		...kitImports(ui, ctx.types, { nativeCheckbox: true, errors: true }),
		`import { ${names.flow} } from "../definition";`,
		`import { ${schemaName(id)} } from "../schemas";`,
		"",
		...header(ctx),
		"\tconst [form, fields] = useForm({",
		`\t\tdefaultValue: stepper.data.get(${str(id)}),`,
		`\t\tonValidate: ({ formData }) => ${parser[0]}(formData, { schema: ${schemaName(id)} }),`,
		'\t\tshouldValidate: "onSubmit",',
		"\t\tonSubmit(event, { submission }) {",
		"\t\t\tevent.preventDefault();",
		'\t\t\tif (submission?.status === "success") {',
		"\t\t\t\tvoid stepper.next({ data: submission.value, complete: true });",
		"\t\t\t}",
		"\t\t},",
		"\t});",
		"",
		"\treturn (",
		`\t\t<form {...getFormProps(form)} noValidate${cls(ui, FORM_CLASS)}>`,
		...blocks.map((b) => indent(b, 3)),
		indent(actions(ui, { last: ctx.last }), 3),
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── Native form ─────────────────────────────────────────────────────────────

function nativeForm(ctx: StepContext): string {
	const { config, names, id, keys, validation } = ctx;
	const ui = config.ui;
	const validated = validation !== "none";
	const read = (field: StudioField, key: string) => {
		if (field.type === "checkbox") return `formData.has(${str(key)})`;
		if (field.type === "number") return `Number(formData.get(${str(key)}))`;
		return `String(formData.get(${str(key)}) ?? "")`;
	};
	const blocks = ctx.step.fields.map((field, j) => {
		const key = keys[j];
		const c: Control = { field, id: str(key), attrs: "" };
		const initial =
			field.type === "checkbox"
				? `defaultChecked={saved?.${key} === true}`
				: `defaultValue={saved?.${key} ?? undefined}`;
		const attrs = `name=${str(key)} ${initial}${validated ? ` aria-invalid={!!issues.${key}}` : ""}`;
		return fieldBlock(
			ui,
			c,
			control(ui, { ...c, attrs }),
			validated ? `issues.${key}` : null,
		);
	});
	return source([
		USE_CLIENT,
		"",
		validated
			? 'import { type FormEvent, useState } from "react";'
			: 'import type { FormEvent } from "react";',
		...kitImports(ui, ctx.types, { nativeCheckbox: false, errors: validated }),
		`import { ${names.flow} } from "../definition";`,
		valuesImport(ctx, false),
		"",
		validated ? null : localValuesType(ctx),
		"",
		...header(ctx),
		`\tconst saved = stepper.data.get(${str(id)}) as Partial<${ctx.Values}> | undefined;`,
		validated
			? `\tconst [issues, setIssues] = useState<Partial<Record<keyof ${ctx.Values}, string>>>({});`
			: null,
		"",
		"\tasync function handleSubmit(event: FormEvent<HTMLFormElement>) {",
		"\t\tevent.preventDefault();",
		"\t\tconst formData = new FormData(event.currentTarget);",
		"\t\tconst value = {",
		...ctx.step.fields.map((f, j) => `\t\t\t${keys[j]}: ${read(f, keys[j])},`),
		"\t\t};",
		...(validated
			? [
					`\t\tconst result = await ${names.flow}.validate(${str(id)}, value);`,
					"\t\tif (!result.success) {",
					"\t\t\tsetIssues(",
					"\t\t\t\tObject.fromEntries(",
					"\t\t\t\t\tresult.issues.map((issue) => {",
					"\t\t\t\t\t\tconst key = issue.path?.[0];",
					'\t\t\t\t\t\treturn [String(typeof key === "object" ? key.key : key), issue.message];',
					"\t\t\t\t\t}),",
					"\t\t\t\t),",
					"\t\t\t);",
					"\t\t\treturn;",
					"\t\t}",
					"\t\tsetIssues({});",
					"\t\tawait stepper.next({ data: result.data, complete: true });",
				]
			: ["\t\tawait stepper.next({ data: value, complete: true });"]),
		"\t}",
		"",
		"\treturn (",
		`\t\t<form noValidate onSubmit={handleSubmit}${cls(ui, FORM_CLASS)}>`,
		...blocks.map((b) => indent(b, 3)),
		indent(actions(ui, { last: ctx.last }), 3),
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── Steps without fields ────────────────────────────────────────────────────

function summaryStep(ctx: StepContext): string {
	const { config, names, id } = ctx;
	const ui = config.ui;
	const sections = config.steps
		.map((step, i) => ({ step, i }))
		.filter(
			({ step, i }) => i < config.steps.length - 1 && step.fields.length > 0,
		)
		.map(({ step, i }) => {
			const fields = step.fields
				.map((f, j) => `[${str(names.fields[i][j])}, ${str(f.label)}]`)
				.join(", ");
			return `\t{ step: ${str(names.stepIds[i])}, title: ${str(step.title)}, fields: [${fields}] },`;
		});
	return source([
		USE_CLIENT,
		"",
		ui === "shadcn" ? 'import { Button } from "@/components/ui/button";' : null,
		`import { ${names.flow} } from "../definition";`,
		"",
		sections.length ? "const SUMMARY = [" : null,
		...sections,
		sections.length ? "] as const;" : null,
		"",
		"function display(value: unknown): string {",
		'\tif (typeof value === "boolean") return value ? "Yes" : "No";',
		'\treturn value === undefined || value === "" ? "—" : String(value);',
		"}",
		"",
		...header(ctx),
		`\tconst finished = stepper.isComplete(${str(id)});`,
		"",
		"\treturn (",
		`\t\t<section${cls(ui, "grid gap-4")}>`,
		sections.length ? "\t\t\t{SUMMARY.map((section) => {" : null,
		sections.length
			? "\t\t\t\tconst data = stepper.data.get(section.step) as Record<string, unknown> | undefined;"
			: null,
		sections.length ? "\t\t\t\treturn (" : null,
		sections.length
			? `\t\t\t\t\t<div key={section.step}${cls(ui, "rounded-lg border p-4")}>`
			: null,
		sections.length
			? `\t\t\t\t\t\t<div${cls(ui, "flex items-center justify-between")}>`
			: null,
		sections.length
			? `\t\t\t\t\t\t\t<h3${cls(ui, "text-sm font-medium")}>{section.title}</h3>`
			: null,
		sections.length
			? `\t\t\t\t\t\t\t<button type="button" onClick={() => stepper.goTo(section.step)}${cls(ui, "text-sm font-medium text-primary")}>Edit</button>`
			: null,
		sections.length ? "\t\t\t\t\t\t</div>" : null,
		sections.length
			? `\t\t\t\t\t\t<dl${cls(ui, "mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm")}>`
			: null,
		sections.length
			? "\t\t\t\t\t\t\t{section.fields.map(([key, label]) => ("
			: null,
		sections.length ? "\t\t\t\t\t\t\t\t<Fragment key={key}>" : null,
		sections.length
			? `\t\t\t\t\t\t\t\t\t<dt${cls(ui, "text-muted-foreground")}>{label}</dt>`
			: null,
		sections.length
			? "\t\t\t\t\t\t\t\t\t<dd>{display(data?.[key])}</dd>"
			: null,
		sections.length ? "\t\t\t\t\t\t\t\t</Fragment>" : null,
		sections.length ? "\t\t\t\t\t\t\t))}" : null,
		sections.length ? "\t\t\t\t\t\t</dl>" : null,
		sections.length ? "\t\t\t\t\t</div>" : null,
		sections.length ? "\t\t\t\t);" : null,
		sections.length ? "\t\t\t})}" : null,
		"\t\t\t{finished ? (",
		`\t\t\t\t<p role="status"${cls(ui, "text-sm font-medium")}>All done. Send the data to your API here.</p>`,
		"\t\t\t) : (",
		`\t\t\t\t<div${cls(ui, "flex justify-between gap-2")}>`,
		indent(
			button(
				ui,
				"back",
				'type="button" onClick={() => stepper.prev()}',
				"Back",
			),
			5,
		),
		indent(
			button(
				ui,
				"primary",
				`type="button" onClick={() => stepper.setComplete(${str(id)})}`,
				"Finish",
			),
			5,
		),
		"\t\t\t\t</div>",
		"\t\t\t)}",
		"\t\t</section>",
		"\t);",
		"}",
	]).replace(`import { ${names.flow} } from "../definition";`, (line) =>
		sections.length ? `import { Fragment } from "react";\n${line}` : line,
	);
}

function contentStep(ctx: StepContext): string {
	const ui = ctx.config.ui;
	return source([
		USE_CLIENT,
		"",
		ui === "shadcn" ? 'import { Button } from "@/components/ui/button";' : null,
		`import { ${ctx.names.flow} } from "../definition";`,
		"",
		...header(ctx),
		"",
		"\treturn (",
		`\t\t<section${cls(ui, "grid gap-4")}>`,
		`\t\t\t<p${cls(ui, "text-sm text-muted-foreground")}>Replace this with the content of this step.</p>`,
		`\t\t\t<div${cls(ui, "flex justify-between gap-2")}>`,
		indent(
			button(
				ui,
				"back",
				'type="button" disabled={stepper.isFirst} onClick={() => stepper.prev()}',
				"Back",
			),
			4,
		),
		indent(
			button(
				ui,
				"primary",
				'type="button" onClick={() => stepper.next({ complete: true })}',
				"Continue",
			),
			4,
		),
		"\t\t\t</div>",
		"\t\t</section>",
		"\t);",
		"}",
	]);
}

// ─── Entry ───────────────────────────────────────────────────────────────────

export const stepComponent = (stepId: string) =>
	`${stepId[0].toUpperCase()}${stepId.slice(1)}Step`;

export function generateStep(
	config: StudioConfig,
	names: Names,
	index: number,
): string {
	const step = config.steps[index];
	const id = names.stepIds[index];
	const ctx: StepContext = {
		config,
		names,
		step,
		id,
		keys: names.fields[index],
		Component: stepComponent(id),
		last: index === config.steps.length - 1,
		validation: config.validation,
		types: new Set(step.fields.map((f) => f.type)),
		Values: valuesType(id),
	};
	if (!step.fields.length)
		return ctx.last ? summaryStep(ctx) : contentStep(ctx);
	switch (config.form) {
		case "react-hook-form":
			return reactHookForm(ctx);
		case "tanstack-form":
			return tanstackForm(ctx);
		case "conform":
			return conform(ctx);
		case "native":
			return nativeForm(ctx);
	}
}
