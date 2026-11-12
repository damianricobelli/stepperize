import type * as PageTree from "fumadocs-core/page-tree";
import { BLOCKS, CATEGORIES } from "@/lib/blocks/catalog.mjs";
import { CURRENT_DOCS_VERSION, getDocsTree } from "@/lib/docs-tree";
import { SITE } from "@/lib/site";
import { docRouteForSlugs } from "@/lib/sitemap-urls";
import { source } from "@/lib/source";
import { toPlainMarkdown } from "./llms-markdown";
import SUMMARY from "./llms-summary.md?raw";

/**
 * LLM-facing documentation, following https://llmstxt.org:
 *
 * - `/llms.txt`: the hand-written API digest (`llms-summary.md`), then an
 *   index of the current docs, Stepper Studio and the Blocks.
 * - `/llms-full.txt`: every current docs page as one markdown file.
 * - `/llms.mdx/<docs path>`: one page as markdown.
 *
 * Built from the same fumadocs source and page tree as the site, so the
 * order and sections match the docs sidebar.
 */

type DocsPage = ReturnType<typeof source.getPages>[number];

type Section = { title: string; pages: DocsPage[] };

const OLDER_VERSIONS = ["v7", "v6", "v5", "v4", "v3", "v2"] as const;

const nodeName = (node: { name?: unknown }) =>
	typeof node.name === "string" ? node.name : "";

/** The current version's pages, grouped by the sidebar's separators. */
export function currentDocsSections(): Section[] {
	const tree = getDocsTree(source.pageTree, CURRENT_DOCS_VERSION);
	const byUrl = new Map(source.getPages().map((page) => [page.url, page]));
	const sections: Section[] = [{ title: "Overview", pages: [] }];
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
	return sections.filter((section) => section.pages.length > 0);
}

export const markdownUrl = (page: DocsPage) =>
	`${SITE.url}/llms.mdx/${page.slugs.join("/")}`;

const htmlUrl = (page: DocsPage) =>
	`${SITE.url}${docRouteForSlugs(page.slugs) ?? page.url}`;

function pageLine(page: DocsPage): string {
	const description = page.data.description ? `: ${page.data.description}` : "";
	return `- [${page.data.title}](${markdownUrl(page)})${description}`;
}

/** `/llms.txt` */
export function llmsTxt(): string {
	const sections = currentDocsSections();
	const categoryName = new Map(CATEGORIES.map((c) => [c.id, c.name]));
	const lines = [
		// The hand-written API digest stays first: it is the densest guide to writing correct code.
		SUMMARY.trim(),
		"",
		"# Index",
		"",
		`Every ${CURRENT_DOCS_VERSION} docs page as markdown, in sidebar order, then Stepper Studio and the Blocks.`,
		"",
		...sections.flatMap((section) => [
			`## Docs: ${section.title}`,
			"",
			...section.pages.map(pageLine),
			"",
		]),
		"## Stepper Studio",
		"",
		`- [Stepper Studio guide for agents](${SITE.url}/studio.md): build a flow config, encode it, and install the generated code (on shadcn/ui, with your choice of form and validation library, framework and routing) with the shadcn CLI.`,
		`- [Studio config JSON Schema](${SITE.url}/r/studio/schema.json): the exact shape the Studio registry endpoint accepts.`,
		`- [Stepper Studio](${SITE.url}/studio): the visual editor, for humans.`,
		"",
		"## Blocks",
		"",
		`Copy-paste stepper UIs built on the primitives. Install one with \`npx shadcn@latest add ${SITE.url}/r/<id>.json\`; the full index is at ${SITE.url}/r/registry.json.`,
		"",
		...BLOCKS.map(
			(block) =>
				`- [${block.title}](${SITE.url}/r/${block.id}.json) (${categoryName.get(block.category) ?? block.category}): ${block.description}`,
		),
		"",
		"## Optional",
		"",
		`- [Full ${CURRENT_DOCS_VERSION} documentation](${SITE.url}/llms-full.txt): every page above in one markdown file.`,
		`- [Changelog](${SITE.url}/changelog)`,
		...OLDER_VERSIONS.map(
			(version) =>
				`- [${version} documentation](${SITE.url}/docs/${version}): legacy API, only for projects still on ${version}.`,
		),
		"",
	];
	return lines.join("\n");
}

/** One page as markdown, with its title, description and canonical URL. */
export async function pageMarkdown(page: DocsPage): Promise<string> {
	const text = await page.data.getText("processed");
	return [
		`# ${page.data.title}`,
		"",
		page.data.description ? `> ${page.data.description}` : null,
		page.data.description ? "" : null,
		`Source: ${htmlUrl(page)}`,
		"",
		toPlainMarkdown(text),
		"",
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

/** `/llms-full.txt` */
export async function llmsFullTxt(): Promise<string> {
	const pages = currentDocsSections().flatMap((section) => section.pages);
	const bodies = await Promise.all(pages.map(pageMarkdown));
	return [
		`# ${SITE.name} ${CURRENT_DOCS_VERSION} documentation`,
		"",
		`> Every page of the current Stepperize docs, in sidebar order. Index: ${SITE.url}/llms.txt. Stepper Studio guide: ${SITE.url}/studio.md.`,
		"",
		...bodies.map((body) => `${body}\n---\n`),
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
