import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dynamic } from "fumadocs-mdx/runtime/dynamic";
import { describe, expect, it } from "vitest";
import * as config from "../../../source.config";
import { toPlainMarkdown } from "../llms-markdown";
import { editableSource } from "./editable-source";
import {
	codeFrameworks,
	frameworkOnlyApplies,
	pageFramework,
	pickSamples,
	remarkFrameworkContent,
	resolveFrameworkLink,
} from "./remark-framework-content";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const docs = `${root}content/docs`;

describe("framework content", () => {
	it("reads the framework of a page from its path", () => {
		expect(
			pageFramework("/site/content/docs/docs/v9/vue/concepts/moves.mdx"),
		).toEqual({
			docs: "/site/content/docs/docs",
			version: "v9",
			framework: "vue",
		});
		expect(pageFramework("/site/content/docs/docs/v8/guides/forms.mdx")).toBe(
			undefined,
		);
		expect(pageFramework("/site/content/shared/concepts/moves.mdx")).toBe(
			undefined,
		);
	});

	it("reads the frameworks of a code block and keeps the rest of its meta", () => {
		expect(codeFrameworks('framework="react solid" title="App.tsx"')).toEqual({
			frameworks: ["react", "solid"],
			meta: 'title="App.tsx"',
		});
		expect(codeFrameworks('title="a.ts" framework="vue"')).toEqual({
			frameworks: ["vue"],
			meta: 'title="a.ts"',
		});
		expect(codeFrameworks("title=x")).toEqual({
			frameworks: [],
			meta: "title=x",
		});
		expect(codeFrameworks(null)).toEqual({ frameworks: [], meta: undefined });
	});

	it("picks a framework's own samples, else the core ones", () => {
		const samples = [
			{ frameworks: ["react", "solid"], id: 1 },
			{ frameworks: ["vue"], id: 2 },
			{ frameworks: ["vue"], id: 3 },
			{ frameworks: ["core"], id: 4 },
		];
		expect(pickSamples(samples, "solid")?.map((s) => s.id)).toEqual([1]);
		expect(pickSamples(samples, "vue")?.map((s) => s.id)).toEqual([2, 3]);
		expect(pickSamples(samples, "html")?.map((s) => s.id)).toEqual([4]);
		expect(pickSamples(samples.slice(0, 3), "html")).toBe(undefined);
	});

	it("edits a thin page in the shared file it includes", () => {
		expect(
			editableSource(
				"docs/v9/vue/concepts/moves.mdx",
				"---\ntitle: x\n---\n\n<include cwd>content/shared/concepts/moves.mdx</include>\n",
			),
		).toBe("content/shared/concepts/moves.mdx");
		expect(editableSource("docs/v9/vue/index.mdx", "# Vue")).toBe(
			"content/docs/docs/v9/vue/index.mdx",
		);
	});

	it("keeps or drops prose for a framework", () => {
		expect(frameworkOnlyApplies({ is: "angular lit" }, "lit")).toBe(true);
		expect(frameworkOnlyApplies({ is: "angular lit" }, "vue")).toBe(false);
		expect(frameworkOnlyApplies({ not: "html core" }, "core")).toBe(false);
		expect(frameworkOnlyApplies({ not: "html core" }, "react")).toBe(true);
	});

	it("links to the framework's page, or React's while it has none", () => {
		const pages = [
			"v9/vue/guides/forms",
			"v9/react/guides/forms",
			"v9/react/guides/branching",
		];
		const exists = (version: string, framework: string, path: string) =>
			pages.includes(`${version}/${framework}/${path}`);
		expect(
			resolveFrameworkLink("/docs/v9/:framework/guides/forms#x", "vue", exists),
		).toBe("/docs/v9/vue/guides/forms#x");
		expect(
			resolveFrameworkLink(
				"/docs/v9/:framework/guides/branching",
				"vue",
				exists,
			),
		).toBe("/docs/v9/react/guides/branching");
		expect(
			resolveFrameworkLink("/docs/v9/:framework/nowhere", "vue", exists),
		).toBe(undefined);
		expect(resolveFrameworkLink("/docs/v9/core/errors", "vue", exists)).toBe(
			"/docs/v9/core/errors",
		);
	});
});

/** The pages that include a shared file, by the shared file. */
function sharedPages(): Map<string, { path: string; framework: string }[]> {
	const out = new Map<string, { path: string; framework: string }[]>();
	for (const file of readdirSync(`${docs}/docs/v9`, { recursive: true })) {
		const path = `docs/v9/${String(file)}`;
		if (!path.endsWith(".mdx")) continue;
		const text = readFileSync(`${docs}/${path}`, "utf8");
		for (const [, shared] of text.matchAll(
			/<include cwd>(content\/shared\/[^<]+)<\/include>/g,
		)) {
			const framework = path.split("/")[2];
			out.set(shared, [...(out.get(shared) ?? []), { path, framework }]);
		}
	}
	return out;
}

/** The code blocks of `<FrameworkCode>` in a shared file, as written. */
function frameworkSamples(text: string) {
	const samples: { frameworks: string[]; value: string }[] = [];
	for (const [, meta, value] of text.matchAll(
		/^```\w*[ \t]+([^\n]*framework=[^\n]*)\n([\s\S]*?)\n```$/gm,
	)) {
		samples.push({ frameworks: codeFrameworks(meta).frameworks, value });
	}
	return samples;
}

describe("shared concept pages", async () => {
	const pages = sharedPages();
	const compiler = await dynamic(config, {
		environment: "dynamic",
		configPath: "source.config.ts",
		outDir: ".source",
	});

	it("are included by every framework that lists them", () => {
		expect(
			pages
				.get("content/shared/concepts/steps.mdx")
				?.map((p) => p.framework)
				.sort(),
		).toEqual(["angular", "lit", "react", "solid", "svelte", "vue"]);
	});

	const compile = async (fullPath: string) => {
		const [doc] = await compiler.doc("docs", "content/docs", [
			{ info: { path: fullPath, fullPath }, data: {} },
		]);
		return toPlainMarkdown(await doc.getText("processed"));
	};
	const fixture = (name: string) =>
		fileURLToPath(
			new URL(`./fixtures/docs/v9/html/${name}.mdx`, import.meta.url),
		);

	it("falls back to the core sample, and fails without one", async () => {
		const markdown = await compile(fixture("fallback"));
		expect(markdown).toContain("createStepper");
		expect(markdown).not.toContain("useStepper");
		expect(markdown).toContain("Not for React.");
		expect(markdown).not.toContain("Only React.");
		// The build fails: run on its own, as a failed compile leaves fumadocs-mdx a stray rejection.
		const tree = {
			type: "root",
			children: [
				{
					type: "mdxJsxFlowElement",
					name: "FrameworkCode",
					attributes: [],
					children: [
						{
							type: "code",
							lang: "ts",
							meta: 'framework="vue"',
							value: "vue()",
						},
					],
				},
			],
		};
		const file = {
			path: fixture("missing"),
			fail: (reason: string) => {
				throw new Error(reason);
			},
		};
		expect(() =>
			remarkFrameworkContent()(tree as never, file as never),
		).toThrow(
			/no sample for "html" and no "core" sample to fall back to \(it has: vue\)/,
		);
	});

	for (const [shared, including] of pages) {
		const samples = frameworkSamples(readFileSync(`${root}${shared}`, "utf8"));
		for (const { path, framework } of including) {
			it(`${path}: the prose and only ${framework}'s code`, async () => {
				const [doc] = await compiler.doc("docs", "content/docs", [
					{ info: { path, fullPath: `${docs}/${path}` }, data: {} },
				]);
				const markdown = toPlainMarkdown(await doc.getText("processed"));

				expect(markdown).not.toMatch(
					/<\/?Framework(Code|Only)|framework=|:framework/,
				);
				const own = pickSamples(samples, framework) ?? [];
				for (const sample of own) expect(markdown).toContain(sample.value);
				for (const sample of samples) {
					if (
						own.includes(sample) ||
						own.some((o) => o.value.includes(sample.value))
					)
						continue;
					expect(markdown, sample.value).not.toContain(sample.value);
				}
				// Every link to a current page goes to one that exists: the framework's, or React's.
				for (const [, target] of markdown.matchAll(
					/\/docs\/(v9\/[a-z0-9/-]+)/g,
				)) {
					const [, owner] = target.split("/");
					expect(["core", framework, "react"], target).toContain(owner);
					expect(
						existsSync(`${docs}/docs/${target}.mdx`) ||
							existsSync(`${docs}/docs/${target}/index.mdx`),
						target,
					).toBe(true);
				}
			});
		}
	}
});
