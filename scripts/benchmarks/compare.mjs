import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdirSync,
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
const baseline = "f1b5bfafa5d585de47f6c70eeeb355b76b20ff24";
const output = join(root, "apps/docs/public/benchmarks/v7-v8.json");
const requireReact = createRequire(join(root, "packages/react/package.json"));
const requireTsup = createRequire(requireReact.resolve("tsup"));
const esbuild = requireTsup("esbuild");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const dir = mkdtempSync(join(tmpdir(), "stepperize-benchmark-"));

function sourceFiles(folder) {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === "tests") return [];
		const path = join(folder, entry.name);
		return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(path) ? [path] : [];
	});
}

try {
	symlinkSync(realpathSync(join(root, "packages/react/node_modules")), join(dir, "node_modules"));
	const versions = {};
	let headless;
	for (const version of ["v7", "v8"]) {
		const snapshot = join(dir, version);
		const files =
			version === "v7"
				? git("ls-tree", "-r", "--name-only", baseline, "packages/core/src", "packages/react/src")
						.split("\n")
						.filter((path) => !path.includes("/tests/") && /\.(ts|tsx)$/.test(path))
				: ["core", "react"].flatMap((pkg) =>
						sourceFiles(join(root, `packages/${pkg}/src`)).map((path) => relative(root, path)),
					);
		const hash = createHash("sha256");
		for (const file of files.sort()) {
			const contents =
				version === "v7"
					? execFileSync("git", ["show", `${baseline}:${file}`], { cwd: root })
					: readFileSync(join(root, file));
			hash.update(file).update("\0").update(contents).update("\0");
			const destination = join(snapshot, file);
			mkdirSync(dirname(destination), { recursive: true });
			writeFileSync(destination, contents);
		}
		const buildOptions = {
			entryPoints: [join(snapshot, "packages/react/src/index.ts")],
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
			plugins: [
				{
					name: "matching-core",
					setup(build) {
						build.onResolve({ filter: /^@stepperize\/core$/ }, () => ({
							path: join(snapshot, "packages/core/src/index.ts"),
						}));
					},
				},
			],
		};
		const bundle = await esbuild.build(buildOptions);
		const code = bundle.outputFiles[0].contents;
		writeFileSync(join(dir, `${version}.mjs`), code);
		versions[version] = {
			// Compare release targets even before Changesets updates the workspace versions.
			version: version === "v7" ? "7.0.0" : "8.0.0",
			source: version === "v7" ? baseline : "working tree",
			sourceSha256: hash.digest("hex"),
			bundleSha256: sha(code),
			minifiedBytes: code.length,
			gzipBytes: gzipSync(code, { level: 9 }).length,
		};
		if (version === "v8") {
			const lightweight = await esbuild.build({
				...buildOptions,
				entryPoints: [join(snapshot, "packages/react/src/headless.ts")],
			});
			const bytes = lightweight.outputFiles[0].contents;
			headless = {
				minifiedBytes: bytes.length,
				gzipBytes: gzipSync(bytes, { level: 9 }).length,
				bundleSha256: sha(bytes),
			};
		}
	}
	// Bundle React and React DOM once in production; Vitest only orchestrates the test.
	const runtime = await esbuild.build({
		stdin: {
			contents:
				'export { default as React } from "react"; export { createRoot } from "react-dom/client"; export { flushSync } from "react-dom"; export * as v7 from "./v7.mjs"; export * as v8 from "./v8.mjs";',
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
  test("production v7/v8 comparison", async () => {
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
		schemaVersion: 2,
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
		headless,
		...samples,
	};
	mkdirSync(dirname(output), { recursive: true });
	writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
	const summary = {
		...result,
		scenarios: result.scenarios.map((scenario) => ({
			...scenario,
			v7: { ...scenario.v7, samples: undefined },
			v8: { ...scenario.v8, samples: undefined },
		})),
	};
	writeFileSync(join(root, "apps/docs/src/lib/benchmark-results.json"), `${JSON.stringify(summary, null, 2)}\n`);
	printReport(result);
	console.log(`\nRaw samples: ${relative(root, output)}\n`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
