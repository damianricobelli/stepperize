import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	dts: true,
	sourcemap: false,
	clean: true,
	minify: true,
	treeshake: true,
	tsconfig: "tsconfig.json",
});
