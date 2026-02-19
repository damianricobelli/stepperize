import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: "terser",
  treeshake: true,
  splitting: true,
  external: ["react", "react-dom"],
  tsconfig: "tsconfig.json",
  terserOptions: {
    compress: {
      drop_console: true,
      pure_funcs: ["console.info", "console.debug"],
    },
    mangle: true,
  },
});
