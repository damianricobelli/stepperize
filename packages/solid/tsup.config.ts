import { defineConfig } from "tsup";

// No JSX in the source: the primitives are built with `Dynamic`, so one build
// serves the browser, the server and hydration without a Solid compiler step.
export default defineConfig((options) => ({
	entry: ["src/index.ts", "src/headless.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: false,
	clean: !options.watch,
	minify: true,
	treeshake: true,
	splitting: true,
	external: ["@stepperize/core", "solid-js", "solid-js/web"],
	tsconfig: "tsconfig.json",
}));
