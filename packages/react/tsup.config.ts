import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  splitting: true,
  external: ["@stepperize/core", "react", "react-dom", "react/jsx-runtime"],
  tsconfig: "tsconfig.json",
});
