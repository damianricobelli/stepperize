#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { transform } from "./v9";

const SOURCES = /\.[cm]?[jt]sx?$/;
const SKIP = new Set(["node_modules", "dist", "build", ".git", ".next", ".turbo", ".output"]);
const USAGE = `Usage: stepperize-codemod v9 <paths...> [--dry]

  v9       Migrate @stepperize/react v8 code to v9.
  --dry    Report what would change without writing files.`;

function* walk(path: string): Generator<string> {
	if (statSync(path).isDirectory()) {
		for (const entry of readdirSync(path)) if (!SKIP.has(entry)) yield* walk(join(path, entry));
	} else if (SOURCES.test(path) && !/\.d\.[cm]?ts$/.test(path)) yield path;
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const [name, ...paths] = args.filter((arg) => !arg.startsWith("--"));

if (name !== "v9" || !paths.length) {
	console.log(USAGE);
	process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
}

const total = { files: 0, changed: 0, rewrites: 0, todos: 0, errors: 0 };
for (const root of paths) {
	for (const file of walk(resolve(root))) {
		const label = relative(process.cwd(), file) || file;
		const source = readFileSync(file, "utf8");
		total.files++;
		try {
			const result = transform(source, file);
			if (result.code === source) continue;
			if (!dry) writeFileSync(file, result.code);
			total.changed++;
			total.rewrites += result.rewrites;
			total.todos += result.todos;
			console.log(
				`${dry ? "would change" : "changed"}  ${label}  (${result.rewrites} rewrites, ${result.todos} TODOs)`,
			);
		} catch (error) {
			total.errors++;
			console.log(`skipped  ${label}  (${error instanceof Error ? error.message : String(error)})`);
		}
	}
}

console.log(
	`\n${total.files} files scanned, ${total.changed} ${dry ? "would change" : "changed"}: ` +
		`${total.rewrites} rewrites, ${total.todos} TODOs to review${total.errors ? `, ${total.errors} skipped with errors` : ""}.`,
);
if (total.todos) console.log('Search for "TODO(stepperize-v9)" to finish the migration, then run your formatter.');
process.exit(total.errors ? 1 : 0);
