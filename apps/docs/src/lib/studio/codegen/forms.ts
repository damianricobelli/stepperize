import type {
	FieldType,
	StudioConfig,
	StudioField,
	StudioStep,
	Validation,
} from "../config";
import {
	FIELD_KINDS,
	fieldSpec,
	OTP_LENGTH,
	sliderRange,
	valueType,
} from "../fields";
import {
	cls,
	indent,
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
 *
 * Controls are shadcn/ui components. A **wiring** says how a form library
 * binds each one (register, a controlled value, or a named uncontrolled
 * input), so adding a field type means one renderer, not one per library.
 */

// ─── Wiring ──────────────────────────────────────────────────────────────────

/** Components that forward to a DOM element, bound with DOM attributes. */
type DomKind = "text" | "number" | "textarea";

/** Components with their own value, bound with a value and a change callback (or a name + default). */
type ValueKind = "checked" | "multi" | "choice" | "slider" | "otp" | "date";

type Wiring = {
	/** `id` attribute value of the field's main control. */
	id: string;
	/** `id` attribute value for one option; `index` is in scope. */
	optionId: string;
	/** `aria-invalid` attribute, or "" when the library sets it itself. */
	invalid: (on: "dom" | "value") => string;
	/** Error message expression, or null without validation. */
	message: string | null;
	/** Attributes for an input or textarea, including `id` and `type`. */
	dom: (kind: DomKind, type?: string) => string;
	/** Attributes for a value component (no `id`). `option` is in scope for multi. */
	value: (kind: ValueKind) => string;
	/** Wraps value components, e.g. in React Hook Form's `<Controller>`. */
	wrap: (jsx: string) => string;
};

type FieldContext = {
	field: StudioField;
	key: string;
	/** Module-level constant holding the field's choices. */
	options: string;
	/** `XValues["key"]`, for casts at the edge of untyped events. */
	valueOf: string;
	min: number;
	/** ArkType infers template-literal types from patterns; plain strings need a cast. */
	castText: boolean;
};

const attr = (name: string, expr: string) => ` ${name}={${expr}}`;

function reactHookFormWiring(c: FieldContext, validated: boolean): Wiring {
	const { key } = c;
	const register = (options = "") =>
		`{...form.register(${str(key)}${options})}`;
	return {
		id: str(key),
		optionId: `{\`${key}-\${index}\`}`,
		invalid: () => (validated ? attr("aria-invalid", `!!errors.${key}`) : ""),
		message: validated ? `errors.${key}?.message` : null,
		dom: (kind, type) => {
			switch (kind) {
				case "number":
					return `id=${str(key)} type="number" ${register(', { setValueAs: (value) => (value === "" ? undefined : Number(value)) }')}`;
				case "textarea":
					return `id=${str(key)} ${register()}`;
				case "text":
					return `id=${str(key)} type="${type ?? "text"}" ${register()}`;
			}
		},
		value: (kind) => {
			switch (kind) {
				case "checked":
					return "checked={field.value ?? false} onCheckedChange={(checked) => field.onChange(checked)}";
				case "multi":
					return "checked={field.value?.includes(option) ?? false} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value ?? []), option] : (field.value ?? []).filter((value) => value !== option))}";
				case "choice":
					return "value={field.value ?? null} onValueChange={(value) => field.onChange(value)}";
				case "slider":
					return `value={[field.value ?? ${c.min}]} onValueChange={(value) => field.onChange(Array.isArray(value) ? value[0] : value)}`;
				case "otp":
					return 'value={field.value ?? ""} onChange={(value) => field.onChange(value)}';
				case "date":
					return 'value={field.value ?? ""} onValueChange={(value) => field.onChange(value)}';
			}
		},
		wrap: (jsx) =>
			[
				"<Controller",
				"\tcontrol={form.control}",
				`\tname=${str(key)}`,
				"\trender={({ field }) => (",
				indent(jsx, 2),
				"\t)}",
				"/>",
			].join("\n"),
	};
}

function tanstackWiring(c: FieldContext, validated: boolean): Wiring {
	const change = (expr: string) => `field.handleChange(${expr})`;
	const text = (expr: string) =>
		c.castText ? `${expr} as ${c.valueOf}` : expr;
	const required = fieldSpec(c.field).required;
	return {
		id: "{field.name}",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: generated source, not a template
		optionId: "{`${field.name}-${index}`}",
		invalid: () =>
			validated ? attr("aria-invalid", "!field.state.meta.isValid") : "",
		message: validated ? "field.state.meta.errors[0]?.message" : null,
		dom: (kind, type) => {
			const base =
				"id={field.name} name={field.name} onBlur={field.handleBlur}";
			switch (kind) {
				case "number":
					// valueAsNumber is NaN for an empty input: required fields report it, optional ones clear.
					return required
						? `${base} type="number" value={Number.isNaN(field.state.value) ? "" : (field.state.value ?? "")} onChange={(event) => ${change("event.target.valueAsNumber")}}`
						: `${base} type="number" value={field.state.value ?? ""} onChange={(event) => ${change("Number.isNaN(event.target.valueAsNumber) ? undefined : event.target.valueAsNumber")}}`;
				case "textarea":
					return `${base} value={field.state.value ?? ""} onChange={(event) => ${change("event.target.value")}}`;
				case "text":
					return `${base} type="${type ?? "text"}" value={field.state.value ?? ""} onChange={(event) => ${change(text("event.target.value"))}}`;
			}
		},
		value: (kind) => {
			switch (kind) {
				case "checked":
					return `checked={field.state.value ?? false} onCheckedChange={(checked) => ${change(`checked as ${c.valueOf}`)}}`;
				case "multi":
					return `checked={field.state.value?.includes(option) ?? false} onCheckedChange={(checked) => ${change("checked ? [...(field.state.value ?? []), option] : (field.state.value ?? []).filter((value) => value !== option)")}}`;
				case "choice":
					return `value={field.state.value ?? null} onValueChange={(value) => ${change(`value as ${c.valueOf}`)}}`;
				case "slider":
					return `value={[field.state.value ?? ${c.min}]} onValueChange={(value) => ${change("Array.isArray(value) ? value[0] : value")}}`;
				case "otp":
					return `value={field.state.value ?? ""} onChange={(value) => ${change(text("value"))}}`;
				case "date":
					return `value={field.state.value ?? ""} onValueChange={(value) => ${change("value")}}`;
			}
		},
		wrap: (jsx) => jsx,
	};
}

function conformWiring(c: FieldContext, helpers: Set<string>): Wiring {
	const meta = `fields.${c.key}`;
	return {
		id: `{${meta}.id}`,
		optionId: `{\`\${${meta}.id}-\${index}\`}`,
		// getInputProps and getTextareaProps already set aria-invalid.
		invalid: (on) =>
			on === "value" ? attr("aria-invalid", `!${meta}.valid`) : "",
		message: `${meta}.errors?.[0]`,
		dom: (kind, type) => {
			if (kind === "textarea") {
				helpers.add("getTextareaProps");
				return `{...getTextareaProps(${meta})}`;
			}
			helpers.add("getInputProps");
			return `{...getInputProps(${meta}, { type: "${kind === "number" ? "number" : (type ?? "text")}" })}`;
		},
		// Base UI controls submit through hidden inputs, so Conform reads them from FormData.
		value: (kind) => {
			const name = `name={${meta}.name}`;
			switch (kind) {
				case "checked":
					return `${name} defaultChecked={${meta}.initialValue === "on"}`;
				case "multi":
					return `${name} value={option} defaultChecked={${meta}.initialValue?.includes(option)}`;
				case "choice":
					return `${name} defaultValue={${meta}.initialValue ?? null}`;
				case "slider":
					return `${name} defaultValue={[Number(${meta}.initialValue ?? ${c.min})]}`;
				case "otp":
				case "date":
					return `${name} defaultValue={${meta}.initialValue ?? ""}`;
			}
		},
		wrap: (jsx) => jsx,
	};
}

function nativeWiring(c: FieldContext, validated: boolean): Wiring {
	const { key } = c;
	const saved = `saved?.${key}`;
	const name = `name=${str(key)}`;
	return {
		id: str(key),
		optionId: `{\`${key}-\${index}\`}`,
		invalid: () => (validated ? attr("aria-invalid", `!!issues.${key}`) : ""),
		message: validated ? `issues.${key}` : null,
		dom: (kind, type) => {
			const base = `id=${str(key)} ${name}`;
			switch (kind) {
				case "number":
					return `${base} type="number" defaultValue={${saved}}`;
				case "textarea":
					return `${base} defaultValue={${saved} ?? ""}`;
				case "text":
					return `${base} type="${type ?? "text"}" defaultValue={${saved}}`;
			}
		},
		value: (kind) => {
			switch (kind) {
				case "checked":
					return `${name} defaultChecked={${saved} === true}`;
				case "multi":
					return `${name} value={option} defaultChecked={${saved}?.includes(option)}`;
				case "choice":
					return `${name} defaultValue={${saved} ?? null}`;
				case "slider":
					return `${name} defaultValue={[${saved} ?? ${c.min}]}`;
				case "otp":
				case "date":
					return `${name} defaultValue={${saved} ?? ""}`;
			}
		},
		wrap: (jsx) => jsx,
	};
}

// ─── Controls ────────────────────────────────────────────────────────────────

/** Field types rendered by a component with its own value, not a DOM input. */
export const VALUE_CONTROLS: ReadonlySet<FieldType> = new Set([
	"date",
	"otp",
	"slider",
	"select",
	"radio",
	"checkboxes",
	"checkbox",
	"switch",
]);

/** Components a step imports from `@/components/ui`, by field type. */
const UI_IMPORTS: Record<FieldType, Record<string, string[]>> = {
	text: { input: ["Input"] },
	email: { input: ["Input"] },
	password: { input: ["Input"] },
	tel: { input: ["Input"] },
	url: { input: ["Input"] },
	number: { input: ["Input"] },
	time: { input: ["Input"] },
	textarea: { textarea: ["Textarea"] },
	otp: { "input-otp": ["InputOTP", "InputOTPGroup", "InputOTPSlot"] },
	slider: { slider: ["Slider"] },
	select: {
		select: [
			"Select",
			"SelectContent",
			"SelectItem",
			"SelectTrigger",
			"SelectValue",
		],
	},
	radio: {
		"radio-group": ["RadioGroup", "RadioGroupItem"],
		field: ["FieldLegend", "FieldSet"],
	},
	checkboxes: {
		checkbox: ["Checkbox"],
		field: ["FieldGroup", "FieldLegend", "FieldSet"],
	},
	checkbox: { checkbox: ["Checkbox"] },
	switch: { switch: ["Switch"] },
	date: {},
};

const AUTOCOMPLETE: Partial<Record<FieldType, string>> = {
	email: "email",
	tel: "tel",
	password: "new-password",
	url: "url",
};

const autocomplete = (type: FieldType) =>
	AUTOCOMPLETE[type] ? ` autoComplete="${AUTOCOMPLETE[type]}"` : "";

/** The control alone: no label, no error. */
function renderControl(c: FieldContext, w: Wiring): string {
	const { field } = c;
	const type = field.type;
	const { min, max } = sliderRange(field);
	const each = (body: string) =>
		[
			`{${c.options}.map((option${body.includes("index") ? ", index" : ""}) => (`,
			indent(body, 1),
			"))}",
		].join("\n");
	const option = (control: string) =>
		[
			'<Field key={option} orientation="horizontal">',
			`\t${control}`,
			`\t<FieldLabel htmlFor=${w.optionId} className="font-normal">`,
			"\t\t{option}",
			"\t</FieldLabel>",
			"</Field>",
		].join("\n");

	switch (type) {
		case "text":
		case "email":
		case "password":
		case "tel":
		case "url":
		case "time":
			return `<Input ${w.dom("text", FIELD_KINDS[type].input)}${autocomplete(type)}${w.invalid("dom")} />`;
		case "number":
			return `<Input ${w.dom("number")}${w.invalid("dom")} />`;
		case "textarea":
			return `<Textarea ${w.dom("textarea")}${w.invalid("dom")} />`;
		case "date":
			return w.wrap(
				`<DatePicker id=${w.id} ${w.value("date")}${w.invalid("value")} />`,
			);
		case "otp":
			return w.wrap(
				[
					`<InputOTP id=${w.id} maxLength={${OTP_LENGTH}} ${w.value("otp")}${w.invalid("value")}>`,
					"\t<InputOTPGroup>",
					`\t\t{Array.from({ length: ${OTP_LENGTH} }, (_, index) => (`,
					"\t\t\t<InputOTPSlot key={index} index={index} />",
					"\t\t))}",
					"\t</InputOTPGroup>",
					"</InputOTP>",
				].join("\n"),
			);
		case "slider":
			return w.wrap(
				`<Slider id=${w.id} min={${min}} max={${max}} ${w.value("slider")}${w.invalid("value")} />`,
			);
		case "select":
			return w.wrap(
				[
					`<Select ${w.value("choice")}>`,
					`\t<SelectTrigger id=${w.id}${w.invalid("value")} className="w-full">`,
					'\t\t<SelectValue placeholder="Select…" />',
					"\t</SelectTrigger>",
					"\t<SelectContent>",
					indent(
						each(
							"<SelectItem key={option} value={option}>\n\t{option}\n</SelectItem>",
						),
						2,
					),
					"\t</SelectContent>",
					"</Select>",
				].join("\n"),
			);
		case "radio":
			return w.wrap(
				[
					`<RadioGroup ${w.value("choice")}${w.invalid("value")}>`,
					indent(
						each(option(`<RadioGroupItem id=${w.optionId} value={option} />`)),
						1,
					),
					"</RadioGroup>",
				].join("\n"),
			);
		case "checkboxes":
			return w.wrap(
				[
					'<FieldGroup data-slot="checkbox-group" className="gap-3">',
					indent(
						each(option(`<Checkbox id=${w.optionId} ${w.value("multi")} />`)),
						1,
					),
					"</FieldGroup>",
				].join("\n"),
			);
		case "checkbox":
			return w.wrap(
				`<Checkbox id=${w.id} ${w.value("checked")}${w.invalid("value")} />`,
			);
		case "switch":
			return w.wrap(
				`<Switch id=${w.id} ${w.value("checked")}${w.invalid("value")} />`,
			);
	}
}

function labelText(field: StudioField): string {
	const spec = fieldSpec(field);
	const optional =
		!spec.required && spec.kind !== "boolean"
			? ` <span${cls("font-normal text-muted-foreground")}>(optional)</span>`
			: "";
	return `${jsxText(field.label)}${optional}`;
}

const lines = (open: string, children: (string | null)[], close: string) =>
	[
		open,
		...children
			.filter((child): child is string => child !== null)
			.map((child) => indent(child, 1)),
		close,
	].join("\n");

/** Label, control and error, laid out for the field's shape. */
function fieldBlock(c: FieldContext, w: Wiring): string {
	const { field } = c;
	const kind = FIELD_KINDS[field.type];
	const controlJsx = renderControl(c, w);
	const wide = kind.wide ? ' className="sm:col-span-2"' : "";
	const error =
		w.message === null ? null : `<FieldError>{${w.message}}</FieldError>`;

	if (kind.fieldset) {
		return lines(
			`<FieldSet${wide}>`,
			[
				`<FieldLegend variant="label">${labelText(field)}</FieldLegend>`,
				controlJsx,
				error,
			],
			"</FieldSet>",
		);
	}

	const label = `<FieldLabel htmlFor=${w.id}>${labelText(field)}</FieldLabel>`;

	if (field.type === "checkbox" || field.type === "switch") {
		return lines(
			`<Field orientation="horizontal"${wide}>`,
			error
				? [
						controlJsx,
						lines("<FieldContent>", [label, error], "</FieldContent>"),
					]
				: [controlJsx, label],
			"</Field>",
		);
	}

	const { min, max } = sliderRange(field);
	const range =
		field.type === "slider"
			? `<div className="flex justify-between text-xs text-muted-foreground">\n\t<span>${min}</span>\n\t<span>${max}</span>\n</div>`
			: null;
	return lines(`<Field${wide}>`, [label, controlJsx, range, error], "</Field>");
}

/** Imports for a step: field primitives plus each control's component. */
function uiImports(fields: StudioField[], errors: boolean): string[] {
	const byFile = new Map<string, Set<string>>([
		["button", new Set(["Button"])],
		["field", new Set(["Field", "FieldLabel"])],
	]);
	const add = (file: string, names: string[]) => {
		const set = byFile.get(file) ?? new Set<string>();
		for (const name of names) set.add(name);
		byFile.set(file, set);
	};
	for (const field of fields) {
		for (const [file, names] of Object.entries(UI_IMPORTS[field.type]))
			add(file, names);
		if (errors) add("field", ["FieldError"]);
		if (errors && (field.type === "checkbox" || field.type === "switch"))
			add("field", ["FieldContent"]);
	}
	const out = [...byFile]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([file, names]) =>
				`import { ${[...names].sort().join(", ")} } from "@/components/ui/${file}";`,
		);
	if (fields.some((f) => f.type === "date"))
		out.push('import { DatePicker } from "../date-picker";');
	return out;
}

const optionsName = (key: string) => `${key}Options`;

/** Module-level `as const` lists for fields with choices. */
function optionConstants(ctx: StepContext): string[] {
	return ctx.step.fields.flatMap((field, j) =>
		field.options
			? [
					`const ${optionsName(ctx.keys[j])} = [${field.options.map(str).join(", ")}] as const;`,
				]
			: [],
	);
}

const button = (variant: "back" | "primary", attrs: string, label: string) =>
	`<Button ${attrs}${variant === "back" ? ' variant="outline"' : ""}>${label}</Button>`;

function actions({ last, pending }: { last: boolean; pending?: string }) {
	return [
		'<div className="flex justify-between gap-2 sm:col-span-2">',
		indent(
			button(
				"back",
				'type="button" disabled={stepper.isFirst} onClick={() => stepper.prev()}',
				"Back",
			),
			1,
		),
		indent(
			button(
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
	/** `XValues` — imported from schemas or declared locally. */
	Values: string;
};

function fieldContext(ctx: StepContext, j: number): FieldContext {
	const field = ctx.step.fields[j];
	const key = ctx.keys[j];
	return {
		field,
		key,
		options: optionsName(key),
		valueOf: `${ctx.Values}[${str(key)}]`,
		min: sliderRange(field).min,
		castText:
			ctx.validation === "arktype" &&
			(field.type === "tel" || field.type === "time" || field.type === "otp"),
	};
}

function localValuesType(ctx: StepContext): string {
	return `type ${ctx.Values} = {\n${ctx.step.fields
		.map(
			(f, j) =>
				`\t${ctx.keys[j]}${fieldSpec(f).required ? "" : "?"}: ${valueType(f)};`,
		)
		.join("\n")}\n};`;
}

function valuesImport(ctx: StepContext, withSchema: boolean): string | null {
	if (ctx.validation === "none") return null;
	return withSchema
		? `import { ${schemaName(ctx.id)}, type ${ctx.Values} } from "../schemas";`
		: `import type { ${ctx.Values} } from "../schemas";`;
}

/**
 * Starting values for controlled libraries: "" for text, [] for checkbox
 * groups, the minimum for sliders. Choices and toggles start unset. Hoisted
 * to module scope and widened (`as string`), so `EMPTY as Values` is a sound
 * narrowing even when a schema infers literal or template-literal types.
 */
function emptyValues(ctx: StepContext): string | null {
	const entries = ctx.step.fields.flatMap((f, j) => {
		const spec = fieldSpec(f);
		if (spec.kind === "text") return [`\t${ctx.keys[j]}: "" as string,`];
		if (spec.kind === "multi") return [`\t${ctx.keys[j]}: [] as string[],`];
		if (f.type === "slider")
			return [`\t${ctx.keys[j]}: ${sliderRange(f).min},`];
		return [];
	});
	return entries.length
		? ["const EMPTY = {", ...entries, "};"].join("\n")
		: null;
}

const defaultValues = (ctx: StepContext, validated: boolean) =>
	`\t\tdefaultValues: ${validated ? `stepper.data.get(${str(ctx.id)})` : `(stepper.data.get(${str(ctx.id)}) as ${ctx.Values} | undefined)`} ?? (${emptyValues(ctx) ? "EMPTY" : "{}"} as ${ctx.Values}),`;

const header = (ctx: StepContext) => [
	`export function ${ctx.Component}() {`,
	`\tconst stepper = ${ctx.names.flow}.useStepperContext();`,
];

// ─── React Hook Form ─────────────────────────────────────────────────────────

function reactHookForm(ctx: StepContext): string {
	const { names, id, validation } = ctx;
	const validated = validation !== "none";
	const controller = ctx.step.fields.some((f) => VALUE_CONTROLS.has(f.type));
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return fieldBlock(c, reactHookFormWiring(c, validated));
	});
	const resolver = RHF_RESOLVERS[validation as Exclude<Validation, "none">];
	return source([
		USE_CLIENT,
		"",
		validated
			? `import { ${resolver} } from "@hookform/resolvers/${validation}";`
			: null,
		`import { ${controller ? "Controller, " : ""}useForm } from "react-hook-form";`,
		...uiImports(ctx.step.fields, validated),
		`import { ${names.flow} } from "../definition";`,
		valuesImport(ctx, true),
		"",
		validated ? null : localValuesType(ctx),
		...optionConstants(ctx),
		emptyValues(ctx),
		"",
		...header(ctx),
		// With a resolver, React Hook Form infers input and output types from it.
		`\tconst form = useForm${validated ? "" : `<${ctx.Values}>`}({`,
		validated ? `\t\tresolver: ${resolver}(${schemaName(id)}),` : null,
		defaultValues(ctx, validated),
		"\t});",
		`\tconst { ${validated ? "errors, " : ""}isSubmitting } = form.formState;`,
		"",
		"\treturn (",
		"\t\t<form",
		"\t\t\tnoValidate",
		"\t\t\tonSubmit={form.handleSubmit((data) => stepper.next({ data, complete: true }))}",
		`\t\t\tclassName="${FORM_CLASS}"`,
		"\t\t>",
		...blocks.map((b) => indent(b, 3)),
		indent(actions({ last: ctx.last, pending: "isSubmitting" }), 3),
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── TanStack Form ───────────────────────────────────────────────────────────

function tanstackForm(ctx: StepContext): string {
	const { names, id, keys, validation } = ctx;
	const validated = validation !== "none";
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return [
			`<form.Field name=${str(keys[j])}>`,
			"\t{(field) => (",
			indent(fieldBlock(c, tanstackWiring(c, validated)), 2),
			"\t)}",
			"</form.Field>",
		].join("\n");
	});
	return source([
		USE_CLIENT,
		"",
		'import { useForm } from "@tanstack/react-form";',
		...uiImports(ctx.step.fields, validated),
		`import { ${names.flow} } from "../definition";`,
		valuesImport(ctx, true),
		"",
		validated ? null : localValuesType(ctx),
		...optionConstants(ctx),
		emptyValues(ctx),
		"",
		...header(ctx),
		"\tconst form = useForm({",
		defaultValues(ctx, validated),
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
		`\t\t\tclassName="${FORM_CLASS}"`,
		"\t\t>",
		...blocks.map((b) => indent(b, 3)),
		"\t\t\t<form.Subscribe selector={(state) => state.isSubmitting}>",
		"\t\t\t\t{(isSubmitting) => (",
		indent(actions({ last: ctx.last, pending: "isSubmitting" }), 5),
		"\t\t\t\t)}",
		"\t\t\t</form.Subscribe>",
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── Conform ─────────────────────────────────────────────────────────────────

function conform(ctx: StepContext): string {
	const { names, id, validation } = ctx;
	const parser =
		validation === "valibot"
			? ["parseWithValibot", "@conform-to/valibot"]
			: ["parseWithZod", "@conform-to/zod/v4"];
	const helpers = new Set(["getFormProps", "useForm"]);
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return fieldBlock(c, conformWiring(c, helpers));
	});
	return source([
		USE_CLIENT,
		"",
		`import { ${[...helpers].sort().join(", ")} } from "@conform-to/react";`,
		`import { ${parser[0]} } from "${parser[1]}";`,
		...uiImports(ctx.step.fields, true),
		`import { ${names.flow} } from "../definition";`,
		`import { ${schemaName(id)} } from "../schemas";`,
		"",
		...optionConstants(ctx),
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
		`\t\t<form {...getFormProps(form)} noValidate${cls(FORM_CLASS)}>`,
		...blocks.map((b) => indent(b, 3)),
		indent(actions({ last: ctx.last }), 3),
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── Native form ─────────────────────────────────────────────────────────────

/** How a native form reads a field back from FormData. */
export function formDataReader(field: StudioField, key: string): string {
	const get = `formData.get(${str(key)})`;
	const spec = fieldSpec(field);
	switch (spec.kind) {
		case "boolean":
			return `formData.has(${str(key)})`;
		case "multi":
			return `formData.getAll(${str(key)}).map(String)`;
		case "number":
			// Empty is NaN for required numbers (reported) and undefined for optional ones.
			if (field.type === "slider") return `Number(${get})`;
			return spec.required
				? `Number(${get} || Number.NaN)`
				: `${get} ? Number(${get}) : undefined`;
		default:
			return `String(${get} ?? "")`;
	}
}

function nativeForm(ctx: StepContext): string {
	const { names, id, keys, validation } = ctx;
	const validated = validation !== "none";
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return fieldBlock(c, nativeWiring(c, validated));
	});
	return source([
		USE_CLIENT,
		"",
		validated
			? 'import { type FormEvent, useState } from "react";'
			: 'import type { FormEvent } from "react";',
		...uiImports(ctx.step.fields, validated),
		`import { ${names.flow} } from "../definition";`,
		valuesImport(ctx, false),
		"",
		validated ? null : localValuesType(ctx),
		...optionConstants(ctx),
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
		...ctx.step.fields.map(
			(f, j) => `\t\t\t${keys[j]}: ${formDataReader(f, keys[j])},`,
		),
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
		`\t\t<form noValidate onSubmit={handleSubmit}${cls(FORM_CLASS)}>`,
		...blocks.map((b) => indent(b, 3)),
		indent(actions({ last: ctx.last }), 3),
		"\t\t</form>",
		"\t);",
		"}",
	]);
}

// ─── Steps without fields ────────────────────────────────────────────────────

function summaryStep(ctx: StepContext): string {
	const { config, names, id } = ctx;
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
	const has = sections.length > 0;
	return source([
		USE_CLIENT,
		"",
		has ? 'import { Fragment } from "react";' : null,
		'import { Button } from "@/components/ui/button";',
		`import { ${names.flow} } from "../definition";`,
		"",
		has ? "const SUMMARY = [" : null,
		...sections,
		has ? "] as const;" : null,
		"",
		"function display(value: unknown): string {",
		'\tif (typeof value === "boolean") return value ? "Yes" : "No";',
		'\tif (Array.isArray(value)) return value.length ? value.join(", ") : "—";',
		'\treturn value === undefined || value === "" ? "—" : String(value);',
		"}",
		"",
		...header(ctx),
		`\tconst finished = stepper.isComplete(${str(id)});`,
		"",
		"\treturn (",
		'\t\t<section className="grid gap-4">',
		...(has
			? [
					"\t\t\t{SUMMARY.map((section) => {",
					"\t\t\t\tconst data = stepper.data.get(section.step) as Record<string, unknown> | undefined;",
					"\t\t\t\treturn (",
					'\t\t\t\t\t<div key={section.step} className="rounded-lg border p-4">',
					'\t\t\t\t\t\t<div className="flex items-center justify-between">',
					'\t\t\t\t\t\t\t<h3 className="text-sm font-medium">{section.title}</h3>',
					'\t\t\t\t\t\t\t<Button type="button" variant="link" size="sm" onClick={() => stepper.goTo(section.step)}>Edit</Button>',
					"\t\t\t\t\t\t</div>",
					'\t\t\t\t\t\t<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">',
					"\t\t\t\t\t\t\t{section.fields.map(([key, label]) => (",
					"\t\t\t\t\t\t\t\t<Fragment key={key}>",
					'\t\t\t\t\t\t\t\t\t<dt className="text-muted-foreground">{label}</dt>',
					"\t\t\t\t\t\t\t\t\t<dd>{display(data?.[key])}</dd>",
					"\t\t\t\t\t\t\t\t</Fragment>",
					"\t\t\t\t\t\t\t))}",
					"\t\t\t\t\t\t</dl>",
					"\t\t\t\t\t</div>",
					"\t\t\t\t);",
					"\t\t\t})}",
				]
			: []),
		"\t\t\t{finished ? (",
		'\t\t\t\t<p role="status" className="text-sm font-medium">All done. Send the data to your API here.</p>',
		"\t\t\t) : (",
		'\t\t\t\t<div className="flex justify-between gap-2">',
		indent(
			button("back", 'type="button" onClick={() => stepper.prev()}', "Back"),
			5,
		),
		indent(
			button(
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
	]);
}

function contentStep(ctx: StepContext): string {
	return source([
		USE_CLIENT,
		"",
		'import { Button } from "@/components/ui/button";',
		`import { ${ctx.names.flow} } from "../definition";`,
		"",
		...header(ctx),
		"",
		"\treturn (",
		'\t\t<section className="grid gap-4">',
		'\t\t\t<p className="text-sm text-muted-foreground">Replace this with the content of this step.</p>',
		'\t\t\t<div className="flex justify-between gap-2">',
		indent(
			button(
				"back",
				'type="button" disabled={stepper.isFirst} onClick={() => stepper.prev()}',
				"Back",
			),
			4,
		),
		indent(
			button(
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
