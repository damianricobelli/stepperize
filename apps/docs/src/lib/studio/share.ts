import { z } from "zod";
import {
	FIELD_TYPES,
	FORMS,
	FRAMEWORKS,
	INDICATORS,
	LAYOUTS,
	LIMITS,
	NAVIGATIONS,
	normalizeConfig,
	type StudioConfig,
	UI_KITS,
	VALIDATIONS,
} from "./config";

/**
 * Share-link and registry-URL encoding.
 *
 * A config travels as base64url JSON. Decoding runs on the server for the
 * registry endpoint, so the schema is strict and bounded: everything that ends
 * up in generated source is length-capped here and escaped by the generator.
 */

const text = (max: number) => z.string().trim().max(max);

const fieldSchema = z.object({
	label: text(LIMITS.label).min(1),
	type: z.enum(FIELD_TYPES),
	required: z.boolean(),
	options: z
		.array(text(LIMITS.option).min(1))
		.min(1)
		.max(LIMITS.options)
		.optional(),
});

const stepSchema = z.object({
	title: text(LIMITS.label).min(1),
	description: text(LIMITS.description),
	fields: z.array(fieldSchema).max(LIMITS.fields),
});

export const studioConfigSchema = z.object({
	name: text(LIMITS.name).min(1),
	framework: z.enum(FRAMEWORKS),
	navigation: z.enum(NAVIGATIONS),
	layout: z.enum(LAYOUTS),
	form: z.enum(FORMS),
	validation: z.enum(VALIDATIONS),
	ui: z.enum(UI_KITS),
	indicator: z.enum(INDICATORS),
	behavior: z.object({
		linear: z.boolean(),
		guard: z.boolean(),
		persist: z.boolean(),
		keepMounted: z.boolean(),
	}),
	steps: z.array(stepSchema).min(LIMITS.steps.min).max(LIMITS.steps.max),
});

/** Encoded configs above this size are rejected before parsing. */
const MAX_ENCODED_LENGTH = 12_000;

function toBase64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function encodeConfig(config: StudioConfig): string {
	return toBase64Url(JSON.stringify(config));
}

/** Returns `undefined` for anything that is not a valid, bounded config. */
export function decodeConfig(
	encoded: string | undefined | null,
): StudioConfig | undefined {
	if (
		!encoded ||
		encoded.length > MAX_ENCODED_LENGTH ||
		!/^[\w-]+$/.test(encoded)
	)
		return undefined;
	try {
		const parsed = studioConfigSchema.safeParse(
			JSON.parse(fromBase64Url(encoded)),
		);
		return parsed.success ? normalizeConfig(parsed.data) : undefined;
	} catch {
		return undefined;
	}
}

export const SITE_ORIGIN = "https://stepperize.com";

export function registryUrl(
	config: StudioConfig,
	origin = SITE_ORIGIN,
): string {
	return `${origin}/r/studio/${encodeConfig(config)}.json`;
}

export function shareUrl(config: StudioConfig, origin = SITE_ORIGIN): string {
	return `${origin}/studio?c=${encodeConfig(config)}`;
}
