import type * as PageTree from "fumadocs-core/page-tree";
import {
	CURRENT_DOCS_VERSION,
	getDocsFramework,
	getDocsTree,
	getDocsVersion,
} from "@/lib/docs-tree";
import {
	CORE_FRAMEWORK,
	DEFAULT_FRAMEWORK,
	type DocsFramework,
	FRAMEWORKS,
} from "@/lib/frameworks";
import { docRouteForSlugs } from "@/lib/sitemap-urls";
import { source } from "@/lib/source";
import {
	buildFrameworkLlmsFullTxt,
	buildFrameworkLlmsTxt,
	buildLlmsFullTxt,
	buildLlmsTxt,
	demoSourceFile,
	type FrameworkDocs,
	LLMS_FRAMEWORK_ORDER,
	type LlmsPage,
	type LlmsSection,
	pageMarkdownHeader,
} from "./llms-index";
import { toPlainMarkdown } from "./llms-markdown";
import SUMMARY from "./llms-summary.md?raw";

/**
 * LLM-facing documentation (https://llmstxt.org), read from the same Fumadocs
 * source and page tree as the site, so order and sections match the sidebar.
 * The text itself is built in `llms-index.ts`.
 */

type DocsPage = ReturnType<typeof source.getPages>[number];

const nodeName = (node: { name?: unknown }) =>
	typeof node.name === "string" ? node.name : "";

/** The canonical path of a page: `/docs/v9/vue/guides/forms`. */
const pagePath = (page: DocsPage) => docRouteForSlugs(page.slugs) ?? page.url;

const toLlmsPage = (page: DocsPage): LlmsPage => ({
	path: pagePath(page),
	title: page.data.title,
	description: page.data.description,
});

/** One framework's current pages, grouped by the sidebar's separators. */
function frameworkSections(framework: DocsFramework): {
	sections: LlmsSection[];
	pages: DocsPage[];
} {
	const tree = getDocsTree(source.pageTree, CURRENT_DOCS_VERSION, framework);
	const byUrl = new Map(source.getPages().map((page) => [page.url, page]));
	const sections: { title: string; pages: DocsPage[] }[] = [
		{ title: "Docs", pages: [] },
	];
	const seen = new Set<DocsPage>();

	const visit = (nodes: PageTree.Node[]) => {
		for (const node of nodes) {
			if (node.type === "separator") {
				sections.push({ title: nodeName(node) || "More", pages: [] });
			} else if (node.type === "page") {
				const page = byUrl.get(node.url);
				if (page && !seen.has(page)) {
					seen.add(page);
					sections[sections.length - 1].pages.push(page);
				}
			} else if (node.type === "folder") {
				if (node.index) visit([node.index]);
				visit(node.children);
			}
		}
	};
	visit(tree.children);
	const filled = sections.filter((section) => section.pages.length > 0);
	return {
		sections: filled.map((section) => ({
			title: section.title,
			pages: section.pages.map(toLlmsPage),
		})),
		pages: filled.flatMap((section) => section.pages),
	};
}

const SHARED_LINK = new RegExp(
	`/docs/${CURRENT_DOCS_VERSION}/(${DEFAULT_FRAMEWORK}|${CORE_FRAMEWORK})(/[a-z0-9/-]*)?`,
	"g",
);

/** The React and core pages a framework's pages link to, in order of first link. */
async function sharedPages(
	framework: DocsFramework,
	pages: DocsPage[],
): Promise<DocsPage[]> {
	const own = new Set(pages);
	const found: DocsPage[] = [];
	for (const page of pages) {
		const text = await page.data.getText("processed");
		for (const [path] of text.matchAll(SHARED_LINK)) {
			if (path.startsWith(`/docs/${CURRENT_DOCS_VERSION}/${framework}`))
				continue;
			const target = source.getPage(
				`docs/${path.slice("/docs/".length)}`.split("/").filter(Boolean),
			);
			if (target && !own.has(target) && !found.includes(target))
				found.push(target);
		}
	}
	return found;
}

const frameworkEntry = (id: DocsFramework) =>
	FRAMEWORKS.find((entry) => entry.id === id) ?? FRAMEWORKS[0];

/** Every framework's current docs, without the shared pages (`llms.txt` lists them all anyway). */
function allFrameworkDocs(): FrameworkDocs[] {
	return LLMS_FRAMEWORK_ORDER.map((id) => ({
		framework: frameworkEntry(id),
		sections: frameworkSections(id).sections,
		shared: [],
	}));
}

/** One framework's current docs, with the shared pages its pages link to. */
async function frameworkDocs(
	framework: DocsFramework,
): Promise<{ docs: FrameworkDocs; pages: DocsPage[]; shared: DocsPage[] }> {
	const { sections, pages } = frameworkSections(framework);
	// The React docs hold the shared concepts themselves.
	const shared =
		framework === DEFAULT_FRAMEWORK ? [] : await sharedPages(framework, pages);
	return {
		docs: {
			framework: frameworkEntry(framework),
			sections,
			// "Introduction" alone says nothing next to the framework's own pages.
			shared: shared.map((page) => ({
				...toLlmsPage(page),
				title: `${frameworkEntry(getDocsFramework(page.slugs.slice(1)) ?? DEFAULT_FRAMEWORK).title}: ${page.data.title}`,
			})),
		},
		pages,
		shared,
	};
}

/** Renders a set of pages as markdown, keyed by path for the text builders. */
async function renderAll(pages: DocsPage[]) {
	const rendered = new Map(
		await Promise.all(
			pages.map(
				async (page) => [pagePath(page), await pageMarkdown(page)] as const,
			),
		),
	);
	return (page: LlmsPage) => rendered.get(page.path) ?? "";
}

/** `/llms.txt` */
export function llmsTxt(): string {
	return buildLlmsTxt(SUMMARY, allFrameworkDocs());
}

/** `/llms-full.txt` */
export async function llmsFullTxt(): Promise<string> {
	const pages = LLMS_FRAMEWORK_ORDER.flatMap(
		(id) => frameworkSections(id).pages,
	);
	return buildLlmsFullTxt(allFrameworkDocs(), await renderAll(pages));
}

/** `/docs/{version}/{framework}/llms.txt` */
export async function frameworkLlmsTxt(
	framework: DocsFramework,
): Promise<string> {
	return buildFrameworkLlmsTxt((await frameworkDocs(framework)).docs);
}

/** `/docs/{version}/{framework}/llms-full.txt` */
export async function frameworkLlmsFullTxt(
	framework: DocsFramework,
): Promise<string> {
	const { docs, pages, shared } = await frameworkDocs(framework);
	return buildFrameworkLlmsFullTxt(
		docs,
		await renderAll([...pages, ...shared]),
	);
}

/*
 * The source of each `<FrameworkDemo>`, so the markdown of a page shows what
 * the browser runs. Globbed, so a renamed or new demo needs no change here.
 */
const DEMO_SOURCES = import.meta.glob<string>(
	["../components/framework-demos/**/*.{vue,svelte,ts,tsx}", "!**/*.d.ts"],
	{ query: "?raw", import: "default", eager: true },
);

const DEMO_REPO =
	"https://github.com/damianricobelli/stepperize/blob/main/apps/docs/src/components/framework-demos";

const FENCE: Record<string, string> = {
	vue: "vue",
	svelte: "svelte",
	tsx: "tsx",
	ts: "ts",
};

function frameworkDemo(framework: string): string | undefined {
	const file = demoSourceFile(framework, Object.keys(DEMO_SOURCES));
	if (!file) return undefined;
	const name = file.replace(/^.*\/framework-demos\//, "");
	const lang = FENCE[name.split(".").at(-1) ?? ""] ?? "";
	const fence = DEMO_SOURCES[file].includes("```") ? "````" : "```";
	return [
		`The live demo runs in the browser. Its source ([${name}](${DEMO_REPO}/${name})):`,
		"",
		`${fence}${lang}`,
		DEMO_SOURCES[file].trimEnd(),
		fence,
	].join("\n");
}

/** One page as markdown, with its title, description, framework and canonical URL. */
export async function pageMarkdown(page: DocsPage): Promise<string> {
	const text = await page.data.getText("processed");
	const segments = page.slugs.slice(1);
	const version = getDocsVersion(segments);
	const framework = getDocsFramework(segments);
	return [
		...pageMarkdownHeader({
			title: page.data.title,
			description: page.data.description,
			path: pagePath(page),
			framework: framework ? frameworkEntry(framework) : undefined,
			version,
		}),
		"",
		toPlainMarkdown(text, { frameworkDemo }),
		"",
	].join("\n");
}

/** Finds a docs page by its slug path, e.g. `docs/v8/guides/navigation`. */
export function findDocsPage(path: string): DocsPage | undefined {
	const slugs = path
		.replace(/\.(md|mdx)$/, "")
		.split("/")
		.filter(Boolean);
	return source.getPage(slugs);
}

export const MARKDOWN_HEADERS = {
	"Content-Type": "text/markdown; charset=utf-8",
	"Cache-Control": "public, max-age=3600",
} as const;

export const TEXT_HEADERS = {
	"Content-Type": "text/plain; charset=utf-8",
	"Cache-Control": "public, max-age=3600",
} as const;
