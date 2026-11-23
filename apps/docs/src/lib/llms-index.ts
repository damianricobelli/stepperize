import { BLOCKS, CATEGORIES } from "@/lib/blocks/catalog.mjs";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";
import {
	BINDINGS,
	CORE_FRAMEWORK,
	DEFAULT_FRAMEWORK,
	type DocsFramework,
	FRAMEWORKS,
	hasFrameworks,
	isDocsFramework,
} from "@/lib/frameworks";
import { REACT_ONLY_NOTE } from "@/lib/seo";
import { SITE } from "@/lib/site";

/**
 * The text of the LLM-facing files, following https://llmstxt.org. Pure: the
 * pages come in as data, so it can be tested without the MDX source. `llms.ts`
 * reads the source and calls these.
 *
 * - `/llms.txt`: the API digest, then every framework with its own index and
 *   full file, every current page by framework, the Studio and the Blocks.
 * - `/docs/{version}/{framework}/llms.txt`: one framework's pages, grouped as
 *   in its sidebar, plus the shared concept pages they rely on.
 * - `/docs/{version}/{framework}/llms-full.txt`: the same pages, in full.
 * - `/llms-full.txt`: every current page of every framework.
 * - `{any docs page}.md`: one page as markdown.
 */

export type Framework = (typeof FRAMEWORKS)[number];

/** A docs page, by its canonical path (`/docs/v9/vue/guides/forms`). */
export type LlmsPage = { path: string; title: string; description?: string };

export type LlmsSection = { title: string; pages: LlmsPage[] };

/** One framework's current docs. */
export type FrameworkDocs = {
	framework: Framework;
	/** Its pages, grouped by the sidebar's separators. */
	sections: LlmsSection[];
	/**
	 * Pages of another framework or the core that its pages link to: the
	 * concepts every binding shares are written once, in the React docs.
	 */
	shared: LlmsPage[];
};

/** The order the files list frameworks in: the main binding, the others, then the core. */
export const LLMS_FRAMEWORK_ORDER: DocsFramework[] = [
	...BINDINGS.map((entry) => entry.id),
	CORE_FRAMEWORK,
];

export const absolute = (path: string) => `${SITE.url}${path}`;

/** The markdown version of a page: its URL with `.md` appended. */
export const markdownUrl = (path: string) => `${SITE.url}${path}.md`;

export const frameworkHome = (framework: DocsFramework) =>
	`/docs/${CURRENT_DOCS_VERSION}/${framework}`;

export const frameworkLlmsUrl = (framework: DocsFramework) =>
	absolute(`${frameworkHome(framework)}/llms.txt`);

export const frameworkLlmsFullUrl = (framework: DocsFramework) =>
	absolute(`${frameworkHome(framework)}/llms-full.txt`);

/** The npm package to install: `@stepperize/core/dom` ships in `@stepperize/core`. */
export const installPackage = (framework: Framework) =>
	framework.package.split("/").slice(0, 2).join("/");

const pageLine = (page: LlmsPage) =>
	`- [${page.title}](${markdownUrl(page.path)})${page.description ? `: ${page.description}` : ""}`;

const role = (framework: Framework) =>
	framework.id === DEFAULT_FRAMEWORK
		? "the main binding"
		: framework.id === CORE_FRAMEWORK
			? "the state machine every binding is built on"
			: framework.id === "html"
				? "no framework"
				: "a binding";

const OLDER_VERSIONS = ["v8", "v7", "v6", "v5", "v4", "v3", "v2"] as const;

function studioAndBlocks(): string[] {
	const categoryName = new Map(CATEGORIES.map((c) => [c.id, c.name]));
	return [
		"## Stepper Studio (React only)",
		"",
		`${REACT_ONLY_NOTE} Not available for the other frameworks.`,
		"",
		`- [Stepper Studio guide for agents](${SITE.url}/studio.md): build a flow config, encode it, and install the generated React code (on shadcn/ui, with your choice of form and validation library, React framework and routing) with the shadcn CLI.`,
		`- [Studio config JSON Schema](${SITE.url}/r/studio/schema.json): the exact shape the Studio registry endpoint accepts.`,
		`- [Stepper Studio](${SITE.url}/studio): the visual editor, for humans.`,
		"",
		"## Blocks (React only)",
		"",
		`${REACT_ONLY_NOTE} Copy-paste stepper UIs built on the React primitives. Install one in a React project with shadcn/ui set up: \`npx shadcn@latest add ${SITE.url}/r/<id>.json\`; the full index is at ${SITE.url}/r/registry.json.`,
		"",
		...BLOCKS.map(
			(block) =>
				`- [${block.title}](${SITE.url}/r/${block.id}.json) (${categoryName.get(block.category) ?? block.category}): ${block.description}`,
		),
		"",
	];
}

/** `/llms.txt` */
export function buildLlmsTxt(summary: string, docs: FrameworkDocs[]): string {
	return [
		// The hand-written API digest stays first: it is the densest guide to writing correct code.
		summary.trim(),
		"",
		"## Frameworks",
		"",
		`Pick the framework the project uses (look for ${[...new Set(FRAMEWORKS.map(installPackage))].map((name) => `\`${name}\``).join(", ")} in its package.json). Each framework has its own index and one file with every page. The concepts all of them share are documented once, in the React docs.`,
		"",
		...docs.map(
			({ framework }) =>
				`- [${framework.title}](${frameworkLlmsUrl(framework.id)}): \`${framework.package}\`, ${role(framework)}. ${framework.description}. Every page in one file: ${frameworkLlmsFullUrl(framework.id)}`,
		),
		"",
		...docs.flatMap(({ framework, sections }) => [
			`## ${framework.title} docs`,
			"",
			...sections.flatMap((section) => section.pages.map(pageLine)),
			"",
		]),
		...studioAndBlocks(),
		"## Optional",
		"",
		`- [Every ${CURRENT_DOCS_VERSION} page of every framework](${SITE.url}/llms-full.txt): one large markdown file. Prefer the framework's own file above.`,
		`- [Changelog](${markdownUrl(`/docs/${CURRENT_DOCS_VERSION}/react/changelog`)})`,
		...OLDER_VERSIONS.map(
			(version) =>
				`- [${version} documentation](${SITE.url}/docs/${version}): legacy React-only API, only for projects still on ${version}.`,
		),
		"",
	].join("\n");
}

function frameworkIntro(docs: FrameworkDocs): string[] {
	const { framework } = docs;
	const home = docs.sections[0]?.pages.find(
		(page) => page.path === frameworkHome(framework.id),
	);
	const lines = [
		`> \`${framework.package}\`: ${home?.description ?? framework.description} Stepperize ${CURRENT_DOCS_VERSION}.`,
		"",
		`Install with \`npm install ${installPackage(framework)}\`.`,
	];
	if (docs.shared.length) {
		lines.push(
			"",
			`The concepts every binding shares (steps, moves and their results, validation, branching, snapshots, options) are written once, in the React and core docs listed under "Shared concepts". Their examples are React; the behaviour, option names and results are the same in ${framework.title}.`,
		);
	}
	if (framework.id !== DEFAULT_FRAMEWORK) {
		lines.push(
			"",
			`Stepper Studio and the Blocks are React only and do not apply to ${framework.title}.`,
		);
	}
	return lines;
}

/** `/docs/{version}/{framework}/llms.txt` */
export function buildFrameworkLlmsTxt(docs: FrameworkDocs): string {
	const { framework } = docs;
	return [
		`# Stepperize for ${framework.title}`,
		"",
		...frameworkIntro(docs),
		"",
		...docs.sections.flatMap((section) => [
			`## ${section.title}`,
			"",
			...section.pages.map(pageLine),
			"",
		]),
		...(docs.shared.length
			? ["## Shared concepts", "", ...docs.shared.map(pageLine), ""]
			: []),
		"## Optional",
		"",
		`- [Every ${framework.title} page in one file](${frameworkLlmsFullUrl(framework.id)}): the pages above, in full.`,
		`- [All frameworks](${SITE.url}/llms.txt): the index of every framework, Stepper Studio and the Blocks (both React only).`,
		"",
	].join("\n");
}

/** `/docs/{version}/{framework}/llms-full.txt`, from each page already rendered as markdown. */
export function buildFrameworkLlmsFullTxt(
	docs: FrameworkDocs,
	render: (page: LlmsPage) => string,
): string {
	const { framework } = docs;
	const pages = docs.sections.flatMap((section) => section.pages);
	return [
		`# Stepperize for ${framework.title}: full documentation`,
		"",
		...frameworkIntro(docs),
		"",
		`Every page of the ${framework.title} docs, in sidebar order${docs.shared.length ? ", then the shared concept pages they link to" : ""}. Index: ${frameworkLlmsUrl(framework.id)}. All frameworks: ${SITE.url}/llms.txt.`,
		"",
		"---",
		"",
		...pages.map((page) => `${render(page)}\n---\n`),
		...(docs.shared.length
			? [
					`# Shared concepts (examples in React; the same in ${framework.title})`,
					"",
					"---",
					"",
					...docs.shared.map((page) => `${render(page)}\n---\n`),
				]
			: []),
	].join("\n");
}

/** `/llms-full.txt` */
export function buildLlmsFullTxt(
	docs: FrameworkDocs[],
	render: (page: LlmsPage) => string,
): string {
	return [
		`# ${SITE.name} ${CURRENT_DOCS_VERSION} documentation, every framework`,
		"",
		`> Every current page of every framework: ${docs.map((d) => d.framework.title).join(", ")}. React is the main binding and holds the concept pages the others link to. One framework only: ${docs.map((d) => frameworkLlmsFullUrl(d.framework.id)).join(", ")}. Index: ${SITE.url}/llms.txt.`,
		"",
		...docs.flatMap(({ framework, sections }) => [
			"---",
			"",
			`# Stepperize for ${framework.title} (\`${framework.package}\`)`,
			"",
			"---",
			"",
			...sections.flatMap((section) =>
				section.pages.map((page) => `${render(page)}\n---\n`),
			),
		]),
	].join("\n");
}

/** The header of one page as markdown. */
export function pageMarkdownHeader(page: {
	title: string;
	description?: string;
	path: string;
	framework?: Framework;
	version: string;
}): string[] {
	const about = page.framework
		? `${page.framework.title} (\`${page.framework.package}\`), Stepperize ${page.version}.`
		: `React (\`@stepperize/react\`), Stepperize ${page.version}. Legacy version: the current docs are at ${SITE.url}/llms.txt.`;
	return [
		`# ${page.title}`,
		"",
		...(page.description ? [`> ${page.description}`, ""] : []),
		`Framework: ${about}`,
		`Source: ${absolute(page.path)}`,
	];
}

/** The file a framework's demo is written in: its component, else its mount script. */
export function demoSourceFile(
	framework: string,
	files: string[],
): string | undefined {
	const relative = (file: string) => file.replace(/^.*\/framework-demos\//, "");
	const named = files.filter((file) => {
		const path = relative(file).toLowerCase();
		return (
			!path.startsWith("mount/") &&
			(path.startsWith(`${framework}/`) ||
				path.split("/").at(-1)?.startsWith(`${framework}demo.`))
		);
	});
	return (
		named[0] ?? files.find((file) => relative(file) === `mount/${framework}.ts`)
	);
}

/**
 * What a `/docs/...` URL asks for when it is not an HTML page: one page as
 * markdown (`/docs/v9/vue/guides/forms.md`), or a framework's `llms.txt` or
 * `llms-full.txt` (`/docs/v9/vue/llms-full.txt`).
 */
export type DocsTextRequest =
	| { kind: "page"; path: string }
	| { kind: "llms" | "llms-full"; framework: DocsFramework };

export function docsTextRequest(splat: string): DocsTextRequest | undefined {
	const segments = splat.split("/").filter(Boolean);
	const file = segments.at(-1) ?? "";
	if (file === "llms.txt" || file === "llms-full.txt") {
		const [version, framework, ...rest] = segments.slice(0, -1);
		if (
			version === CURRENT_DOCS_VERSION &&
			hasFrameworks(version) &&
			isDocsFramework(framework) &&
			rest.length === 0
		) {
			return {
				kind: file === "llms.txt" ? "llms" : "llms-full",
				framework,
			};
		}
		return undefined;
	}
	if (/\.mdx?$/.test(file)) {
		return { kind: "page", path: splat.replace(/\.mdx?$/, "") };
	}
	return undefined;
}
