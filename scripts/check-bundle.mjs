import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const requireReact = createRequire(`${root}/packages/react/package.json`);
const esbuild = createRequire(requireReact.resolve("tsup"))("esbuild");
const entries = ["@stepperize/react", "@stepperize/react/headless"];
const bundles = [];
for (const name of entries) {
	// Resolve the public exports to built files, including their shared chunks.
	const entry = requireReact.resolve(name);
	const result = await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		write: false,
		minify: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		jsx: "automatic",
		external: ["react", "react/*"],
		legalComments: "none",
		metafile: true,
		define: { "process.env.NODE_ENV": '"production"' },
	});
	const code = result.outputFiles[0].contents;
	bundles.push({ entry: name, minified: code.length, gzip: gzipSync(code, { level: 9 }).length });
	if (name.endsWith("/headless")) {
		const output = Object.values(result.metafile.outputs)[0];
		assert(
			!output.imports.some((entry) => entry.path === "react/jsx-runtime"),
			"Headless must not pull in JSX primitives",
		);
		assert(!result.outputFiles[0].text.includes("stepper-trigger"), "Visual primitives leaked into headless");
	}
	const { defineStepper } = await import(pathToFileURL(entry));
	const flow = defineStepper([{ id: "start", title: "Start" }, { id: "finish" }]);
	const React = requireReact("react");
	const { renderToString } = requireReact("react-dom/server");
	function Shared() {
		return React.createElement("span", null, flow.useStepperContext().id);
	}
	assert.match(renderToString(React.createElement(flow.Provider, null, React.createElement(Shared))), /start/);
	if (name.endsWith("/headless")) assert(!("Stepper" in flow));
	else
		assert.match(
			renderToString(
				React.createElement(
					flow.Stepper.Root,
					null,
					React.createElement(
						flow.Stepper.Item,
						{ step: "start" },
						React.createElement(flow.Stepper.Trigger, null, "Start"),
					),
				),
			),
			/stepper-trigger/,
		);
}
assert(bundles[1].gzip < bundles[0].gzip * 0.8, "Headless should save at least 20% gzip against the full entry");
console.log("\nBuilt public entries + core · React external · ES2022 · minified · gzip level 9\n");
// biome-ignore lint/suspicious/noConsole: This is the user-facing bundle report.
console.table(
	bundles.map((bundle) => ({
		Entry: bundle.entry,
		"Minified bytes": bundle.minified,
		"Gzip bytes": bundle.gzip,
		"Gzip KiB": (bundle.gzip / 1024).toFixed(2),
		"vs full": bundle === bundles[0] ? "baseline" : `✓ −${((1 - bundle.gzip / bundles[0].gzip) * 100).toFixed(1)}%`,
	})),
);
console.log("✓ Public exports, shared chunks, SSR and headless size budget verified.\n");
