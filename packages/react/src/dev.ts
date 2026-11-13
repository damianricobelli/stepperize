// Development-only diagnostics. Every call site is wrapped in
// `process.env.NODE_ENV !== "production"` so bundlers drop the checks and messages.

export const DOCS = "https://stepperize.com/docs/v8/api/react/errors";

/** Stable, searchable codes. Each one has an anchor on the errors page. */
export type DiagnosticCode =
	| "SZ001" // render function ignored the props it received
	| "SZ002" // Trigger without an accessible name
	| "SZ003" // Trigger outside Stepper.List
	| "SZ004" // controlled `step` without `onStepChange`
	| "SZ100" // missing Provider / Root
	| "SZ101" // missing Stepper.Item
	| "SZ102" // unknown step id
	| "SZ103" // Item without a step outside Stepper.Items
	| "SZ104"; // invalid step list in defineStepper

const seen = new Set<string>();

export function warn(code: DiagnosticCode, message: string) {
	const key = code + message;
	if (seen.has(key)) return;
	seen.add(key);
	// biome-ignore lint/suspicious/noConsole: development-only diagnostics.
	console.warn(`[stepperize] ${code}: ${message}\n${DOCS}#${code.toLowerCase()}`);
}

/** Errors keep their message in production; the code and link make them searchable. */
export function fail(code: DiagnosticCode, message: string): never {
	throw new Error(`[stepperize] ${code}: ${message} See ${DOCS}#${code.toLowerCase()}`);
}
