import type {
	FieldType,
	StudioConfig,
	StudioField,
	StudioStep,
	UiKit,
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
 * Two independent axes meet here:
 * - a **wiring** says how a form library binds a control (register, a
 *   controlled value, or a named uncontrolled input), and
 * - a **kit** says how the control looks (shadcn/ui, Tailwind, unstyled).
 * Field renderers ask the wiring for attributes, so adding a field type means
 * one renderer, not one per library.
 */

// ─── Wiring ──────────────────────────────────────────────────────────────────

/** Native elements bound with DOM attributes. */
type DomKind =
	| "text"
	| "number"
	| "range"
	| "checkbox"
	| "radio"
	| "multi"
	| "select"
	| "textarea";

/** Components bound with a value and a change callback (or a name + default). */
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
	/** Attributes for a native element, including `id` and `type`. `option` is in scope for radio/multi. */
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
	const optionId = `{\`${key}-\${index}\`}`;
	const register = (options = "") =>
		`{...form.register(${str(key)}${options})}`;
	return {
		id: str(key),
		optionId,
		invalid: () => (validated ? attr("aria-invalid", `!!errors.${key}`) : ""),
		message: validated ? `errors.${key}?.message` : null,
		dom: (kind, type) => {
			switch (kind) {
				case "number":
					return `id=${str(key)} type="number" ${register(', { setValueAs: (value) => (value === "" ? undefined : Number(value)) }')}`;
				case "range":
					return `id=${str(key)} type="range" ${register(", { valueAsNumber: true }")}`;
				case "checkbox":
					return `id=${str(key)} type="checkbox" ${register()}`;
				case "radio":
				case "multi":
					return `id=${optionId} type="${kind === "radio" ? "radio" : "checkbox"}" value={option} ${register()}`;
				case "select":
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
	const blur = "onBlur={field.handleBlur}";
	const required = fieldSpec(c.field).required;
	// biome-ignore lint/suspicious/noTemplateCurlyInString: generated source, not a template
	const optionId = "{`${field.name}-${index}`}";
	const text = (expr: string) =>
		c.castText ? `${expr} as ${c.valueOf}` : expr;
	return {
		id: "{field.name}",
		optionId,
		invalid: () =>
			validated ? attr("aria-invalid", "!field.state.meta.isValid") : "",
		message: validated ? "field.state.meta.errors[0]?.message" : null,
		dom: (kind, type) => {
			const base = `id={field.name} name={field.name} ${blur}`;
			switch (kind) {
				case "number":
					// valueAsNumber is NaN for an empty input: required fields report it, optional ones clear.
					return required
						? `${base} type="number" value={Number.isNaN(field.state.value) ? "" : (field.state.value ?? "")} onChange={(event) => ${change("event.target.valueAsNumber")}}`
						: `${base} type="number" value={field.state.value ?? ""} onChange={(event) => ${change("Number.isNaN(event.target.valueAsNumber) ? undefined : event.target.valueAsNumber")}}`;
				case "range":
					return `${base} type="range" value={field.state.value ?? ${c.min}} onChange={(event) => ${change("event.target.valueAsNumber")}}`;
				case "checkbox":
					return `${base} type="checkbox" checked={field.state.value ?? false} onChange={(event) => ${change(`event.target.checked as ${c.valueOf}`)}}`;
				case "radio":
					return `id=${optionId} name={field.name} ${blur} type="radio" value={option} checked={field.state.value === option} onChange={() => ${change("option")}}`;
				case "multi":
					return `id=${optionId} name={field.name} ${blur} type="checkbox" value={option} checked={field.state.value?.includes(option) ?? false} onChange={(event) => ${change("event.target.checked ? [...(field.state.value ?? []), option] : (field.state.value ?? []).filter((value) => value !== option)")}}`;
				case "select":
					return `${base} value={field.state.value ?? ""} onChange={(event) => ${change(`event.target.value as ${c.valueOf}`)}}`;
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
	const optionId = `{\`\${${meta}.id}-\${index}\`}`;
	const input = (options: string) => {
		helpers.add("getInputProps");
		return `{...getInputProps(${meta}, ${options})}`;
	};
	return {
		id: `{${meta}.id}`,
		optionId,
		// getInputProps and friends already set aria-invalid on native elements.
		invalid: (on) =>
			on === "value" ? attr("aria-invalid", `!${meta}.valid`) : "",
		message: `${meta}.errors?.[0]`,
		dom: (kind, type) => {
			switch (kind) {
				case "number":
					return input('{ type: "number" }');
				case "range":
					return input('{ type: "range" }');
				case "checkbox":
					return input('{ type: "checkbox" }');
				case "radio":
					return `${input('{ type: "radio", value: option }')} id=${optionId}`;
				case "multi":
					return `${input('{ type: "checkbox", value: option }')} id=${optionId}`;
				case "select":
					helpers.add("getSelectProps");
					return `{...getSelectProps(${meta})}`;
				case "textarea":
					helpers.add("getTextareaProps");
					return `{...getTextareaProps(${meta})}`;
				case "text":
					return input(`{ type: "${type ?? "text"}" }`);
			}
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
	const optionId = `{\`${key}-\${index}\`}`;
	return {
		id: str(key),
		optionId,
		invalid: () => (validated ? attr("aria-invalid", `!!issues.${key}`) : ""),
		message: validated ? `issues.${key}` : null,
		dom: (kind, type) => {
			const base = `id=${str(key)} ${name}`;
			switch (kind) {
				case "number":
					return `${base} type="number" defaultValue={${saved}}`;
				case "range":
					return `${base} type="range" defaultValue={${saved} ?? ${c.min}}`;
				case "checkbox":
					return `${base} type="checkbox" defaultChecked={${saved} === true}`;
				case "radio":
					return `id=${optionId} ${name} type="radio" value={option} defaultChecked={${saved} === option}`;
				case "multi":
					return `id=${optionId} ${name} type="checkbox" value={option} defaultChecked={${saved}?.includes(option)}`;
				case "select":
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

// ─── Kits: what each field looks like ────────────────────────────────────────

const TW_INPUT =
	"h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";
const TW_SWITCH =
	"relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-200 before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-background before:shadow-sm before:transition-transform before:duration-200 checked:bg-primary checked:before:translate-x-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** shadcn/ui types rendered by a component with its own value, not a DOM input. */
export const SHADCN_VALUE_CONTROLS: ReadonlySet<FieldType> = new Set([
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
const SHADCN_IMPORTS: Record<FieldType, Record<string, string[]>> = {
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
function renderControl(ui: UiKit, c: FieldContext, w: Wiring): string {
	const { field } = c;
	const type = field.type;
	const kind = FIELD_KINDS[type];
	const { min, max } = sliderRange(field);
	const shadcn = ui === "shadcn";
	const each = (body: string) =>
		[
			`{${c.options}.map((option${body.includes("index") ? ", index" : ""}) => (`,
			indent(body, 1),
			"))}",
		].join("\n");
	const optionLabel = (control: string) =>
		[
			`<label key={option}${cls(ui, "flex items-center gap-2 text-sm")}>`,
			`\t${control}`,
			"\t{option}",
			"</label>",
		].join("\n");
	const shadcnOption = (control: string) =>
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
			return shadcn
				? `<Input ${w.dom("text", kind.input)}${autocomplete(type)}${w.invalid("dom")} />`
				: `<input ${w.dom("text", kind.input)}${autocomplete(type)}${w.invalid("dom")}${cls(ui, TW_INPUT)} />`;
		case "number":
			return shadcn
				? `<Input ${w.dom("number")}${w.invalid("dom")} />`
				: `<input ${w.dom("number")}${w.invalid("dom")}${cls(ui, TW_INPUT)} />`;
		case "textarea":
			return shadcn
				? `<Textarea ${w.dom("textarea")}${w.invalid("dom")} />`
				: `<textarea ${w.dom("textarea")}${w.invalid("dom")}${cls(ui, TW_INPUT.replace("h-9", "min-h-20 py-2"))} />`;
		case "date":
			return shadcn
				? w.wrap(
						`<DatePicker id=${w.id} ${w.value("date")}${w.invalid("value")} />`,
					)
				: `<input ${w.dom("text", "date")}${w.invalid("dom")}${cls(ui, TW_INPUT)} />`;
		case "otp":
			return shadcn
				? w.wrap(
						[
							`<InputOTP id=${w.id} maxLength={${OTP_LENGTH}} ${w.value("otp")}${w.invalid("value")}>`,
							"\t<InputOTPGroup>",
							`\t\t{Array.from({ length: ${OTP_LENGTH} }, (_, index) => (`,
							"\t\t\t<InputOTPSlot key={index} index={index} />",
							"\t\t))}",
							"\t</InputOTPGroup>",
							"</InputOTP>",
						].join("\n"),
					)
				: `<input ${w.dom("text", "text")} inputMode="numeric" autoComplete="one-time-code" maxLength={${OTP_LENGTH}}${w.invalid("dom")}${cls(ui, `${TW_INPUT} font-mono tracking-[0.4em]`)} />`;
		case "slider":
			return shadcn
				? w.wrap(
						`<Slider id=${w.id} min={${min}} max={${max}} ${w.value("slider")}${w.invalid("value")} />`,
					)
				: `<input ${w.dom("range")} min={${min}} max={${max}}${cls(ui, "w-full accent-primary")} />`;
		case "select":
			return shadcn
				? w.wrap(
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
					)
				: [
						`<select ${w.dom("select")}${w.invalid("dom")}${cls(ui, TW_INPUT)}>`,
						'\t<option value="">Select…</option>',
						indent(
							each(
								"<option key={option} value={option}>\n\t{option}\n</option>",
							),
							1,
						),
						"</select>",
					].join("\n");
		case "radio":
			return shadcn
				? w.wrap(
						[
							`<RadioGroup ${w.value("choice")}${w.invalid("value")}>`,
							indent(
								each(
									shadcnOption(
										`<RadioGroupItem id=${w.optionId} value={option} />`,
									),
								),
								1,
							),
							"</RadioGroup>",
						].join("\n"),
					)
				: [
						`<div${cls(ui, "grid gap-2")}>`,
						indent(
							each(
								optionLabel(
									`<input ${w.dom("radio")}${cls(ui, "size-4 accent-primary")} />`,
								),
							),
							1,
						),
						"</div>",
					].join("\n");
		case "checkboxes":
			return shadcn
				? w.wrap(
						[
							'<FieldGroup data-slot="checkbox-group" className="gap-3">',
							indent(
								each(
									shadcnOption(
										`<Checkbox id=${w.optionId} ${w.value("multi")} />`,
									),
								),
								1,
							),
							"</FieldGroup>",
						].join("\n"),
					)
				: [
						`<div${cls(ui, "grid gap-2")}>`,
						indent(
							each(
								optionLabel(
									`<input ${w.dom("multi")}${cls(ui, "size-4 accent-primary")} />`,
								),
							),
							1,
						),
						"</div>",
					].join("\n");
		case "checkbox":
			return shadcn
				? w.wrap(
						`<Checkbox id=${w.id} ${w.value("checked")}${w.invalid("value")} />`,
					)
				: `<input ${w.dom("checkbox")}${w.invalid("dom")}${cls(ui, "size-4 accent-primary")} />`;
		case "switch":
			return shadcn
				? w.wrap(
						`<Switch id=${w.id} ${w.value("checked")}${w.invalid("value")} />`,
					)
				: `<input ${w.dom("checkbox")} role="switch"${w.invalid("dom")}${cls(ui, TW_SWITCH)} />`;
	}
}

function labelText(ui: UiKit, field: StudioField): string {
	const spec = fieldSpec(field);
	const optional =
		!spec.required && spec.kind !== "boolean"
			? ` <span${cls(ui, "font-normal text-muted-foreground")}>(optional)</span>`
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
function fieldBlock(ui: UiKit, c: FieldContext, w: Wiring): string {
	const { field } = c;
	const kind = FIELD_KINDS[field.type];
	const shadcn = ui === "shadcn";
	const controlJsx = renderControl(ui, c, w);
	const wide = kind.wide ? "sm:col-span-2" : "";
	const errorClass =
		field.type === "checkbox" || field.type === "switch"
			? "basis-full text-sm text-destructive"
			: "text-sm text-destructive";
	const error =
		w.message === null
			? null
			: shadcn
				? `<FieldError>{${w.message}}</FieldError>`
				: `{${w.message} ? <p role="alert"${cls(ui, errorClass)}>{${w.message}}</p> : null}`;

	if (kind.fieldset) {
		return shadcn
			? lines(
					`<FieldSet${wide ? ` className="${wide}"` : ""}>`,
					[
						`<FieldLegend variant="label">${labelText(ui, field)}</FieldLegend>`,
						controlJsx,
						error,
					],
					"</FieldSet>",
				)
			: lines(
					`<fieldset${cls(ui, `grid gap-2 ${wide}`.trim())}>`,
					[
						`<legend${cls(ui, "mb-1 text-sm font-medium")}>${labelText(ui, field)}</legend>`,
						controlJsx,
						error,
					],
					"</fieldset>",
				);
	}

	const label = shadcn
		? `<FieldLabel htmlFor=${w.id}>${labelText(ui, field)}</FieldLabel>`
		: `<label htmlFor=${w.id}${cls(ui, "text-sm font-medium")}>${labelText(ui, field)}</label>`;

	if (field.type === "checkbox" || field.type === "switch") {
		if (shadcn) {
			return lines(
				`<Field orientation="horizontal" className="${wide}">`,
				error
					? [
							controlJsx,
							lines("<FieldContent>", [label, error], "</FieldContent>"),
						]
					: [controlJsx, label],
				"</Field>",
			);
		}
		return lines(
			`<div${cls(ui, `flex flex-wrap items-center gap-2 ${wide}`)}>`,
			[controlJsx, label, error],
			"</div>",
		);
	}

	const { min, max } = sliderRange(field);
	const range =
		field.type === "slider" && ui !== "unstyled"
			? `<div className="flex justify-between text-xs text-muted-foreground">\n\t<span>${min}</span>\n\t<span>${max}</span>\n</div>`
			: null;
	return shadcn
		? lines(
				`<Field${wide ? ` className="${wide}"` : ""}>`,
				[label, controlJsx, range, error],
				"</Field>",
			)
		: lines(
				`<div${cls(ui, `grid gap-2 ${wide}`.trim())}>`,
				[label, controlJsx, range, error],
				"</div>",
			);
}

/** Imports for a shadcn step: field primitives plus each control's component. */
function kitImports(
	ui: UiKit,
	fields: StudioField[],
	errors: boolean,
): string[] {
	if (ui !== "shadcn") return [];
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
		for (const [file, names] of Object.entries(SHADCN_IMPORTS[field.type]))
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
	const { config, names, id, validation } = ctx;
	const ui = config.ui;
	const validated = validation !== "none";
	const controller =
		ui === "shadcn" &&
		ctx.step.fields.some((f) => SHADCN_VALUE_CONTROLS.has(f.type));
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return fieldBlock(ui, c, reactHookFormWiring(c, validated));
	});
	const resolver = RHF_RESOLVERS[validation as Exclude<Validation, "none">];
	return source([
		USE_CLIENT,
		"",
		validated
			? `import { ${resolver} } from "@hookform/resolvers/${validation}";`
			: null,
		`import { ${controller ? "Controller, " : ""}useForm } from "react-hook-form";`,
		...kitImports(ui, ctx.step.fields, validated),
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
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return [
			`<form.Field name=${str(keys[j])}>`,
			"\t{(field) => (",
			indent(fieldBlock(ui, c, tanstackWiring(c, validated)), 2),
			"\t)}",
			"</form.Field>",
		].join("\n");
	});
	return source([
		USE_CLIENT,
		"",
		'import { useForm } from "@tanstack/react-form";',
		...kitImports(ui, ctx.step.fields, validated),
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
	const { config, names, id, validation } = ctx;
	const ui = config.ui;
	const parser =
		validation === "valibot"
			? ["parseWithValibot", "@conform-to/valibot"]
			: ["parseWithZod", "@conform-to/zod/v4"];
	const helpers = new Set(["getFormProps", "useForm"]);
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return fieldBlock(ui, c, conformWiring(c, helpers));
	});
	return source([
		USE_CLIENT,
		"",
		`import { ${[...helpers].sort().join(", ")} } from "@conform-to/react";`,
		`import { ${parser[0]} } from "${parser[1]}";`,
		...kitImports(ui, ctx.step.fields, true),
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
		`\t\t<form {...getFormProps(form)} noValidate${cls(ui, FORM_CLASS)}>`,
		...blocks.map((b) => indent(b, 3)),
		indent(actions(ui, { last: ctx.last }), 3),
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
	const { config, names, id, keys, validation } = ctx;
	const ui = config.ui;
	const validated = validation !== "none";
	const blocks = ctx.step.fields.map((_, j) => {
		const c = fieldContext(ctx, j);
		return fieldBlock(ui, c, nativeWiring(c, validated));
	});
	return source([
		USE_CLIENT,
		"",
		validated
			? 'import { type FormEvent, useState } from "react";'
			: 'import type { FormEvent } from "react";',
		...kitImports(ui, ctx.step.fields, validated),
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
	const has = sections.length > 0;
	return source([
		USE_CLIENT,
		"",
		has ? 'import { Fragment } from "react";' : null,
		ui === "shadcn" ? 'import { Button } from "@/components/ui/button";' : null,
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
		`\t\t<section${cls(ui, "grid gap-4")}>`,
		...(has
			? [
					"\t\t\t{SUMMARY.map((section) => {",
					"\t\t\t\tconst data = stepper.data.get(section.step) as Record<string, unknown> | undefined;",
					"\t\t\t\treturn (",
					`\t\t\t\t\t<div key={section.step}${cls(ui, "rounded-lg border p-4")}>`,
					`\t\t\t\t\t\t<div${cls(ui, "flex items-center justify-between")}>`,
					`\t\t\t\t\t\t\t<h3${cls(ui, "text-sm font-medium")}>{section.title}</h3>`,
					ui === "shadcn"
						? '\t\t\t\t\t\t\t<Button type="button" variant="link" size="sm" onClick={() => stepper.goTo(section.step)}>Edit</Button>'
						: `\t\t\t\t\t\t\t<button type="button" onClick={() => stepper.goTo(section.step)}${cls(ui, "text-sm font-medium text-primary")}>Edit</button>`,
					"\t\t\t\t\t\t</div>",
					`\t\t\t\t\t\t<dl${cls(ui, "mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm")}>`,
					"\t\t\t\t\t\t\t{section.fields.map(([key, label]) => (",
					"\t\t\t\t\t\t\t\t<Fragment key={key}>",
					`\t\t\t\t\t\t\t\t\t<dt${cls(ui, "text-muted-foreground")}>{label}</dt>`,
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
	]);
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
