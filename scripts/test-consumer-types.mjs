import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lowest } from "./lowest-version.mjs";

// Typechecks an app that uses the PUBLISHED declarations of every package (their built
// `dist`, copied into node_modules) on the oldest TypeScript each one claims, with each
// framework at the lowest version its peer range allows. That is the TypeScript floor of
// `@stepperize/core`'s optional peer, or a framework's own when it is higher (Angular).
// Declarations are checked too (no skipLibCheck): an error in our `.d.ts` files, or in the
// app below, fails; one inside a framework's own types is printed and left to it.
//
// Usage: node scripts/test-consumer-types.mjs [typescript-version] (after `pnpm build:packages`)
// The optional version replaces core's floor, to look for the real minimum.

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const core = read("packages/core/package.json");
const typescriptFloor = process.argv[2] ?? lowest("typescript", core.peerDependencies.typescript);

// The app for each package: every entry point, and the typed ids a wrong one must fail on.
const apps = {
	core: `
import { createStepper, type Id } from "@stepperize/core";
import { bindStepper } from "@stepperize/core/dom";
import * as primitives from "@stepperize/core/primitives";
const steps = [{ id: "account" }, { id: "done" }] as const;
const flow = createStepper(steps);
const id: Id<typeof steps> = flow.current.id;
void flow.goTo("done");
// @ts-expect-error: not a step of this flow.
void flow.goTo("nope");
export { bindStepper, id, primitives };`,
	...Object.fromEntries(
		["react", "vue", "svelte", "solid", "lit", "angular"].map((name) => [
			name,
			`
import { defineStepper, type Id } from "@stepperize/${name}";
import * as headless from "@stepperize/${name}/headless";
const definition = defineStepper([{ id: "account", title: "Account" }, { id: "done" }]);
const flow = definition.create();
const id: Id<typeof definition.steps> = flow.current.id;
void flow.goTo("done");
// @ts-expect-error: not a step of this flow.
void flow.goTo("nope");
const bare = headless.defineStepper([{ id: "account" }, { id: "done" }]).create();
// @ts-expect-error: not a step of this flow.
void bare.goTo("nope");
export { definition, id };`,
		]),
	),
};

/**
 * Where each package's published files are, the types its framework needs, and the
 * package that states the framework's TypeScript range when the framework does not.
 */
const packages = {
	core: { dist: "packages/core", files: ["dist", "package.json"] },
	react: { dist: "packages/react", files: ["dist", "package.json"], types: { react: "@types/react" } },
	vue: { dist: "packages/vue", files: ["dist", "package.json"] },
	svelte: { dist: "packages/svelte", files: ["dist", "package.json"] },
	solid: { dist: "packages/solid", files: ["dist", "package.json"] },
	lit: { dist: "packages/lit", files: ["dist", "package.json"] },
	angular: {
		dist: "packages/angular/dist",
		files: ["."],
		compiler: { "@angular/core": "@angular/compiler-cli" },
	},
};

const dependencies = {};
const compilers = {};
for (const [name, { dist, types = {}, compiler = {} }] of Object.entries(packages)) {
	const manifest = name === "angular" ? read(`${dist}/package.json`) : read(`packages/${name}/package.json`);
	let typescript = typescriptFloor;
	for (const [peer, range] of Object.entries(manifest.peerDependencies ?? {})) {
		if (peer === "typescript") continue;
		const version = lowest(peer, range);
		dependencies[peer] = version;
		if (types[peer]) dependencies[types[peer]] = lowest(types[peer], `~${version.split(".").slice(0, 2).join(".")}`);
		// A framework that needs a newer TypeScript than ours sets the floor for its app.
		const needs = JSON.parse(
			execFileSync("npm", ["view", `${compiler[peer] ?? peer}@${version}`, "peerDependencies", "--json"], {
				encoding: "utf8",
			}) || "{}",
		).typescript;
		if (needs && needs !== "*") {
			const theirs = lowest("typescript", needs);
			if (theirs.localeCompare(typescript, undefined, { numeric: true }) > 0) typescript = theirs;
		}
	}
	compilers[name] = typescript;
	dependencies[`typescript-${typescript}`] = `npm:typescript@${typescript}`;
}

const dir = mkdtempSync(join(tmpdir(), "stepperize-consumer-types-"));
try {
	writeFileSync(join(dir, "package.json"), JSON.stringify({ private: true, type: "module", dependencies }));
	execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
		cwd: dir,
		stdio: "inherit",
	});
	// Real copies, as an install from the registry leaves them, not workspace links.
	for (const [name, { dist, files }] of Object.entries(packages)) {
		const target = join(dir, "node_modules/@stepperize", name);
		mkdirSync(target, { recursive: true });
		for (const file of files)
			cpSync(join(root, dist, file), join(target, file === "." ? "" : file), { recursive: true });
	}
	const failed = [];
	for (const [name, app] of Object.entries(apps)) {
		writeFileSync(join(dir, `${name}.ts`), app);
		for (const moduleResolution of ["bundler", "node16"]) {
			const config = `tsconfig.${name}.${moduleResolution}.json`;
			writeFileSync(
				join(dir, config),
				JSON.stringify({
					compilerOptions: {
						strict: true,
						noEmit: true,
						target: "es2022",
						lib: ["es2022", "dom", "dom.iterable"],
						module: moduleResolution === "bundler" ? "esnext" : "node16",
						moduleResolution,
						jsx: "preserve",
						types: [],
						skipLibCheck: false,
					},
					files: [`${name}.ts`],
				}),
			);
			const typescript = compilers[name];
			let output = "";
			try {
				execFileSync(
					process.execPath,
					[`node_modules/typescript-${typescript}/bin/tsc`, "-p", config, "--pretty", "false"],
					{ cwd: dir, encoding: "utf8" },
				);
			} catch (error) {
				output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
			}
			// An error is ours when it is in a published declaration of ours or in the app.
			const errors = output.split(/\n(?=\S)/).filter((line) => line.trim());
			const ours = errors.filter((line) => /^(node_modules\/@stepperize\/|[a-z]+\.ts\()/.test(line));
			const label = `@stepperize/${name}, TypeScript ${typescript}, moduleResolution ${moduleResolution}`;
			if (errors.length > ours.length) {
				console.log(`${label}: ${errors.length - ours.length} error(s) in a framework's own types, not ours:`);
				for (const line of errors.filter((line) => !ours.includes(line))) console.log(`  ${line}`);
			}
			if (ours.length > 0) {
				failed.push(label);
				console.log(`${label}: FAILED\n${ours.join("\n")}`);
			} else console.log(`${label}: ok`);
		}
	}
	if (failed.length > 0) {
		console.log(`Failed:\n  ${failed.join("\n  ")}`);
		process.exitCode = 1;
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}
