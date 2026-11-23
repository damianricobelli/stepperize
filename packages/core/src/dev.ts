// Diagnostics. Warnings sit behind `process.env.NODE_ENV !== "production"` at
// every call site, so bundlers drop the checks and their messages.

declare const process: { env: { NODE_ENV?: string } };

const DOCS = "https://stepperize.com/docs/v9/core/errors";

/** Stable, searchable codes. Each one has an anchor on the errors page. */
export type Code =
	| "SZ001" // render function ignored the props it received
	| "SZ002" // Trigger without an accessible name
	| "SZ003" // Trigger outside Stepper.List
	| "SZ004" // part rendered in another shadow root than its Root
	| "SZ005" // trigger that is not a button
	| "SZ100" // missing Provider / Root
	| "SZ101" // missing Stepper.Item
	| "SZ102" // unknown step id
	| "SZ103" // invalid step list
	| "SZ104"; // a flow created where nothing owns it

/**
 * Whether development checks run. Bundlers replace `process.env.NODE_ENV`, which
 * drops the checks from production builds; a page that loads the published files
 * without a bundler has no `process`, and gets no checks instead of an error.
 */
export function development(): boolean {
	try {
		return process.env.NODE_ENV !== "production";
	} catch {
		return false;
	}
}

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
