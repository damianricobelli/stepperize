import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// A separate install ensures React, React DOM and vitest-browser-react resolve the
// same React version. The docs app keeps its own React 19 dependency untouched.
const root = fileURLToPath(new URL("../", import.meta.url));
const installed = (name) =>
	JSON.parse(readFileSync(join(root, "packages/react/node_modules", name, "package.json"), "utf8"));
const versions = {
	18: { react: "18.3.1", types: "18.3.28", domTypes: "18.3.7" },
	19: {
		react: installed("react").version,
		types: installed("@types/react").version,
		domTypes: installed("@types/react-dom").version,
	},
};
const version = versions[process.argv[2]];
if (!version) throw new Error("Usage: node scripts/test-react-compat.mjs <18|19>");
const dir = mkdtempSync(join(tmpdir(), "stepperize-react-compat-"));
try {
	const source = join(root, "packages/react");
	for (const name of ["src", "tsconfig.json", "tsconfig.test.json", "vite.config.ts"]) {
		cpSync(join(source, name), join(dir, name), { recursive: true });
	}
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
				react: version.react,
				"react-dom": version.react,
				"@types/react": version.types,
				"@types/react-dom": version.domTypes,
				"vitest-browser-react": installed("vitest-browser-react").version,
				"@vitest/browser-playwright": installed("@vitest/browser-playwright").version,
				playwright: installed("playwright").version,
				"@vitejs/plugin-react": installed("@vitejs/plugin-react").version,
				"@stepperize/core": "file:./core",
				vitest: installed("vitest").version,
				vite: installed("vite").version,
				typescript: installed("@typescript/native").version,
			},
		}),
	);
	execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: dir, stdio: "inherit" });
	for (const args of [
		["node_modules/typescript/bin/tsc", "--noEmit"],
		["node_modules/typescript/bin/tsc", "-p", "tsconfig.test.json"],
		["node_modules/vitest/vitest.mjs", "run"],
	])
		execFileSync(process.execPath, args, { cwd: dir, stdio: "inherit" });
} finally {
	rmSync(dir, { recursive: true, force: true });
}
