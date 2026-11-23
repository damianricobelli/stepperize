import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// React and Solid both compile .tsx: Solid only owns the Solid demos, and the
// React plugin and the React Compiler must stay out of them.
const solidFiles = /\/framework-demos\/solid\//;
// The other bindings are linked from the workspace, so Vite sees their built
// files as source. They are not React: keep the React plugins away from them too.
const notReact = [solidFiles, /\/packages\/(vue|svelte|solid|angular)\//];

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
		vue(),
		svelte(),
		solid({ include: solidFiles }),
		viteReact({ exclude: notReact }),
		babel({ presets: [reactCompilerPreset()], exclude: notReact }),
	],
});

export default config;
