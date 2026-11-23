import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

/** Renders the element the server guide recommends with Lit's server renderer, for the hydration test. */
const renderOnServer: BrowserCommand<[]> = async ({ project }) => {
	const { render } = await project.vite.ssrLoadModule("@lit-labs/ssr");
	const { collectResultSync } = await project.vite.ssrLoadModule("@lit-labs/ssr/lib/render-result.js");
	const { html } = await project.vite.ssrLoadModule("lit");
	await project.vite.ssrLoadModule("/src/tests/elements.ts");
	return collectResultSync(render(html`<sz-served></sz-served>`)) as string;
};

/**
 * The client half of Lit's server rendering is a dependency of `@lit-labs/ssr`: resolve it from
 * there, with the package's own exports, so the development build pairs with Lit's.
 */
const ssr = realpathSync(fileURLToPath(new URL("./node_modules/@lit-labs/ssr/package.json", import.meta.url)));
const ssrClient: Plugin = {
	name: "ssr-client",
	resolveId(id) {
		if (id.startsWith("@lit-labs/ssr-client/")) return this.resolve(id, ssr, { skipSelf: true });
	},
};

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "server",
					environment: "node",
					include: ["src/tests/server.test.ts", "src/tests/exports.test.ts"],
				},
			},
			{
				extends: true,
				plugins: [ssrClient],
				test: {
					name: "browser",
					include: ["src/tests/**/*.test.ts"],
					exclude: ["src/tests/server.test.ts", "src/tests/exports.test.ts"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({
							actionTimeout: 5000,
							launchOptions: { executablePath: process.env.STEPPERIZE_CHROMIUM_PATH },
						}),
						instances: [{ browser: "chromium" }],
						commands: { renderOnServer },
					},
				},
			},
		],
	},
});
