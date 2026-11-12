import type { StudioConfig, StudioStep, UiKit } from "../config";

// ─── Identifiers ──────────────────────────────────────────────────────────────

const RESERVED = new Set(
	"break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof let new null return static super switch this throw true try typeof var void while with yield await".split(
		" ",
	),
);

function words(value: string): string[] {
	const found = value
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.match(/[a-z0-9]+/g);
	return found?.length ? found : ["step"];
}

export function camel(value: string): string {
	const [first, ...rest] = words(value);
	const id =
		first + rest.map((word) => word[0].toUpperCase() + word.slice(1)).join("");
	return /^\d/.test(id) ? `n${id}` : id;
}

export function pascal(value: string): string {
	const id = camel(value);
	return id[0].toUpperCase() + id.slice(1);
}

export function kebab(value: string): string {
	return words(value).join("-");
}

/** Makes every id in a list unique by suffixing repeats: `name`, `name2`… */
function unique(ids: string[]): string[] {
	const seen = new Map<string, number>();
	return ids.map((id) => {
		const count = (seen.get(id) ?? 0) + 1;
		seen.set(id, count);
		return count === 1 ? id : `${id}${count}`;
	});
}

export function stepIds(steps: readonly StudioStep[]): string[] {
	return unique(steps.map((step) => camel(step.title)));
}

export function fieldNames(step: StudioStep): string[] {
	return unique(step.fields.map((field) => camel(field.label)));
}

/** Every name the generator needs, derived once per config. */
export type Names = {
	/** Folder and route segment, e.g. `identity-check`. */
	slug: string;
	/** Definition variable, e.g. `identityCheck`. */
	flow: string;
	/** Component prefix, e.g. `IdentityCheck`. */
	Flow: string;
	stepIds: string[];
	fields: string[][];
};

export function deriveNames(config: StudioConfig): Names {
	const flow = camel(config.name);
	return {
		slug: kebab(config.name),
		flow: RESERVED.has(flow) ? `${flow}Flow` : flow,
		Flow: pascal(config.name),
		stepIds: stepIds(config.steps),
		fields: config.steps.map(fieldNames),
	};
}

// ─── Source helpers ───────────────────────────────────────────────────────────

/** A string literal. User text only ever reaches source through here or `jsxText`. */
export const str = (value: string): string => JSON.stringify(value);

/** JSX text that cannot break out of the element it sits in. */
export function jsxText(value: string): string {
	return /^[^{}<>&"'`\\]*$/.test(value) ? value : `{${str(value)}}`;
}

/** A JSX attribute value. JSX strings have no escapes, so unsafe text becomes an expression. */
export function jsxAttr(value: string): string {
	return /^[^"\\{}<>]*$/.test(value) ? `"${value}"` : `{${str(value)}}`;
}

export function indent(source: string, depth: number): string {
	const pad = "\t".repeat(depth);
	return source
		.split("\n")
		.map((line) => (line ? pad + line : line))
		.join("\n");
}

/** Joins source lines and collapses accidental double blank lines. */
export function source(lines: (string | false | null | undefined)[]): string {
	const kept = lines.filter((line): line is string => typeof line === "string");
	const out: string[] = [];
	for (const line of kept) {
		if (line === "" && out[out.length - 1] === "") continue;
		out.push(line);
	}
	return `${out.join("\n").trim()}\n`;
}

/** ` className="…"` unless the kit is unstyled. */
export function cls(ui: UiKit, classes: string): string {
	return ui === "unstyled" ? "" : ` className="${classes}"`;
}

export function hasFields(step: StudioStep): boolean {
	return step.fields.length > 0;
}

export function usesValidation(config: StudioConfig): boolean {
	return config.validation !== "none" && config.steps.some(hasFields);
}

export const USE_CLIENT = '"use client";';
