import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BLOCKS } from "./blocks/catalog.mjs";
import { FRAMEWORKS } from "./frameworks";
import {
	buildFrameworkLlmsFullTxt,
	buildFrameworkLlmsTxt,
	buildLlmsFullTxt,
	buildLlmsTxt,
	demoSourceFile,
	docsTextRequest,
	type FrameworkDocs,
	LLMS_FRAMEWORK_ORDER,
	pageMarkdownHeader,
} from "./llms-index";
import SUMMARY from "./llms-summary.md?raw";
import { docsSitemapPriority } from "./sitemap-urls";

const framework = (id: string) =>
	FRAMEWORKS.find((entry) => entry.id === id) ?? FRAMEWORKS[0];

/** Two pages per framework, the way `llms.ts` reads them from the sidebar. */
const docs: FrameworkDocs[] = LLMS_FRAMEWORK_ORDER.map((id) => ({
	framework: framework(id),
	sections: [
		{
			title: "Start",
			pages: [
				{
					path: `/docs/v9/${id}`,
					title: "Introduction",
					description: `Stepperize for ${framework(id).title}.`,
				},
			],
		},
		{
			title: "Build",
			pages: [{ path: `/docs/v9/${id}/guides/forms`, title: "Forms" }],
		},
	],
	shared:
		id === "react"
			? []
			: [
					{
						path: "/docs/v9/react/concepts/moves",
						title: "React: The lifecycle of a move",
					},
				],
}));

describe("llms.txt", () => {
	const text = buildLlmsTxt(SUMMARY, docs);

	it("opens with a title and a summary that names every framework, React first", () => {
		const [title, , quote] = text.split("\n");
		expect(title).toBe("# Stepperize");
		expect(quote.startsWith("> ")).toBe(true);
		for (const entry of FRAMEWORKS) {
			if (entry.id === "core" || entry.id === "html") continue;
			expect(quote).toContain(entry.title);
		}
		expect(quote.indexOf("React")).toBeLessThan(quote.indexOf("Vue"));
		// The digest is about every binding, not React alone.
		expect(SUMMARY).toMatch(/injectStepper/);
		expect(SUMMARY).toMatch(/bindStepper/);
	});

	it("links every framework to its own index and full file", () => {
		const frameworks = text.split("## Frameworks")[1].split("\n## ")[0];
		for (const entry of FRAMEWORKS) {
			expect(frameworks).toContain(
				`[${entry.title}](https://stepperize.com/docs/v9/${entry.id}/llms.txt)`,
			);
			expect(frameworks).toContain(
				`https://stepperize.com/docs/v9/${entry.id}/llms-full.txt`,
			);
			expect(frameworks).toContain(`\`${entry.package}\``);
		}
	});

	it("lists every framework's pages in its own section, as markdown", () => {
		for (const entry of FRAMEWORKS) {
			const section = text
				.split(`## ${entry.title} docs\n`)[1]
				?.split("\n## ")[0];
			expect(section, entry.id).toContain(
				`- [Forms](https://stepperize.com/docs/v9/${entry.id}/guides/forms.md)`,
			);
			expect(section).not.toMatch(new RegExp(`/docs/v9/(?!${entry.id}[/.])`));
		}
	});

	it("says the Studio and the Blocks are React only", () => {
		expect(text).toContain("## Stepper Studio (React only)");
		expect(text).toContain("## Blocks (React only)");
		expect(text).toContain(`/r/${BLOCKS[0].id}.json`);
		const blocks = text.split("## Blocks (React only)")[1];
		expect(blocks).toMatch(/shadcn\/ui for React/);
	});
});

describe("a framework's llms.txt and llms-full.txt", () => {
	const vue = docs.find((entry) => entry.framework.id === "vue");
	if (!vue) throw new Error("no Vue docs");

	it("groups the pages as the sidebar does and lists the shared concepts", () => {
		const text = buildFrameworkLlmsTxt(vue);
		expect(
			text.startsWith("# Stepperize for Vue\n\n> `@stepperize/vue`:"),
		).toBe(true);
		expect(text).toContain("npm install @stepperize/vue");
		expect(text).toContain(
			"## Start\n\n- [Introduction](https://stepperize.com/docs/v9/vue.md)",
		);
		expect(text).toContain("## Build");
		expect(text).toContain(
			"## Shared concepts\n\n- [React: The lifecycle of a move](https://stepperize.com/docs/v9/react/concepts/moves.md)",
		);
		expect(text).toContain("React only and do not apply to Vue");
		expect(text).toContain("https://stepperize.com/docs/v9/vue/llms-full.txt");
	});

	it("installs the core for plain HTML", () => {
		const html = docs.find((entry) => entry.framework.id === "html");
		if (!html) throw new Error("no HTML docs");
		expect(buildFrameworkLlmsTxt(html)).toContain(
			"npm install @stepperize/core`",
		);
	});

	it("puts every page in full, then the shared ones", () => {
		const text = buildFrameworkLlmsFullTxt(
			vue,
			(page) => `# ${page.title}\n\n${page.path}`,
		);
		const forms = text.indexOf("/docs/v9/vue/guides/forms");
		const shared = text.indexOf("/docs/v9/react/concepts/moves");
		expect(text.indexOf("/docs/v9/vue\n")).toBeLessThan(forms);
		expect(forms).toBeLessThan(shared);
		expect(text).toContain("# Shared concepts");
	});

	it("puts every framework in the full file, React first", () => {
		const text = buildLlmsFullTxt(docs, (page) => page.path);
		let last = -1;
		for (const id of LLMS_FRAMEWORK_ORDER) {
			const at = text.indexOf(`/docs/v9/${id}/guides/forms`);
			expect(at, id).toBeGreaterThan(last);
			last = at;
		}
		expect(LLMS_FRAMEWORK_ORDER[0]).toBe("react");
		expect(LLMS_FRAMEWORK_ORDER.at(-1)).toBe("core");
	});

	it("heads each page with its framework and canonical URL", () => {
		expect(
			pageMarkdownHeader({
				title: "Forms",
				path: "/docs/v9/vue/guides/forms",
				framework: framework("vue"),
				version: "v9",
			}),
		).toEqual([
			"# Forms",
			"",
			"Framework: Vue (`@stepperize/vue`), Stepperize v9.",
			"Source: https://stepperize.com/docs/v9/vue/guides/forms",
		]);
	});
});

describe("text URLs under /docs", () => {
	it("serves a page as markdown and a framework's llms files", () => {
		expect(docsTextRequest("v9/vue/guides/forms.md")).toEqual({
			kind: "page",
			path: "v9/vue/guides/forms",
		});
		expect(docsTextRequest("v9/vue.md")).toEqual({
			kind: "page",
			path: "v9/vue",
		});
		expect(docsTextRequest("v8/forms.mdx")).toEqual({
			kind: "page",
			path: "v8/forms",
		});
		expect(docsTextRequest("v9/svelte/llms.txt")).toEqual({
			kind: "llms",
			framework: "svelte",
		});
		expect(docsTextRequest("v9/core/llms-full.txt")).toEqual({
			kind: "llms-full",
			framework: "core",
		});
		// HTML pages, and llms files of things that are not a framework, are not text.
		expect(docsTextRequest("v9/vue/guides/forms")).toBeUndefined();
		expect(docsTextRequest("v9/nope/llms.txt")).toBeUndefined();
		expect(docsTextRequest("v8/llms.txt")).toBeUndefined();
	});
});

describe("framework demos in markdown", () => {
	const demos = fileURLToPath(
		new URL("../components/framework-demos/", import.meta.url),
	);
	const files = readdirSync(demos, { recursive: true })
		.map((file) => `../components/framework-demos/${String(file)}`)
		.filter(
			(file) => /\.(vue|svelte|tsx?)$/.test(file) && !file.endsWith(".d.ts"),
		);

	it("finds the source of every framework's demo, preferring the component", () => {
		for (const entry of FRAMEWORKS) {
			if (entry.id === "react" || entry.id === "core") continue;
			expect(demoSourceFile(entry.id, files), entry.id).toBeDefined();
		}
		expect(
			demoSourceFile("vue", [
				"../components/framework-demos/mount/vue.ts",
				"../components/framework-demos/VueDemo.vue",
			]),
		).toBe("../components/framework-demos/VueDemo.vue");
		expect(
			demoSourceFile("lit", ["../components/framework-demos/mount/lit.ts"]),
		).toBe("../components/framework-demos/mount/lit.ts");
	});
});

describe("sitemap priorities", () => {
	it("ranks the current version above older ones, and the main framework first", () => {
		const react = docsSitemapPriority(["docs", "v9", "react"]);
		const vue = docsSitemapPriority(["docs", "v9", "vue"]);
		const vuePage = docsSitemapPriority([
			"docs",
			"v9",
			"vue",
			"guides",
			"forms",
		]);
		const v8 = docsSitemapPriority(["docs", "v8", "forms"]);
		const v7 = docsSitemapPriority(["docs", "v7", "forms"]);
		const v2 = docsSitemapPriority(["docs", "v2", "migration"]);
		expect(react).toBeGreaterThan(vue);
		expect(vue).toBeGreaterThan(vuePage);
		expect(vuePage).toBeGreaterThan(v8);
		expect(v8).toBeGreaterThan(v7);
		expect(v7).toBeGreaterThan(v2);
	});
});
