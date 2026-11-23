import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const STEPS = '[{ id: "start", title: "Start" }, { id: "finish" }]';

/** Svelte ships its components as source: compile them the way an application's bundler would. */
function sveltePlugin(require, generate) {
	const { compile, compileModule } = require("svelte/compiler");
	return {
		name: "svelte",
		setup(build) {
			build.onLoad({ filter: /\.svelte$/ }, ({ path }) => ({
				contents: compile(readFileSync(path, "utf8"), { generate, dev: false, filename: path }).js.code,
			}));
			build.onLoad({ filter: /\.svelte\.js$/ }, ({ path }) => ({
				contents: compileModule(readFileSync(path, "utf8"), { generate, dev: false, filename: path }).js.code,
			}));
		},
	};
}

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
	{
		name: "solid",
		external: ["solid-js", "solid-js/*"],
		// The package has no JSX, so the same built files render on the server.
		async verify({ definition, full }) {
			// Imported from inside the package, so Node picks the same ES module build of Solid the entry does.
			const dir = `${root}/packages/solid/node_modules/.cache/check-bundle`;
			mkdirSync(dir, { recursive: true });
			writeFileSync(
				`${dir}/solid.mjs`,
				'export { createComponent } from "solid-js";\nexport { renderToString } from "solid-js/web";\n',
			);
			const { createComponent, renderToString } = await import(pathToFileURL(`${dir}/solid.mjs`));
			const Shared = () => definition.useStepperContext().current.id;
			assert.match(
				renderToString(() =>
					createComponent(definition.Provider, {
						get children() {
							return createComponent(Shared, {});
						},
					}),
				),
				/start/,
			);
			if (!full) return;
			const { Stepper } = definition;
			assert.match(
				renderToString(() =>
					createComponent(Stepper.Root, {
						get children() {
							return createComponent(Stepper.Item, {
								step: "start",
								get children() {
									return createComponent(Stepper.Trigger, { children: "Start" });
								},
							});
						},
					}),
				),
				/stepper-trigger/,
			);
		},
	},
	{
		name: "svelte",
		external: ["svelte", "svelte/*"],
		conditions: ["svelte", "browser", "production"],
		plugins: (require) => [sveltePlugin(require, "client")],
		// The built entries are Svelte source, which Node cannot import: render a server build of a page that uses them.
		async verify({ require, esbuild, entry, full }) {
			const dir = `${root}/packages/svelte/node_modules/.cache/check-bundle`;
			mkdirSync(dir, { recursive: true });
			const page = `${dir}/${full ? "full" : "headless"}.svelte`;
			writeFileSync(
				page,
				full
					? `<script>
	import { defineStepper } from ${JSON.stringify(entry)};
	const { Stepper } = defineStepper(${STEPS});
</script>
<Stepper.Root><Stepper.Item step="start"><Stepper.Trigger>Start</Stepper.Trigger></Stepper.Item></Stepper.Root>`
					: `<script>
	import { defineStepper } from ${JSON.stringify(entry)};
	const definition = defineStepper(${STEPS});
	const stepper = definition.useStepper();
</script>
<span>{stepper.current.id}{"Stepper" in definition}</span>`,
			);
			const outfile = page.replace(".svelte", ".mjs");
			await esbuild.build({
				entryPoints: [page],
				bundle: true,
				outfile,
				format: "esm",
				platform: "node",
				external: ["svelte", "svelte/*"],
				conditions: ["svelte", "production"],
				plugins: [sveltePlugin(require, "server")],
				logLevel: "silent",
			});
			const { render } = await import(pathToFileURL(require.resolve("svelte/server")));
			const { body } = render((await import(`${pathToFileURL(outfile)}?${Date.now()}`)).default);
			assert.match(body, full ? /stepper-trigger/ : /startfalse/);
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
			conditions: binding.conditions,
			plugins: binding.plugins?.(require),
			legalComments: "none",
			logLevel: "error",
			metafile: true,
			define: { "process.env.NODE_ENV": '"production"' },
		});
		const code = result.outputFiles[0].contents;
		bundles.push({ entry: name, minified: code.length, gzip: gzipSync(code, { level: 9 }).length });
		if (!full)
			assert(!result.outputFiles[0].text.includes("stepper-trigger"), "Visual primitives leaked into headless");
		let definition;
		if (!binding.plugins) {
			const { defineStepper } = await import(pathToFileURL(entry));
			definition = defineStepper([{ id: "start", title: "Start" }, { id: "finish" }]);
			assert.equal("Stepper" in definition, full, `${name}: only the full entry has primitives`);
		}
		await binding.verify({
			require,
			esbuild,
			entry,
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
// The framework-less binding lives in core: its own entry, so the state machine stays free of DOM code.
{
	const require = createRequire(`${root}/packages/core/package.json`);
	const esbuild = createRequire(require.resolve("tsup"))("esbuild");
	const bundle = async (name) => {
		const result = await esbuild.build({
			entryPoints: [require.resolve(name)],
			bundle: true,
			write: false,
			minify: true,
			format: "esm",
			platform: "browser",
			target: "es2022",
			legalComments: "none",
			logLevel: "error",
			define: { "process.env.NODE_ENV": '"production"' },
		});
		return result.outputFiles[0];
	};
	const main = await bundle("@stepperize/core");
	assert(!/querySelector|ownerDocument|MutationObserver/.test(main.text), "DOM code leaked into the main core entry");
	const dom = await bundle("@stepperize/core/dom");
	const { bindStepper } = await import(pathToFileURL(require.resolve("@stepperize/core/dom")));
	assert.equal(typeof bindStepper, "function", "The DOM entry must be importable without a DOM");
	for (const [entry, file] of [
		["@stepperize/core", main],
		["@stepperize/core/dom", dom],
	]) {
		const gzip = gzipSync(file.contents, { level: 9 }).length;
		rows.push({
			Entry: entry,
			"Minified bytes": file.contents.length,
			"Gzip bytes": gzip,
			"Gzip KiB": (gzip / 1024).toFixed(2),
			"vs full": entry.endsWith("/dom") ? "bindStepper, without the flow" : "the state machine",
		});
	}
}
console.log("\nBuilt public entries + core · framework external · ES2022 · minified · gzip level 9\n");
// biome-ignore lint/suspicious/noConsole: This is the user-facing bundle report.
console.table(rows);
console.log("✓ Public exports, shared chunks, SSR and headless size budget verified.\n");
