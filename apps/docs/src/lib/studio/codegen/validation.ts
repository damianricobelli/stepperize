import type { StudioConfig, StudioField, Validation } from "../config";
import { hasFields, type Names, source, str } from "./shared";

/**
 * Validation adapters. Each one turns a Studio field into a Standard Schema
 * expression for its library; Stepperize reads the `~standard` interface, so
 * the rest of the generated code does not care which one was picked.
 */

const required = (field: StudioField) => `${field.label} is required`;
const choose = (field: StudioField) => `Choose a ${field.label.toLowerCase()}`;
const options = (field: StudioField) =>
	(field.options ?? []).map(str).join(", ");

function zod(field: StudioField): string {
	const r = field.required;
	switch (field.type) {
		case "text":
		case "textarea":
			return r
				? `z.string().min(1, ${str(required(field))})`
				: "z.string().optional()";
		case "email":
			return r
				? 'z.email("Enter a valid email")'
				: 'z.email("Enter a valid email").or(z.literal(""))';
		case "number":
			// Forms hand over numbers (valueAsNumber, Number(), Conform coercion), so no z.coerce:
			// it would widen the input type to unknown and leak into form defaults.
			return r
				? `z.number({ error: ${str(required(field))} }).positive("Enter a number above 0")`
				: "z.number().optional()";
		case "select":
			// Optional selects submit "" for the placeholder option.
			return `z.enum([${options(field)}], { error: ${str(choose(field))} })${r ? "" : '.or(z.literal("")).optional()'}`;
		case "checkbox":
			return r
				? `z.literal(true, { error: ${str(required(field))} })`
				: "z.boolean()";
		case "date":
			return r
				? 'z.iso.date("Pick a date")'
				: 'z.iso.date().or(z.literal("")).optional()';
	}
}

function valibot(field: StudioField): string {
	const r = field.required;
	// Optional text-like controls submit "", so "" must pass as well as undefined.
	const optional = (expr: string) =>
		r ? expr : `v.optional(v.union([v.literal(""), ${expr}]))`;
	switch (field.type) {
		case "text":
		case "textarea":
			return r
				? `v.pipe(v.string(), v.nonEmpty(${str(required(field))}))`
				: "v.optional(v.string())";
		case "email":
			return optional('v.pipe(v.string(), v.email("Enter a valid email"))');
		case "number":
			return r
				? 'v.pipe(v.number(), v.minValue(1, "Enter a number above 0"))'
				: "v.optional(v.number())";
		case "select":
			return optional(`v.picklist([${options(field)}], ${str(choose(field))})`);
		case "checkbox":
			return r ? `v.literal(true, ${str(required(field))})` : "v.boolean()";
		case "date":
			return optional('v.pipe(v.string(), v.isoDate("Pick a date"))');
	}
}

function arktype(field: StudioField): string {
	switch (field.type) {
		case "text":
		case "textarea":
			return field.required ? '"string > 0"' : '"string"';
		case "email":
			return field.required ? '"string.email"' : "\"string.email | ''\"";
		case "number":
			return field.required ? '"number > 0"' : '"number"';
		case "select":
			return str(
				[
					...(field.options ?? []).map(
						(option) => `'${option.replace(/'/g, "\\'")}'`,
					),
					...(field.required ? [] : ["''"]),
				].join(" | "),
			);
		case "checkbox":
			return field.required ? '"true"' : '"boolean"';
		case "date":
			return field.required ? '"string.date.iso"' : "\"string.date.iso | ''\"";
	}
}

const ADAPTERS: Record<
	Exclude<Validation, "none">,
	{ import: string; open: string; field: typeof zod }
> = {
	zod: { import: 'import { z } from "zod";', open: "z.object({", field: zod },
	valibot: {
		import: 'import * as v from "valibot";',
		open: "v.object({",
		field: valibot,
	},
	arktype: {
		import: 'import { type } from "arktype";',
		open: "type({",
		field: arktype,
	},
};

function inferType(
	validation: Exclude<Validation, "none">,
	schema: string,
): string {
	if (validation === "zod") return `z.infer<typeof ${schema}>`;
	if (validation === "valibot") return `v.InferOutput<typeof ${schema}>`;
	return `typeof ${schema}.infer`;
}

export const schemaName = (stepId: string) => `${stepId}Schema`;
export const valuesType = (stepId: string) =>
	`${stepId[0].toUpperCase()}${stepId.slice(1)}Values`;

export function generateSchemas(config: StudioConfig, names: Names): string {
	if (config.validation === "none") return "";
	const adapter = ADAPTERS[config.validation];
	const blocks = config.steps.flatMap((step, index) => {
		if (!hasFields(step)) return [];
		const id = names.stepIds[index];
		const keys = names.fields[index];
		const entries = step.fields.map((field, j) => {
			const key =
				config.validation === "arktype" && !field.required
					? str(`${keys[j]}?`)
					: keys[j];
			return `\t${key}: ${adapter.field(field)},`;
		});
		return [
			"",
			`export const ${schemaName(id)} = ${adapter.open}`,
			...entries,
			"});",
			`export type ${valuesType(id)} = ${inferType(config.validation as Exclude<Validation, "none">, schemaName(id))};`,
		];
	});
	return source([adapter.import, ...blocks]);
}

/** Import line for `@hookform/resolvers` / Conform, per validation library. */
export const RHF_RESOLVERS: Record<Exclude<Validation, "none">, string> = {
	zod: "zodResolver",
	valibot: "valibotResolver",
	arktype: "arktypeResolver",
};
