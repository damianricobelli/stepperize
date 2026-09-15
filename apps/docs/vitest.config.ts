import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
	test: {
		watch: false,
		projects: [
			{
				extends: true,
				test: { name: "node", environment: "node", include: ["src/**/*.test.ts"], fileParallelism: false },
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/**/*.test.tsx"],
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
