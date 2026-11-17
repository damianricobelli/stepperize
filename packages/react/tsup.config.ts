import { readdir, readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "tsup";

const DIRECTIVE = '"use client";';

export default defineConfig((options) => ({
	entry: ["src/index.ts", "src/headless.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: false,
	clean: !options.watch,
	minify: true,
	treeshake: true,
	splitting: true,
	external: ["@stepperize/core", "react", "react-dom", "react/jsx-runtime"],
	tsconfig: "tsconfig.json",
	// Everything here uses context or hooks: mark the output for React Server Components bundlers.
	// Tree-shaking drops a `banner`, so the directive is written once the files exist.
	async onSuccess() {
		for (const file of await readdir("dist")) {
			if (!file.endsWith(".js")) continue;
			const code = await readFile(`dist/${file}`, "utf8");
			if (!code.startsWith(DIRECTIVE)) await writeFile(`dist/${file}`, DIRECTIVE + code);
		}
	},
}));
