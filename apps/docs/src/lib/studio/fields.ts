import {
	DEFAULT_RANGE,
	FIELD_TYPES,
	type FieldType,
	type StudioField,
} from "./config";

/**
 * What each field type is, independent of any library.
 *
 * The panel reads the catalog to group types; the generator and the preview
 * read `fieldSpec` to build the same validation rules for Zod, Valibot and
 * ArkType, so the code you install and the preview you click never disagree.
 */

export type FieldGroup =
	| "Text"
	| "Number"
	| "Choice"
	| "Toggle"
	| "Date & time";

type FieldKind = {
	label: string;
	group: FieldGroup;
	/** Native `<input type>` for text-like controls. */
	input?:
		| "text"
		| "email"
		| "password"
		| "tel"
		| "url"
		| "number"
		| "date"
		| "time";
	/** Takes both form columns. */
	wide?: true;
	/** A group of controls (radios, checkboxes) labelled by a legend. */
	fieldset?: true;
};

export const FIELD_KINDS: Record<FieldType, FieldKind> = {
	text: { label: "Text", group: "Text", input: "text" },
	email: { label: "Email", group: "Text", input: "email" },
	password: { label: "Password", group: "Text", input: "password" },
	tel: { label: "Phone", group: "Text", input: "tel" },
	url: { label: "URL", group: "Text", input: "url" },
	textarea: { label: "Long text", group: "Text", wide: true },
	otp: { label: "One-time code", group: "Text" },
	number: { label: "Number", group: "Number", input: "number" },
	slider: { label: "Slider", group: "Number" },
	select: { label: "Select", group: "Choice" },
	radio: { label: "Radio group", group: "Choice", wide: true, fieldset: true },
	checkboxes: {
		label: "Checkboxes",
		group: "Choice",
		wide: true,
		fieldset: true,
	},
	checkbox: { label: "Checkbox", group: "Toggle", wide: true },
	switch: { label: "Switch", group: "Toggle", wide: true },
	date: { label: "Date", group: "Date & time", input: "date" },
	time: { label: "Time", group: "Date & time", input: "time" },
};

export const FIELD_GROUPS: { group: FieldGroup; types: FieldType[] }[] = (
	["Text", "Number", "Choice", "Toggle", "Date & time"] as const
).map((group) => ({
	group,
	types: FIELD_TYPES.filter((type) => FIELD_KINDS[type].group === group),
}));

/** Digits in a one-time code. */
export const OTP_LENGTH = 6;

/** Regex sources shared by generated code and runtime schemas. */
export const PATTERNS = {
	tel: String.raw`^\+?[\d\s().-]{7,20}$`,
	time: String.raw`^([01]\d|2[0-3]):[0-5]\d$`,
	otp: String.raw`^\d{${OTP_LENGTH}}$`,
} as const;

export type TextFormat = "email" | "url" | "date" | keyof typeof PATTERNS;

/** A field's validation rule, before it is spelled in a particular library. */
export type FieldSpec =
	| { kind: "text"; required: boolean; format?: TextFormat; message: string }
	| {
			kind: "number";
			required: boolean;
			range?: { min: number; max: number };
			message: string;
	  }
	| { kind: "choice"; required: boolean; options: string[]; message: string }
	| { kind: "boolean"; required: boolean; message: string }
	| { kind: "multi"; required: boolean; options: string[]; message: string };

const FORMAT_MESSAGES: Record<TextFormat, string> = {
	email: "Enter a valid email",
	url: "Enter a valid URL",
	date: "Pick a date",
	tel: "Enter a valid phone number",
	time: "Pick a time",
	otp: `Enter the ${OTP_LENGTH}-digit code`,
};

export function sliderRange(field: StudioField): { min: number; max: number } {
	return {
		min: field.min ?? DEFAULT_RANGE.min,
		max: field.max ?? DEFAULT_RANGE.max,
	};
}

export function fieldSpec(field: StudioField): FieldSpec {
	const { required, label } = field;
	const options = field.options ?? [];
	switch (field.type) {
		case "text":
		case "password":
		case "textarea":
			return { kind: "text", required, message: `${label} is required` };
		case "email":
		case "url":
		case "date":
		case "tel":
		case "time":
		case "otp":
			return {
				kind: "text",
				required,
				format: field.type,
				message: FORMAT_MESSAGES[field.type],
			};
		case "number":
			return { kind: "number", required, message: "Enter a number above 0" };
		case "slider": {
			const range = sliderRange(field);
			// A slider always holds a value, so it is required by construction.
			return {
				kind: "number",
				required: true,
				range,
				message: `Pick a value from ${range.min} to ${range.max}`,
			};
		}
		case "select":
		case "radio":
			return {
				kind: "choice",
				required,
				options,
				message: `Choose ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label.toLowerCase()}`,
			};
		case "checkboxes":
			return {
				kind: "multi",
				required,
				options,
				message: "Choose at least one",
			};
		case "checkbox":
		case "switch":
			return { kind: "boolean", required, message: "This is required" };
	}
}

/** The TypeScript type of a field's value when no validation library infers it. */
export function valueType(field: StudioField): string {
	const spec = fieldSpec(field);
	switch (spec.kind) {
		case "text":
			return "string";
		case "number":
			return "number";
		case "boolean":
			return "boolean";
		case "choice":
			return "string";
		case "multi":
			return "string[]";
	}
}
