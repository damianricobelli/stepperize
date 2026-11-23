import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Runs the React test-suite, unchanged, with `react` and `react-dom` resolving to
// `preact/compat`: the same setup a Preact application uses to consume
// `@stepperize/react`. A separate install keeps React out of the module graph.
//
// Usage: node scripts/test-preact-compat.mjs [preact version] [vitest arguments]
const root = fileURLToPath(new URL("../", import.meta.url));
const installed = (name) =>
	JSON.parse(readFileSync(join(root, "packages/react/node_modules", name, "package.json"), "utf8"));
const dir = mkdtempSync(join(tmpdir(), "stepperize-preact-compat-"));
try {
	const source = join(root, "packages/react");
	for (const name of ["src", "tsconfig.json"]) cpSync(join(source, name), join(dir, name), { recursive: true });
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
			private: true,
			type: "module",
			dependencies: {
				preact: process.argv[2] ?? "latest",
				"preact-render-to-string": "latest",
				"@preact/preset-vite": "latest",
				"vitest-browser-react": installed("vitest-browser-react").version,
				"@vitest/browser-playwright": installed("@vitest/browser-playwright").version,
				playwright: installed("playwright").version,
				"axe-core": installed("axe-core").version,
				"@stepperize/core": "file:./core",
				vitest: installed("vitest").version,
				vite: installed("vite").version,
			},
		}),
	);
	// The React package's own Vitest config, with Preact's Vite preset in place of the React plugin for JSX.
	writeFileSync(
		join(dir, "vite.config.ts"),
		readFileSync(join(source, "vite.config.ts"), "utf8")
			.replace('import react from "@vitejs/plugin-react";', 'import preact from "@preact/preset-vite";')
			.replace("plugins: [react()]", "plugins: [preact({ reactAliasesEnabled: false })]"),
	);
	// `--legacy-peer-deps`: vitest-browser-react declares React as a peer, which is the thing being replaced.
	execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--legacy-peer-deps"], {
		cwd: dir,
		stdio: "inherit",
	});
	// `react` and `react-dom` are stand-in packages that re-export `preact/compat`, the same thing the
	// usual bundler alias does. One addition for the test harness only: React exports `act` and
	// `preact/compat` does not (Preact keeps it in `preact/test-utils`), and both the tests and
	// vitest-browser-react take it from "react".
	const standIn = (name, files) => {
		const at = join(dir, "node_modules", name);
		mkdirSync(at, { recursive: true });
		const exports = Object.fromEntries(
			Object.keys(files).map((file) => [file === "index" ? "." : `./${file}`, `./${file}.js`]),
		);
		writeFileSync(join(at, "package.json"), JSON.stringify({ name, version: "0.0.0", type: "module", exports }));
		for (const [file, code] of Object.entries(files)) writeFileSync(join(at, `${file}.js`), code);
	};
	standIn("react", {
		index:
			'import compat from "preact/compat";\nimport { act } from "preact/test-utils";\nexport * from "preact/compat";\nexport { act };\nexport default { ...compat, act };\n',
		"jsx-runtime": 'export * from "preact/jsx-runtime";\n',
		"jsx-dev-runtime": 'export * from "preact/jsx-runtime";\n',
	});
	standIn("react-dom", {
		index: 'export * from "preact/compat";\nexport { default } from "preact/compat";\n',
		client:
			'import * as client from "preact/compat/client";\nexport * from "preact/compat/client";\nexport default client;\n',
		server: 'export * from "preact/compat/server";\n',
	});
	execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", ...process.argv.slice(3)], {
		cwd: dir,
		stdio: "inherit",
	});
} finally {
	rmSync(dir, { recursive: true, force: true });
}
