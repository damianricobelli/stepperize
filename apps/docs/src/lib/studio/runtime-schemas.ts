import type { StandardSchemaV1 } from "@stepperize/react";
import type { StudioField, Validation } from "./config";

/**
 * Real schemas for the live preview, built with the library the user picked.
 *
 * Each library loads only when selected (bundle-conditional), and the promise
 * is cached at module level so React's `use()` gets the same one every render.
 */

export type SchemaFactory = (
	fields: { key: string; field: StudioField }[],
) => StandardSchemaV1;

type Loader = () => Promise<SchemaFactory>;

const LOADERS: Record<Exclude<Validation, "none">, Loader> = {
	zod: async () => {
		const { z } = await import("zod");
		const one = (f: StudioField) => {
			const required = `${f.label} is required`;
			switch (f.type) {
				case "text":
				case "textarea":
					return f.required
						? z.string().trim().min(1, required)
						: z.string().optional();
				case "email":
					return f.required
						? z.email("Enter a valid email")
						: z.email("Enter a valid email").or(z.literal(""));
				case "number":
					return f.required
						? z.number({ error: required }).positive("Enter a number above 0")
						: z.number().optional();
				case "select": {
					const options = (f.options ?? []) as [string, ...string[]];
					const schema = z.enum(options, {
						error: `Choose a ${f.label.toLowerCase()}`,
					});
					return f.required ? schema : schema.or(z.literal("")).optional();
				}
				case "checkbox":
					return f.required
						? z.literal(true, { error: required })
						: z.boolean();
				case "date":
					return f.required
						? z.iso.date("Pick a date")
						: z.iso.date().or(z.literal("")).optional();
			}
		};
		return (fields) =>
			z.object(
				Object.fromEntries(fields.map(({ key, field }) => [key, one(field)])),
			);
	},
	valibot: async () => {
		const v = await import("valibot");
		const one = (f: StudioField) => {
			const required = `${f.label} is required`;
			switch (f.type) {
				case "text":
				case "textarea":
					return f.required
						? v.pipe(v.string(), v.trim(), v.nonEmpty(required))
						: v.optional(v.string());
				case "email":
					return f.required
						? v.pipe(v.string(), v.email("Enter a valid email"))
						: v.union([
								v.literal(""),
								v.pipe(v.string(), v.email("Enter a valid email")),
							]);
				case "number":
					return f.required
						? v.pipe(
								v.number(required),
								v.minValue(1, "Enter a number above 0"),
							)
						: v.optional(v.number());
				case "select":
					return f.required
						? v.picklist(f.options ?? [], `Choose a ${f.label.toLowerCase()}`)
						: v.optional(v.union([v.literal(""), v.picklist(f.options ?? [])]));
				case "checkbox":
					return f.required ? v.literal(true, required) : v.boolean();
				case "date":
					return f.required
						? v.pipe(v.string("Pick a date"), v.isoDate("Pick a date"))
						: v.optional(
								v.union([v.literal(""), v.pipe(v.string(), v.isoDate())]),
							);
			}
		};
		return (fields) =>
			v.object(
				Object.fromEntries(fields.map(({ key, field }) => [key, one(field)])),
			);
	},
	arktype: async () => {
		const { type } = await import("arktype");
		const one = (f: StudioField): string => {
			switch (f.type) {
				case "text":
				case "textarea":
					return f.required ? "string > 0" : "string";
				case "email":
					return f.required ? "string.email" : "string.email | ''";
				case "number":
					return f.required ? "number > 0" : "number";
				case "select":
					return [
						...(f.options ?? []).map((o) => `'${o.replace(/'/g, "\\'")}'`),
						...(f.required ? [] : ["''"]),
					].join(" | ");
				case "checkbox":
					return f.required ? "true" : "boolean";
				case "date":
					return f.required ? "string.date.iso" : "string.date.iso | ''";
			}
		};
		return (fields) =>
			type(
				Object.fromEntries(
					fields.map(({ key, field }) => [
						field.required ? key : `${key}?`,
						one(field),
					]),
				) as never,
			) as unknown as StandardSchemaV1;
	},
};

const cache = new Map<Validation, Promise<SchemaFactory | null>>();

export function loadSchemaFactory(
	validation: Validation,
): Promise<SchemaFactory | null> {
	let pending = cache.get(validation);
	if (!pending) {
		pending =
			validation === "none" ? Promise.resolve(null) : LOADERS[validation]();
		cache.set(validation, pending);
	}
	return pending;
}
