import { defineConfig } from "tsup";

export default defineConfig((options) => ({
	entry: ["src/index.ts", "src/headless.ts", "src/primitives/index.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: false,
	clean: !options.watch,
	minify: true,
	treeshake: true,
	splitting: true,
	external: ["@stepperize/core", "react", "react-dom", "react/jsx-runtime"],
	tsconfig: "tsconfig.json",
}));
