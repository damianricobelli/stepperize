import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
		// The Blocks `highlightCode` server fn highlights with Shiki's JS regex
		// engine only. fumadocs-core/highlight still statically references the WASM
		// oniguruma engine (`shiki/wasm`), which the SSR bundler can't inline. That
		// path is dead code for us, so alias it to a no-op stub.
		alias: [
			{
				find: "tslib",
				replacement: "tslib/tslib.es6.mjs",
			},
			{
				find: "shiki/wasm",
				replacement: fileURLToPath(
					new URL("./src/lib/shiki-wasm-stub.ts", import.meta.url),
				),
			},
		],
	},
	ssr: {
		noExternal: ["tslib"],
	},
	plugins: [
		mdx(),
		devtools(),
		nitro(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
});

export default config;
