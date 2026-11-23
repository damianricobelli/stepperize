import { defineConfig } from "tsup";

export default defineConfig((options) => ({
	entry: ["src/index.ts", "src/primitives.ts", "src/dom.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: false,
	clean: !options.watch,
	minify: true,
	treeshake: true,
	splitting: true,
	tsconfig: "tsconfig.json",
}));
