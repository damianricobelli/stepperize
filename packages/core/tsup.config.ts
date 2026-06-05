import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  splitting: true,
  tsconfig: "tsconfig.json",
});
