// Diagnostics. Warnings sit behind `process.env.NODE_ENV !== "production"` at
// every call site, so bundlers drop the checks and their messages.

const DOCS = "https://stepperize.com/docs/v9/core/errors";

/** Stable, searchable codes. Each one has an anchor on the errors page. */
export type Code =
	| "SZ001" // render function ignored the props it received
	| "SZ002" // Trigger without an accessible name
	| "SZ003" // Trigger outside Stepper.List
	| "SZ100" // missing Provider / Root
	| "SZ101" // missing Stepper.Item
	| "SZ102" // unknown step id
	| "SZ103"; // invalid step list

const seen = new Set<string>();

export function warn(code: Code, message: string) {
	if (seen.has(message)) return;
	seen.add(message);
	// biome-ignore lint/suspicious/noConsole: development-only diagnostics.
	console.warn(`[stepperize] ${code}: ${message}\n${DOCS}#${code.toLowerCase()}`);
}

export function fail(code: Code, message: string): never {
	throw new Error(`[stepperize] ${code}: ${message} See ${DOCS}#${code.toLowerCase()}`);
}
