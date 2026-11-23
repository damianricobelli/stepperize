import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BLOCKS } from "./blocks/catalog.mjs";
import { getDocsFramework } from "./docs-tree";
import { DEFAULT_FRAMEWORK, FRAMEWORKS } from "./frameworks";
import {
	blockSourceCodeLd,
	blocksCollectionLd,
	blocksMeta,
	docKeywords,
	docsPageSeo,
	FRAMEWORK_SEO,
	sharedDocsFields,
	softwareSourceCodeLd,
	studioApplicationLd,
	studioMeta,
	techArticleLd,
} from "./seo";

const content = fileURLToPath(
	new URL("../../content/docs/docs/", import.meta.url),
);

/** Every docs page with its slugs and frontmatter, read from disk. */
function allPages() {
	return readdirSync(content, { recursive: true })
		.map(String)
		.filter((file) => file.endsWith(".mdx"))
		.map((file) => {
			const text = readFileSync(`${content}/${file}`, "utf8");
			const field = (name: string) =>
				text
					.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]
					.trim()
					.replace(/^(["'])(.*)\1$/, "$2");
			const slugs = [
				"docs",
				...file.replace(/(\/?index)?\.mdx$/, "").split("/"),
			].filter(Boolean);
			return {
				file,
				slugs,
				title: field("title") ?? "",
				description: field("description"),
			};
		});
}

const pages = allPages().map((page, _, all) => ({
	...page,
	shared: sharedDocsFields(page, all),
}));
const current = pages.filter((page) => page.slugs[1] === "v9");

describe("docs titles and descriptions", () => {
	it("gives every page a unique title and description", () => {
		const titles = new Map<string, string>();
		const descriptions = new Map<string, string>();
		for (const page of pages) {
			const seo = docsPageSeo(page);
			expect(titles.get(seo.title), `${page.file}: "${seo.title}"`).toBe(
				undefined,
			);
			titles.set(seo.title, page.file);
			expect(
				descriptions.get(seo.description),
				`${page.file}: "${seo.description}"`,
			).toBe(undefined);
			descriptions.set(seo.description, page.file);
		}
	});

	it("keeps titles and descriptions to lengths search results show", () => {
		for (const page of pages) {
			const seo = docsPageSeo(page);
			expect(seo.title.length, seo.title).toBeLessThanOrEqual(65);
			expect(seo.description.length, seo.description).toBeLessThanOrEqual(170);
		}
	});

	it("names the framework of every current page", () => {
		for (const page of current) {
			const seo = docsPageSeo(page);
			const framework = FRAMEWORKS.find((f) => f.id === seo.framework);
			expect(framework?.id).toBe(getDocsFramework(page.slugs.slice(1)));
			const name = framework?.id === "core" ? "core" : (framework?.title ?? "");
			expect(seo.title.toLowerCase(), page.file).toContain(name.toLowerCase());
			expect(seo.socialSection).toBe(`${framework?.title} docs · v9`);
			expect(
				`${seo.description} ${seo.socialTitle}`.toLowerCase(),
				page.file,
			).toContain(name.toLowerCase());
		}
	});

	it("tells framework pages with the same name apart", () => {
		const vue = docsPageSeo({
			slugs: ["docs", "v9", "vue", "guides", "forms"],
			title: "Forms",
			description: "Collect each step's data.",
		});
		const svelte = docsPageSeo({
			slugs: ["docs", "v9", "svelte", "guides", "forms"],
			title: "Forms",
			description: "Collect each step's data.",
		});
		expect(vue.title).toBe("Forms — Stepperize for Vue");
		expect(vue.description).toBe(
			"Collect each step's data. For Vue 3, with @stepperize/vue.",
		);
		expect(vue.socialTitle).toBe("Vue: Forms");
		expect(svelte.title).not.toBe(vue.title);
		// A description that already names the framework is left alone.
		expect(
			docsPageSeo({
				slugs: ["docs", "v9", "vue"],
				title: "Introduction",
				description: "Typed multi-step flows for Vue.",
			}),
		).toMatchObject({
			title: "Vue multi-step forms and wizards — Stepperize",
			description: "Typed multi-step flows for Vue.",
		});
		// v7 and v8 share their pages.
		expect(
			docsPageSeo({ slugs: ["docs", "v8", "forms"], title: "Forms" }).title,
		).toBe("Forms — Stepperize v8");
	});
});

describe("keywords per framework", () => {
	const words: Record<string, RegExp> = {
		vue: /vue|nuxt/i,
		svelte: /svelte/i,
		solid: /solid/i,
		angular: /angular/i,
		lit: /\blit\b|web component/i,
		html: /html|alpine|htmx|rails|laravel|django|astro|vanilla|@stepperize\/core\/dom/i,
		core: /core|framework-agnostic|javascript/i,
		react: /react/i,
	};

	it("names the framework on every current page, and never React on another framework", () => {
		for (const page of current) {
			const splat = page.slugs.slice(1).join("/");
			const framework = getDocsFramework(page.slugs.slice(1)) ?? "react";
			const keywords = docKeywords(splat) ?? [];
			expect(keywords.length, splat).toBeGreaterThan(0);
			expect(
				keywords.some((keyword) => words[framework].test(keyword)),
				splat,
			).toBe(true);
			expect(
				keywords.includes(
					FRAMEWORKS.find((f) => f.id === framework)?.package ?? "",
				),
				splat,
			).toBe(true);
			if (framework !== DEFAULT_FRAMEWORK) {
				for (const keyword of keywords)
					expect(keyword, splat).not.toMatch(/\bReact\b/);
			}
		}
	});
});

describe("structured data", () => {
	it("says which package and platform a docs page is about", () => {
		const ld = techArticleLd({
			title: "Vue: Forms",
			url: "/docs/v9/vue/guides/forms",
			framework: "vue",
			version: "v9",
		});
		expect(ld).toMatchObject({
			dependencies: "@stepperize/vue",
			about: {
				name: "@stepperize/vue",
				version: "9",
				runtimePlatform: "Vue",
			},
		});
	});

	it("lists every platform for the library, React first", () => {
		const ld = softwareSourceCodeLd();
		expect(ld.runtimePlatform[0]).toBe("React");
		for (const framework of FRAMEWORKS) {
			if (framework.id !== "core")
				expect(ld.runtimePlatform).toContain(
					FRAMEWORK_SEO[framework.id].runtimePlatform,
				);
			expect(ld.hasPart.map((part) => part.name)).toContain(framework.package);
		}
	});

	it("presents the Blocks and the Studio as React and shadcn/ui only", () => {
		for (const ld of [
			blockSourceCodeLd(BLOCKS[0]),
			...blocksCollectionLd().hasPart,
			studioApplicationLd().about,
		]) {
			expect(ld.runtimePlatform).toEqual(["React", "shadcn/ui"]);
		}
		for (const meta of [blocksMeta(), studioMeta()]) {
			expect(meta.title).toMatch(/React/);
			expect(meta.description).toMatch(/React/);
			expect(meta.description).toMatch(/shadcn\/ui/);
			expect(meta.socialTitle).toMatch(/React/);
		}
	});
});
