import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: "terser",
  treeshake: true,
  splitting: true,
  tsconfig: "tsconfig.json",
  terserOptions: {
    compress: {
      module: true,
      passes: 3,
      pure_getters: true,
      drop_console: true,
      pure_funcs: ["console.info", "console.debug"],
    },
    mangle: {
      toplevel: true,
    },
  },
});
