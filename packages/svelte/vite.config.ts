import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
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

/**
 * Runs `svelte-check` on the markup that must not compile (`src/tests/markup`), for the
 * markup type test: TypeScript's `@ts-expect-error` does not reach Svelte markup.
 */
const svelteCheck: BrowserCommand<[]> = async ({ project }) => {
	const root = project.config.root;
	const { stdout } = await promisify(execFile)(
		`${root}/node_modules/.bin/svelte-check`,
		["--tsconfig", "./src/tests/markup/tsconfig.json", "--output", "machine"],
		{ cwd: root },
	).catch((failure: { stdout: string }) => failure);
	const errors = stdout
		.split("\n")
		.map((line) => /^\d+ ERROR "(.+?)" (\d+):\d+ "(.*)"$/.exec(line))
		.filter((match) => match !== null)
		.map(([, file, line, message]) => ({ file, line: Number(line), message: JSON.parse(`"${message}"`) as string }));
	return { errors, source: readFileSync(`${root}/src/tests/markup/Wrong.svelte`, "utf8") };
};

export default defineConfig({
	plugins: [svelte()],
	test: {
		projects: [
			{
				extends: true,
				test: { name: "server", environment: "node", include: ["src/tests/server.test.ts"] },
			},
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
						commands: { renderOnServer, svelteCheck },
					},
				},
			},
		],
	},
});
