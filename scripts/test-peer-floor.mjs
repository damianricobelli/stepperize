import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lowest } from "./lowest-version.mjs";

// Builds, typechecks and tests a binding against the LOWEST version of each peer
// dependency its range allows, in a separate install so the workspace is untouched.
// Every other dependency stays at the version the workspace has installed, so the
// peer floor is the only difference from the regular CI job.
//
// Usage: node scripts/test-peer-floor.mjs <vue|svelte|solid|angular|lit> [name@version...]
// The optional `name@version` arguments replace a floor, to look for the real minimum.

const root = fileURLToPath(new URL("../", import.meta.url));
const binding = process.argv[2];
const bindings = ["vue", "svelte", "solid", "angular", "lit"];
if (!bindings.includes(binding)) throw new Error(`Usage: node scripts/test-peer-floor.mjs <${bindings.join("|")}>`);

// Packages released in lockstep with a peer: they follow the peer down to its floor, as
// an app on that version has them (Angular's compiler, platforms and build tools).
const lockstep = {
	"@angular/core": /^(@angular\/.+|ng-packagr)$/,
};
// Packages a peer is split into: pinned to the lowest version the peer's floor accepts,
// or npm would pair the old entry point with the newest internals (Lit's lit-html).
const splitInto = { lit: ["lit-html", "lit-element", "@lit/reactive-element"] };

// Steps that cannot pass at the floor for a reason that never reaches an app, with that reason.
const skip = {
	vue: {
		// What apps compile against is checked at the floor by scripts/test-consumer-types.mjs.
		typecheck:
			"before 3.5.43, Vue's types drop a prop whose PropType is generic (vuejs/core#9546), which only " +
			"the binding's own defineComponent calls meet: its published declarations are written by hand",
	},
};

const source = join(root, "packages", binding);
const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));

/** The exact version the workspace installed, as a spec npm understands (aliases included). */
const installed = (name) => {
	const pkg = JSON.parse(readFileSync(join(source, "node_modules", name, "package.json"), "utf8"));
	return pkg.name === name ? pkg.version : `npm:${pkg.name}@${pkg.version}`;
};

const chosen = Object.fromEntries(
	process.argv.slice(3).map((argument) => {
		const at = argument.lastIndexOf("@");
		return [argument.slice(0, at), argument.slice(at + 1)];
	}),
);
const floors = {};
for (const [name, range] of Object.entries(manifest.peerDependencies)) {
	const version = chosen[name] ?? lowest(name, range);
	floors[name] = version;
	for (const dependency of Object.keys(manifest.devDependencies)) {
		if (lockstep[name]?.test(dependency)) floors[dependency] = lowest(dependency, `~${version}`);
	}
	for (const part of splitInto[name] ?? []) {
		const dependencies = JSON.parse(
			execFileSync("npm", ["view", `${name}@${version}`, "dependencies", "--json"], { encoding: "utf8" }),
		);
		floors[part] = lowest(part, dependencies[part]);
	}
}
Object.assign(floors, chosen);

const pin = (specs = {}) =>
	Object.fromEntries(
		Object.keys(specs).map((name) => [
			name,
			name === "@stepperize/core" ? "file:./core" : (floors[name] ?? installed(name)),
		]),
	);
const dependencies = pin(manifest.dependencies);
const devDependencies = pin(manifest.devDependencies);
for (const [name, version] of Object.entries(floors)) {
	if (!(name in dependencies)) devDependencies[name] ??= version;
}

console.log(`Testing @stepperize/${binding} with`, floors);

const dir = mkdtempSync(join(tmpdir(), `stepperize-${binding}-floor-`));
try {
	cpSync(source, dir, {
		recursive: true,
		filter: (path) => !/[/\\](node_modules|dist|\.turbo|\.svelte-kit|out-tsc)$/.test(path),
	});
	// Copy the built core package instead of following workspace symlinks.
	const core = join(dir, "core");
	cpSync(join(root, "packages/core/dist"), join(core, "dist"), { recursive: true });
	const corePackage = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
	delete corePackage.devDependencies;
	delete corePackage.scripts;
	writeFileSync(join(core, "package.json"), JSON.stringify(corePackage));
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({
			...manifest,
			private: true,
			dependencies,
			devDependencies,
			// One copy of each peer, even where a tool depends on a newer one.
			overrides: floors,
		}),
	);
	// @angular/build 22.0 declares an optional peer on vitest 4, for a test runner of its
	// own these tests do not use (they run on vitest 5 through the Analog plugin).
	const flags = binding === "angular" ? ["--legacy-peer-deps"] : [];
	execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...flags], {
		cwd: dir,
		stdio: "inherit",
	});
	// Every step runs, so one failure does not hide another.
	const failed = ["build", "typecheck", "test"].filter((script) => {
		if (skip[binding]?.[script]) {
			console.log(`Skipping ${script}: ${skip[binding][script]}`);
			return false;
		}
		try {
			execFileSync("npm", ["run", script], { cwd: dir, stdio: "inherit" });
			return false;
		} catch {
			return true;
		}
	});
	if (failed.length > 0) {
		console.log(`@stepperize/${binding} failed ${failed.join(", ")} with`, floors);
		process.exitCode = 1;
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}
