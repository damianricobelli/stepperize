import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
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
					},
				},
			},
		],
	},
});
