#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type Diagnostic, loadProject, projectRoot } from "./types";
import { leftoverStyles, prepare, transform } from "./v9";

const SOURCES = /\.[cm]?[jt]sx?$/;
const STYLES = /\.(css|scss|sass|less|pcss|styl)$/;
const SKIP = new Set(["node_modules", "dist", "build", "coverage", ".git", ".next", ".turbo", ".output", ".vercel"]);
const FLAGS = new Set(["--dry", "--check", "--json", "--no-types", "--help", "-h"]);
const MARK = "TODO(stepperize-v9):";
const USAGE = `Usage: stepperize-codemod v9 <paths...> [options]

  v9           Migrate @stepperize/react v8 code to v9.

  --dry        Report what would change without writing files.
  --check      Type-check the migrated files and list the errors left in them.
  --json       Print the report as JSON, for scripts and coding agents.
  --no-types   Do not use the project's TypeScript to find steppers.`;

function* walk(path: string): Generator<string> {
	if (statSync(path).isDirectory()) {
		for (const entry of readdirSync(path)) if (!SKIP.has(entry)) yield* walk(join(path, entry));
	} else if ((SOURCES.test(path) && !/\.d\.[cm]?ts$/.test(path)) || STYLES.test(path)) yield path;
}

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith("-"));
const [name, ...paths] = args.filter((arg) => !arg.startsWith("-"));
const has = (flag: string) => flags.includes(flag);
const dry = has("--dry");
const json = has("--json");
const unknown = flags.filter((flag) => !FLAGS.has(flag));

if (has("--help") || has("-h")) {
	console.log(USAGE);
	process.exit(0);
}
if (unknown.length || name !== "v9" || !paths.length) {
	if (unknown.length) console.log(`Unknown option: ${unknown.join(", ")}\n`);
	else if (name && name !== "v9") console.log(`Unknown transform "${name}". The only one is "v9".\n`);
	console.log(USAGE);
	process.exit(1);
}

const label = (file: string) => relative(process.cwd(), file) || file;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
/** Progress lines are for people: with `--json` the only output is the report. */
const say = (text: string) => {
	if (!json) console.log(text);
};

type Failure = { file: string; message: string };
const failures: Failure[] = [];
const fail = (file: string, error: unknown) => {
	failures.push({ file, message: error instanceof Error ? error.message : String(error) });
	say(`skipped  ${file}  (${failures.at(-1)?.message})`);
};

// ---- Read ---------------------------------------------------------------------

/** Every source file, with its text and the text after the first, formatting-safe pass. */
const sources = new Map<string, { source: string; prepared: string }>();
const sheets = new Map<string, string>();
for (const root of paths) {
	if (!existsSync(resolve(root))) {
		fail(root, "not found");
		continue;
	}
	for (const file of walk(resolve(root))) {
		const source = readFileSync(file, "utf8");
		if (!SOURCES.test(file)) sheets.set(file, source);
		else
			try {
				sources.set(file, { source, prepared: prepare(source, file).code });
			} catch (error) {
				fail(label(file), error);
			}
	}
}

// ---- Types --------------------------------------------------------------------

const root = projectRoot(process.cwd());
const project = has("--no-types")
	? undefined
	: loadProject(root, new Map([...sources].map(([file, entry]) => [file, entry.prepared])));
say(
	project
		? `Finding steppers with the types of ${label(project.config)}.\n`
		: has("--no-types")
			? ""
			: "No TypeScript project found: finding steppers from the syntax alone.\n",
);

// ---- Rewrite ------------------------------------------------------------------

type Change = { file: string; rewrites: number; todos: number };
const changes: Change[] = [];
const results = new Map<string, string>();
/** Each kind of TODO, with the files it was left in. */
const notes = new Map<string, Set<string>>();
/** Rewrites worth a look, with the files they were made in. */
const warnings = new Map<string, Set<string>>();

for (const [file, { source }] of sources) {
	try {
		const result = transform(source, file, { typed: project?.typed(file) });
		results.set(file, result.code);
		if (result.code === source) continue;
		if (!dry) writeFileSync(file, result.code);
		changes.push({ file: label(file), rewrites: result.rewrites, todos: result.todos });
		for (const note of result.notes) notes.set(note, (notes.get(note) ?? new Set()).add(label(file)));
		for (const warning of result.warnings) warnings.set(warning, (warnings.get(warning) ?? new Set()).add(label(file)));
		say(
			`${dry ? "would change" : "changed"}  ${label(file)}  (${plural(result.rewrites, "rewrite")}, ${plural(result.todos, "TODO")})`,
		);
	} catch (error) {
		fail(label(file), error);
	}
}

// ---- Report -------------------------------------------------------------------

/** Every TODO now in the code, old or new, where an agent or an editor can jump to it. */
const todos: { file: string; line: number; message: string }[] = [];
/** The v8 selectors the codemod left alone: style sheets, and code it cannot tie to a stepper. */
const styles: { file: string; line: number }[] = [];
for (const [file, code] of [...results, ...sheets]) {
	code.split("\n").forEach((text, index) => {
		const at = text.indexOf(MARK);
		if (at >= 0) todos.push({ file: label(file), line: index + 1, message: text.slice(at + MARK.length).trim() });
	});
	for (const line of leftoverStyles(code)) styles.push({ file: label(file), line });
}

let diagnostics: Diagnostic[] | undefined;
if (has("--check")) {
	// Checked against what the files are now, written or not.
	const changed = changes.map((change) => resolve(change.file));
	const checked = loadProject(root, results);
	diagnostics = checked?.diagnostics(changed).map((entry) => ({ ...entry, file: label(entry.file) }));
}

const rewrites = changes.reduce((sum, change) => sum + change.rewrites, 0);
const added = changes.reduce((sum, change) => sum + change.todos, 0);

if (json) {
	console.log(
		JSON.stringify(
			{
				dry,
				types: project ? label(project.config) : null,
				scanned: sources.size,
				changed: changes,
				rewrites,
				todos,
				warnings: [...warnings].map(([message, files]) => ({ message, files: [...files] })),
				styles,
				errors: failures,
				...(has("--check") ? { diagnostics: diagnostics ?? null } : {}),
			},
			null,
			2,
		),
	);
	process.exit(failures.length ? 1 : 0);
}

console.log(
	`\n${plural(sources.size, "file")} scanned, ${changes.length} ${dry ? "would change" : "changed"}: ` +
		`${plural(rewrites, "rewrite")}, ${plural(added, "TODO")} to review${failures.length ? `, ${failures.length} skipped with errors` : ""}.`,
);

if (notes.size) {
	console.log('\nLeft for you, as "TODO(stepperize-v9)" comments:');
	for (const [note, files] of [...notes].sort((a, z) => z[1].size - a[1].size)) {
		// The first sentence names what changed; the comment in the file has the rest.
		const [summary] = note.split(/(?<=\.)\s/);
		console.log(`  ${summary}\n    ${[...files].join(", ")}`);
	}
}

if (warnings.size) {
	console.log("\nRewritten, but worth a look:");
	for (const [warning, files] of warnings) console.log(`  ${warning}\n    ${[...files].join(", ")}`);
}

if (styles.length) {
	const shown = styles.slice(0, 20).map((entry) => `${entry.file}:${entry.line}`);
	console.log(
		'\nStill styled with the v8 attributes. If they target stepper parts, `data-status="active | previous | upcoming"` is now `data-state="current | complete | pending"`:',
	);
	console.log(
		`  ${shown.join("\n  ")}${styles.length > shown.length ? `\n  ... and ${styles.length - shown.length} more` : ""}`,
	);
}

if (has("--check")) {
	if (!diagnostics) console.log("\n--check needs a tsconfig.json and TypeScript installed in the project: skipped.");
	else if (!diagnostics.length) console.log("\nType check: no errors in the migrated files.");
	else {
		const shown = diagnostics.slice(0, 40);
		console.log(`\nType check: ${plural(diagnostics.length, "error")} in the migrated files:`);
		for (const entry of shown) console.log(`  ${entry.file}:${entry.line}:${entry.column}  ${entry.message}`);
		if (diagnostics.length > shown.length) console.log(`  ... and ${diagnostics.length - shown.length} more`);
	}
}

if (changes.length || styles.length) {
	const steps = [
		"Run your formatter.",
		...(added ? ['Search for "TODO(stepperize-v9)", decide each one and delete the comment.'] : []),
		has("--check")
			? "Fix the type errors above: they are v8 calls the codemod could not rewrite."
			: "Run your type checker, or this command again with --check: it finds the v8 calls left.",
	];
	console.log(`\nNext:\n${steps.map((step, index) => `  ${index + 1}. ${step}`).join("\n")}`);
	if (added) console.log("\nA coding agent can do the rest: https://stepperize.com/docs/v9/react/migration-agent");
}
process.exit(failures.length ? 1 : 0);
