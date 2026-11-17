#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { leftoverStyles, transform } from "./v9";

const SOURCES = /\.[cm]?[jt]sx?$/;
const STYLES = /\.(css|scss|sass|less|pcss|styl)$/;
const SKIP = new Set(["node_modules", "dist", "build", "coverage", ".git", ".next", ".turbo", ".output", ".vercel"]);
const FLAGS = new Set(["--dry", "--help", "-h"]);
const USAGE = `Usage: stepperize-codemod v9 <paths...> [--dry]

  v9       Migrate @stepperize/react v8 code to v9.
  --dry    Report what would change without writing files.`;

function* walk(path: string): Generator<string> {
	if (statSync(path).isDirectory()) {
		for (const entry of readdirSync(path)) if (!SKIP.has(entry)) yield* walk(join(path, entry));
	} else if ((SOURCES.test(path) && !/\.d\.[cm]?ts$/.test(path)) || STYLES.test(path)) yield path;
}

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith("-"));
const [name, ...paths] = args.filter((arg) => !arg.startsWith("-"));
const dry = flags.includes("--dry");
const unknown = flags.filter((flag) => !FLAGS.has(flag));

if (flags.includes("--help") || flags.includes("-h")) {
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

const total = { files: 0, changed: 0, rewrites: 0, todos: 0, errors: 0 };
/** Each kind of TODO, with the files it was left in. */
const notes = new Map<string, Set<string>>();
/** Rewrites worth a look, with the files they were made in. */
const warnings = new Map<string, Set<string>>();
/** `file:line` of the v8 selectors the codemod left alone. */
const styles: string[] = [];

for (const root of paths) {
	if (!existsSync(resolve(root))) {
		total.errors++;
		console.log(`not found  ${root}`);
		continue;
	}
	for (const file of walk(resolve(root))) {
		const source = readFileSync(file, "utf8");
		let code = source;
		if (SOURCES.test(file)) {
			total.files++;
			try {
				const result = transform(source, file);
				code = result.code;
				if (code !== source) {
					if (!dry) writeFileSync(file, code);
					total.changed++;
					total.rewrites += result.rewrites;
					total.todos += result.todos;
					for (const note of result.notes) notes.set(note, (notes.get(note) ?? new Set()).add(label(file)));
					for (const warning of result.warnings)
						warnings.set(warning, (warnings.get(warning) ?? new Set()).add(label(file)));
					console.log(
						`${dry ? "would change" : "changed"}  ${label(file)}  (${plural(result.rewrites, "rewrite")}, ${plural(result.todos, "TODO")})`,
					);
				}
			} catch (error) {
				total.errors++;
				console.log(`skipped  ${label(file)}  (${error instanceof Error ? error.message : String(error)})`);
				continue;
			}
		}
		// Style sheets are never rewritten, and neither is code the codemod cannot tie to a stepper.
		for (const line of leftoverStyles(code)) styles.push(`${label(file)}:${line}`);
	}
}

console.log(
	`\n${plural(total.files, "file")} scanned, ${total.changed} ${dry ? "would change" : "changed"}: ` +
		`${plural(total.rewrites, "rewrite")}, ${plural(total.todos, "TODO")} to review${total.errors ? `, ${total.errors} skipped with errors` : ""}.`,
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
	const shown = styles.slice(0, 20);
	console.log(
		'\nStill styled with the v8 attributes. If they target stepper parts, `data-status="active | previous | upcoming"` is now `data-state="current | complete | pending"`:',
	);
	console.log(
		`  ${shown.join("\n  ")}${styles.length > shown.length ? `\n  ... and ${styles.length - shown.length} more` : ""}`,
	);
}

if (total.changed || styles.length) {
	const steps = [
		"Install the new version: @stepperize/react@9.",
		"Run your formatter.",
		...(total.todos ? ['Search for "TODO(stepperize-v9)", decide each one and delete the comment.'] : []),
		"Run your type checker: it finds any v8 call on a stepper the codemod could not follow.",
	];
	console.log(`\nNext:\n${steps.map((step, index) => `  ${index + 1}. ${step}`).join("\n")}`);
}
process.exit(total.errors ? 1 : 0);
