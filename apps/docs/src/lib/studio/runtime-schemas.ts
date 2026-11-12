import type { StandardSchemaV1 } from "@stepperize/react";
import { arktypeDefinition } from "./codegen/validation";
import type { StudioField, Validation } from "./config";
import { fieldSpec, PATTERNS } from "./fields";

/**
 * Real schemas for the live preview, built with the library the user picked.
 *
 * They follow the same `fieldSpec` as the generated `schemas.ts` (ArkType even
 * reuses the generated definitions verbatim). Each library loads only when
 * selected, and the promise is cached so React's `use()` sees the same one.
 */

export type SchemaFactory = (
	fields: { key: string; field: StudioField }[],
) => StandardSchemaV1;

type Loader = () => Promise<SchemaFactory>;

const pattern = (format: keyof typeof PATTERNS) => new RegExp(PATTERNS[format]);

const LOADERS: Record<Exclude<Validation, "none">, Loader> = {
	zod: async () => {
		const { z } = await import("zod");
		const one = (field: StudioField) => {
			const spec = fieldSpec(field);
			const m = spec.message;
			switch (spec.kind) {
				case "text": {
					if (!spec.format)
						return spec.required ? z.string().min(1, m) : z.string().optional();
					const expr =
						spec.format === "email"
							? z.email(m)
							: spec.format === "url"
								? z.url(m)
								: spec.format === "date"
									? z.iso.date(m)
									: z.string().regex(pattern(spec.format), m);
					return spec.required ? expr : expr.or(z.literal("")).optional();
				}
				case "number":
					if (spec.range)
						return z
							.number({ error: m })
							.min(spec.range.min, m)
							.max(spec.range.max, m);
					return spec.required
						? z.number({ error: m }).positive(m)
						: z.number().optional();
				case "choice": {
					const expr = z.enum(spec.options as [string, ...string[]], {
						error: m,
					});
					return spec.required ? expr : expr.or(z.literal("")).optional();
				}
				case "multi": {
					const expr = z.array(z.enum(spec.options as [string, ...string[]]), {
						error: m,
					});
					return spec.required ? expr.min(1, m) : expr.optional();
				}
				case "boolean":
					return spec.required
						? z.literal(true, { error: m })
						: z.boolean().optional();
			}
		};
		return (fields) =>
			z.object(
				Object.fromEntries(fields.map(({ key, field }) => [key, one(field)])),
			);
	},
	valibot: async () => {
		const v = await import("valibot");
		const one = (field: StudioField) => {
			const spec = fieldSpec(field);
			const m = spec.message;
			switch (spec.kind) {
				case "text": {
					if (!spec.format)
						return spec.required
							? v.pipe(v.string(m), v.nonEmpty(m))
							: v.optional(v.string());
					const expr = v.pipe(
						v.string(m),
						spec.format === "email"
							? v.email(m)
							: spec.format === "url"
								? v.url(m)
								: spec.format === "date"
									? v.isoDate(m)
									: v.regex(pattern(spec.format), m),
					);
					return spec.required
						? expr
						: v.optional(v.union([v.literal(""), expr]));
				}
				case "number":
					if (spec.range)
						return v.pipe(
							v.number(m),
							v.minValue(spec.range.min, m),
							v.maxValue(spec.range.max, m),
						);
					return spec.required
						? v.pipe(v.number(m), v.gtValue(0, m))
						: v.optional(v.number());
				case "choice": {
					const expr = v.picklist(spec.options, m);
					return spec.required
						? expr
						: v.optional(v.union([v.literal(""), expr]));
				}
				case "multi": {
					const expr = v.array(v.picklist(spec.options), m);
					return spec.required
						? v.pipe(expr, v.minLength(1, m))
						: v.optional(expr);
				}
				case "boolean":
					return spec.required ? v.literal(true, m) : v.optional(v.boolean());
			}
		};
		return (fields) =>
			v.object(
				Object.fromEntries(fields.map(({ key, field }) => [key, one(field)])),
			);
	},
	arktype: async () => {
		const { type } = await import("arktype");
		return (fields) =>
			type(
				Object.fromEntries(
					fields.map(({ key, field }) => [
						fieldSpec(field).required ? key : `${key}?`,
						arktypeDefinition(field),
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
