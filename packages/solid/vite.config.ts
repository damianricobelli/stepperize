import { playwright } from "@vitest/browser-playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

/** Renders a hydration fixture (an export of `fixtures.tsx`) with the server build of Solid. */
const renderOnServer: BrowserCommand<[name: string]> = async ({ project }, name) => {
	const { renderToString, generateHydrationScript } = await project.vite.ssrLoadModule("solid-js/web");
	const fixtures = await project.vite.ssrLoadModule("/src/tests/fixtures.tsx");
	return { html: renderToString(fixtures[name]) as string, script: generateHydrationScript() as string };
};

export default defineConfig({
	// Hydratable output, so the same test files can render and hydrate.
	plugins: [solid({ ssr: true })],
	test: {
		projects: [
			{ extends: true, test: { name: "server", environment: "node", include: ["src/tests/server.test.tsx"] } },
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/tests/**/*.test.tsx"],
					exclude: ["src/tests/server.test.tsx"],
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
