import { defineConfig } from "tsup";

// No JSX in the source: the primitives are built with `Dynamic`, so one build
// serves the browser, the server and hydration without a Solid compiler step.
//
// Not minified. A Solid app always goes through a bundler (its JSX needs the
// compiler), which minifies this code with the rest of the app, so minifying it
// here saves no byte in production. What it would cost is in development: stack
// traces, warnings and "step into" landing in mangled one-letter names. Readable
// ES modules need no source map, so none is shipped.
export default defineConfig((options) => ({
	entry: ["src/index.ts", "src/headless.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: false,
	clean: !options.watch,
	minify: false,
	treeshake: true,
	splitting: true,
	external: ["@stepperize/core", "solid-js", "solid-js/web"],
	tsconfig: "tsconfig.json",
}));
