import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

/** Renders a test scenario with the server build of Svelte, for the hydration test. */
const renderOnServer: BrowserCommand<[props: Record<string, unknown>]> = async ({ project }, props) => {
	const { render } = await project.vite.ssrLoadModule("svelte/server");
	const { default: Scenario } = await project.vite.ssrLoadModule("/src/tests/fixtures/Scenario.svelte");
	return render(Scenario, { props }).body as string;
};

export default defineConfig({
	plugins: [svelte()],
	test: {
		projects: [
			{ extends: true, test: { name: "server", environment: "node", include: ["src/tests/server.test.ts"] } },
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/tests/**/*.test.ts"],
					exclude: ["src/tests/server.test.ts"],
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
