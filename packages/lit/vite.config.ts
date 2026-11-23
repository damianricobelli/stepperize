import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
					},
				},
			},
		],
	},
});
