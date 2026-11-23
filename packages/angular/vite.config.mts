import { fileURLToPath } from "node:url";
import angular from "@analogjs/vite-plugin-angular";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	plugins: [angular({ tsconfig: source("./tsconfig.test.json") })],
	resolve: {
		// The tests run against the source, as the secondary entry point imports it by package name.
		alias: [
			{ find: /^@stepperize\/angular\/headless$/, replacement: source("./headless/src/public-api.ts") },
			{ find: /^@stepperize\/angular$/, replacement: source("./src/public-api.ts") },
		],
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "server",
					environment: "node",
					include: ["tests/server.test.ts"],
					setupFiles: ["tests/compiler.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/server.test.ts"],
					setupFiles: ["tests/setup.ts"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({
							actionTimeout: 5000,
							launchOptions: { executablePath: process.env.STEPPERIZE_CHROMIUM_PATH },
						}),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
