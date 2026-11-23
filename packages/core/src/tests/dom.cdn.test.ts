import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { expect, it } from "vitest";

type Esbuild = {
	build: (options: Record<string, unknown>) => Promise<{ outputFiles: { text: string }[] }>;
};
/** esbuild, as tsup runs it to build the package. */
const esbuild = createRequire(createRequire(import.meta.url).resolve("tsup"))("esbuild") as Esbuild;

it("works from a CDN that serves the files untouched, where the page has no `process`", {
	timeout: 30_000,
}, async () => {
	// Bundled the way the package is built: `process.env.NODE_ENV` is left in place, as in the published files.
	const { outputFiles } = await esbuild.build({
		stdin: {
			contents: `
import { createStepper } from "./stepper";
import { bindStepper } from "./dom";
const flow = createStepper([{ id: "a" }, { id: "b" }]);
bindStepper(document.getElementById("signup"), flow);
document.querySelector('[data-component="stepper-next"]').click();
setTimeout(() => {
	window.result = {
		process: typeof globalThis.process,
		role: document.querySelector('[data-component="stepper-trigger"]').getAttribute("role"),
		current: flow.current.id,
	};
});`,
			resolveDir: fileURLToPath(new URL("..", import.meta.url)),
			loader: "js",
		},
		bundle: true,
		format: "esm",
		// "browser" would define `process.env.NODE_ENV`; tsup leaves it in place.
		platform: "neutral",
		write: false,
		logLevel: "silent",
	});
	expect(outputFiles[0].text).toContain("process.env.NODE_ENV");
	const browser = await chromium.launch({ executablePath: process.env.STEPPERIZE_CHROMIUM_PATH });
	try {
		const page = await browser.newPage();
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("console", (message) => {
			if (message.type() === "error") errors.push(message.text());
		});
		// A trigger without a name: the development check is what would read `process`.
		await page.setContent(`
<div data-component="stepper" id="signup">
	<ol data-component="stepper-list">
		<li data-component="stepper-item" data-step="a"><button data-component="stepper-trigger"></button></li>
		<li data-component="stepper-item" data-step="b"><button data-component="stepper-trigger">B</button></li>
	</ol>
	<div data-component="stepper-content" data-step="a">A</div>
	<div data-component="stepper-content" data-step="b">B</div>
	<button data-component="stepper-next">Continue</button>
</div>`);
		// A module script, as a page loads the files from a CDN.
		await page.addScriptTag({ type: "module", content: outputFiles[0].text });
		const result = await page
			.waitForFunction(() => (window as { result?: unknown }).result, undefined, { timeout: 10_000 })
			.then((handle) => handle.jsonValue())
			.catch(() => errors);
		expect(result).toEqual({ process: "undefined", role: "tab", current: "b" });
		expect(errors).toEqual([]);
	} finally {
		await browser.close();
	}
});
