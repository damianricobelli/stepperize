import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));

/**
 * One entry per binding: what its bundler leaves external, and a server render
 * of the shared flow and of the primitives through the built public entries.
 */
const bindings = [
	{
		name: "react",
		external: ["react", "react/*"],
		async verify({ require, definition, full, output }) {
			const React = require("react");
			const { renderToString } = require("react-dom/server");
			function Shared() {
				return React.createElement("span", null, definition.useStepperContext().current.id);
			}
			assert.match(
				renderToString(React.createElement(definition.Provider, null, React.createElement(Shared))),
				/start/,
			);
			if (!full) {
				assert(
					!output.imports.some((entry) => entry.path === "react/jsx-runtime"),
					"Headless must not pull in JSX primitives",
				);
				return;
			}
			const { Stepper } = definition;
			assert.match(
				renderToString(
					React.createElement(
						Stepper.Root,
						null,
						React.createElement(Stepper.Item, { step: "start" }, React.createElement(Stepper.Trigger, null, "Start")),
					),
				),
				/stepper-trigger/,
			);
		},
	},
	{
		name: "vue",
		external: ["vue", "vue/*", "@vue/*"],
		async verify({ require, definition, full }) {
			const { createSSRApp, defineComponent, h } = await import(pathToFileURL(require.resolve("vue")));
			const { renderToString } = await import(pathToFileURL(require.resolve("vue/server-renderer")));
			const Shared = defineComponent({
				setup() {
					const stepper = definition.useStepperContext();
					return () => h("span", stepper.current.id);
				},
			});
			assert.match(await renderToString(createSSRApp(() => h(definition.Provider, null, () => h(Shared)))), /start/);
			if (!full) return;
			const { Stepper } = definition;
			assert.match(
				await renderToString(
					createSSRApp(() =>
						h(Stepper.Root, null, () =>
							h(Stepper.Item, { step: "start" }, () => h(Stepper.Trigger, null, () => "Start")),
						),
					),
				),
				/stepper-trigger/,
			);
		},
	},
];

const rows = [];
for (const binding of bindings) {
	const require = createRequire(`${root}/packages/${binding.name}/package.json`);
	const esbuild = createRequire(require.resolve("tsup"))("esbuild");
	const bundles = [];
	for (const name of [`@stepperize/${binding.name}`, `@stepperize/${binding.name}/headless`]) {
		const full = !name.endsWith("/headless");
		// Resolve the public exports to built files, including their shared chunks.
		const entry = require.resolve(name);
		const result = await esbuild.build({
			entryPoints: [entry],
			bundle: true,
			write: false,
			minify: true,
			format: "esm",
			platform: "browser",
			target: "es2022",
			jsx: "automatic",
			external: binding.external,
			legalComments: "none",
			metafile: true,
			define: { "process.env.NODE_ENV": '"production"' },
		});
		const code = result.outputFiles[0].contents;
		bundles.push({ entry: name, minified: code.length, gzip: gzipSync(code, { level: 9 }).length });
		if (!full)
			assert(!result.outputFiles[0].text.includes("stepper-trigger"), "Visual primitives leaked into headless");
		const { defineStepper } = await import(pathToFileURL(entry));
		const definition = defineStepper([{ id: "start", title: "Start" }, { id: "finish" }]);
		assert.equal("Stepper" in definition, full, `${name}: only the full entry has primitives`);
		await binding.verify({
			require,
			definition,
			full,
			output: Object.values(result.metafile.outputs)[0],
		});
	}
	assert(
		bundles[1].gzip < bundles[0].gzip * 0.8,
		`${binding.name}: headless should save at least 20% gzip against the full entry`,
	);
	for (const bundle of bundles) {
		rows.push({
			Entry: bundle.entry,
			"Minified bytes": bundle.minified,
			"Gzip bytes": bundle.gzip,
			"Gzip KiB": (bundle.gzip / 1024).toFixed(2),
			"vs full": bundle === bundles[0] ? "baseline" : `✓ −${((1 - bundle.gzip / bundles[0].gzip) * 100).toFixed(1)}%`,
		});
	}
}
console.log("\nBuilt public entries + core · framework external · ES2022 · minified · gzip level 9\n");
// biome-ignore lint/suspicious/noConsole: This is the user-facing bundle report.
console.table(rows);
console.log("✓ Public exports, shared chunks, SSR and headless size budget verified.\n");
