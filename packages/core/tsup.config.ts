import { defineConfig } from "tsup";

export default defineConfig((options) => ({
	entry: ["src/index.ts"],
	format: ["esm"],
	// tsup injects baseUrl internally; only its TS6 declaration worker needs this.
	dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
	sourcemap: false,
	clean: !options.watch,
	minify: true,
	treeshake: true,
	splitting: true,
	tsconfig: "tsconfig.json",
}));
