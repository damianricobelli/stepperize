import type { StudioConfig, StudioField, Validation } from "../config";
import { fieldSpec, PATTERNS } from "../fields";
import { hasFields, type Names, source, str } from "./shared";

/**
 * Validation adapters. Each one turns a Studio field into a Standard Schema
 * expression for its library; Stepperize reads the `~standard` interface, so
 * the rest of the generated code does not care which one was picked.
 */

const list = (options: string[]) => options.map(str).join(", ");
const regex = (format: keyof typeof PATTERNS) => `/${PATTERNS[format]}/`;

function zod(field: StudioField): string {
	const spec = fieldSpec(field);
	const m = str(spec.message);
	switch (spec.kind) {
		case "text": {
			if (!spec.format)
				return spec.required
					? `z.string().min(1, ${m})`
					: "z.string().optional()";
			const expr =
				spec.format === "email"
					? `z.email(${m})`
					: spec.format === "url"
						? `z.url(${m})`
						: spec.format === "date"
							? `z.iso.date(${m})`
							: `z.string().regex(${regex(spec.format)}, ${m})`;
			// Optional text-like controls submit "", so "" passes as well as undefined.
			return spec.required ? expr : `${expr}.or(z.literal("")).optional()`;
		}
		case "number":
			// Forms hand over numbers (setValueAs, Number(), Conform coercion), so no z.coerce:
			// it would widen the input type to unknown and leak into form defaults.
			if (spec.range)
				return `z.number({ error: ${m} }).min(${spec.range.min}, ${m}).max(${spec.range.max}, ${m})`;
			return spec.required
				? `z.number({ error: ${m} }).positive(${m})`
				: "z.number().optional()";
		case "choice": {
			const expr = `z.enum([${list(spec.options)}], { error: ${m} })`;
			return spec.required ? expr : `${expr}.or(z.literal("")).optional()`;
		}
		case "multi": {
			const expr = `z.array(z.enum([${list(spec.options)}]), { error: ${m} })`;
			return spec.required ? `${expr}.min(1, ${m})` : `${expr}.optional()`;
		}
		case "boolean":
			return spec.required
				? `z.literal(true, { error: ${m} })`
				: "z.boolean().optional()";
	}
}

function valibot(field: StudioField): string {
	const spec = fieldSpec(field);
	const m = str(spec.message);
	switch (spec.kind) {
		case "text": {
			if (!spec.format)
				return spec.required
					? `v.pipe(v.string(${m}), v.nonEmpty(${m}))`
					: "v.optional(v.string())";
			const check =
				spec.format === "email"
					? `v.email(${m})`
					: spec.format === "url"
						? `v.url(${m})`
						: spec.format === "date"
							? `v.isoDate(${m})`
							: `v.regex(${regex(spec.format)}, ${m})`;
			const expr = `v.pipe(v.string(${m}), ${check})`;
			return spec.required
				? expr
				: `v.optional(v.union([v.literal(""), ${expr}]))`;
		}
		case "number":
			if (spec.range)
				return `v.pipe(v.number(${m}), v.minValue(${spec.range.min}, ${m}), v.maxValue(${spec.range.max}, ${m}))`;
			return spec.required
				? `v.pipe(v.number(${m}), v.gtValue(0, ${m}))`
				: "v.optional(v.number())";
		case "choice": {
			const expr = `v.picklist([${list(spec.options)}], ${m})`;
			return spec.required
				? expr
				: `v.optional(v.union([v.literal(""), ${expr}]))`;
		}
		case "multi": {
			const expr = `v.array(v.picklist([${list(spec.options)}]), ${m})`;
			return spec.required
				? `v.pipe(${expr}, v.minLength(1, ${m}))`
				: `v.optional(${expr})`;
		}
		case "boolean":
			return spec.required
				? `v.literal(true, ${m})`
				: "v.optional(v.boolean())";
	}
}

/**
 * ArkType string definitions. They are plain data, so the preview builds its
 * runtime schemas from these exact strings.
 */
export function arktypeDefinition(field: StudioField): string {
	const spec = fieldSpec(field);
	// ArkType's optional keys are exact: form libraries send `undefined` for
	// untouched optional fields, so it has to be spelled out.
	const definition = arktypeBase(field);
	return spec.required ? definition : `${definition} | undefined`;
}

function arktypeBase(field: StudioField): string {
	const spec = fieldSpec(field);
	const quote = (option: string) =>
		`'${option.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
	switch (spec.kind) {
		case "text": {
			if (!spec.format) return spec.required ? "string > 0" : "string";
			const expr =
				spec.format === "email"
					? "string.email"
					: spec.format === "url"
						? "string.url"
						: spec.format === "date"
							? "string.date.iso"
							: `/${PATTERNS[spec.format]}/`;
			return spec.required ? expr : `${expr} | ''`;
		}
		case "number":
			if (spec.range) return `${spec.range.min} <= number <= ${spec.range.max}`;
			return spec.required ? "number > 0" : "number";
		case "choice":
			return [
				...spec.options.map(quote),
				...(spec.required ? [] : ["''"]),
			].join(" | ");
		case "multi": {
			const item = `(${spec.options.map(quote).join(" | ")})[]`;
			return spec.required ? `${item} >= 1` : item;
		}
		case "boolean":
			return spec.required ? "true" : "boolean";
	}
}

const arktype = (field: StudioField) => str(arktypeDefinition(field));

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
				config.validation === "arktype" && !fieldSpec(field).required
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
