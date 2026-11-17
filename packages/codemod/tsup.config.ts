import { defineConfig } from "tsup";

export default defineConfig((options) => ({
	entry: ["src/index.ts", "src/cli.ts"],
	format: ["esm"],
	dts: { entry: "src/index.ts" },
	sourcemap: false,
	clean: !options.watch,
	target: "node18",
	tsconfig: "tsconfig.json",
}));
