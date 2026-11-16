import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { cpus, platform, release, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { printReport } from "./report.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
// Raw samples stay next to the harness. The v8 documentation keeps its own v7 → v8 numbers.
const output = join(root, "scripts/benchmarks/results.json");
const requireReact = createRequire(join(root, "packages/react/package.json"));
// The docs app installs the published 8.0.1 as `@stepperize/react-v8`: that is the baseline.
const requireBaseline = createRequire(join(root, "apps/docs/package.json"));
const requireTsup = createRequire(requireReact.resolve("tsup"));
const esbuild = requireTsup("esbuild");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const dir = mkdtempSync(join(tmpdir(), "stepperize-benchmark-"));

function sourceFiles(folder) {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === "tests") return [];
		const path = join(folder, entry.name);
		return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(path) ? [path] : [];
	});
}

function packageJson(entry) {
	for (let folder = dirname(entry); folder !== dirname(folder); folder = dirname(folder)) {
		if (existsSync(join(folder, "package.json"))) return JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
	}
	throw new Error(`No package.json above ${entry}`);
}

const common = {
	bundle: true,
	write: false,
	minify: true,
	format: "esm",
	platform: "browser",
	target: "es2022",
	jsx: "automatic",
	external: ["react", "react/*"],
	legalComments: "none",
	define: { "process.env.NODE_ENV": '"production"' },
};

try {
	symlinkSync(realpathSync(join(root, "packages/react/node_modules")), join(dir, "node_modules"));
	const versions = {};
	// Baseline: the published files, with the core they shipped with.
	const published = realpathSync(requireBaseline.resolve("@stepperize/react-v8"));
	// Candidate: the working tree, bundled from source so a stale `dist` cannot be measured by mistake.
	const sources = ["core", "react"].flatMap((pkg) => sourceFiles(join(root, `packages/${pkg}/src`))).sort();
	const tree = createHash("sha256");
	for (const file of sources) tree.update(relative(root, file)).update("\0").update(readFileSync(file)).update("\0");
	const workspace = {
		...common,
		plugins: [
			{
				name: "workspace-core",
				setup(build) {
					build.onResolve({ filter: /^@stepperize\/core$/ }, () => ({
						path: join(root, "packages/core/src/index.ts"),
					}));
				},
			},
		],
	};
	const targets = {
		v8: {
			version: packageJson(published).version,
			source: "npm",
			sourceSha256: sha(readFileSync(published)),
			full: { ...common, entryPoints: [published] },
			headless: { ...common, entryPoints: [realpathSync(requireBaseline.resolve("@stepperize/react-v8/headless"))] },
		},
		v9: {
			version: "9.0.0",
			source: "working tree",
			sourceSha256: tree.digest("hex"),
			full: { ...workspace, entryPoints: [join(root, "packages/react/src/index.ts")] },
			headless: { ...workspace, entryPoints: [join(root, "packages/react/src/headless.ts")] },
		},
	};
	for (const [name, target] of Object.entries(targets)) {
		const code = (await esbuild.build(target.full)).outputFiles[0].contents;
		const headless = (await esbuild.build(target.headless)).outputFiles[0].contents;
		writeFileSync(join(dir, `${name}.mjs`), code);
		versions[name] = {
			version: target.version,
			source: target.source,
			sourceSha256: target.sourceSha256,
			bundleSha256: sha(code),
			minifiedBytes: code.length,
			gzipBytes: gzipSync(code, { level: 9 }).length,
			headlessMinifiedBytes: headless.length,
			headlessGzipBytes: gzipSync(headless, { level: 9 }).length,
		};
	}
	// Bundle React and React DOM once in production; Vitest only orchestrates the test.
	const runtime = await esbuild.build({
		stdin: {
			contents:
				'export { default as React } from "react"; export { createRoot } from "react-dom/client"; export { flushSync } from "react-dom"; export * as v8 from "./v8.mjs"; export * as v9 from "./v9.mjs";',
			resolveDir: dir,
		},
		bundle: true,
		write: false,
		minify: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		define: { "process.env.NODE_ENV": '"production"' },
		legalComments: "none",
	});
	writeFileSync(join(dir, "runtime.mjs"), runtime.outputFiles[0].contents);
	writeFileSync(join(dir, "measure.mjs"), readFileSync(join(root, "scripts/benchmarks/measure.mjs")));
	writeFileSync(
		join(dir, "benchmark.test.mjs"),
		`
  import { test } from "vitest";
  import { commands } from "vitest/browser";
  import * as runtime from "./runtime.mjs";
  import { runBenchmarks } from "./measure.mjs";
  test("production v8/v9 comparison", async () => {
   const results = await runBenchmarks(runtime);
   await commands.saveBenchmark(results);
  }, 600000);
 `,
	);
	writeFileSync(
		join(dir, "vitest.config.mjs"),
		`
  import { defineConfig } from "vitest/config";
  import { playwright } from "@vitest/browser-playwright";
  import { writeFileSync } from "node:fs";
  export default defineConfig({
   root: ${JSON.stringify(dir)},
   server: { headers: { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" } },
   test: {
    include: ["benchmark.test.mjs"], fileParallelism: false,
    browser: {
     enabled: true, headless: true, instances: [{ browser: "chromium" }],
     provider: playwright({ launchOptions: { executablePath: process.env.STEPPERIZE_CHROMIUM_PATH, args: ["--js-flags=--expose-gc"] } }),
     commands: { saveBenchmark({ context }, results) {
      // Fixed output path: browser input cannot select arbitrary files.
      writeFileSync(${JSON.stringify(join(dir, "samples.json"))}, JSON.stringify({ ...results, browser: context.browser().version() }));
     } }
    }
   }
  });
 `,
	);
	execFileSync(
		process.execPath,
		[
			join(dirname(requireReact.resolve("vitest/package.json")), "vitest.mjs"),
			"run",
			"--config",
			join(dir, "vitest.config.mjs"),
		],
		{ cwd: dir, stdio: "inherit", timeout: 660000 },
	);
	const { browser, ...samples } = JSON.parse(readFileSync(join(dir, "samples.json"), "utf8"));
	const result = {
		schemaVersion: 3,
		measuredAt: new Date().toISOString(),
		environment: {
			node: process.version,
			react: requireReact("react/package.json").version,
			reactDom: requireReact("react-dom/package.json").version,
			browser: `Chromium ${browser}`,
			vitest: requireReact("vitest/package.json").version,
			playwright: requireReact("playwright/package.json").version,
			runtimeBundleSha256: sha(runtime.outputFiles[0].contents),
			esbuild: esbuild.version,
			os: `${platform()} ${release()}`,
			arch: process.arch,
			cpu: cpus()[0]?.model,
			mode: "production",
			lockfileSha256: sha(readFileSync(join(root, "pnpm-lock.yaml"))),
		},
		harnessSha256: sha(
			readFileSync(fileURLToPath(import.meta.url)) + readFileSync(join(root, "scripts/benchmarks/measure.mjs")),
		),
		versions,
		...samples,
	};
	writeFileSync(output, `${JSON.stringify(result, null, "\t")}\n`);
	printReport(result);
	console.log(`\nRaw samples: ${relative(root, output)}\n`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
