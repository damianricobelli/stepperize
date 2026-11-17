import type * as PageTree from "fumadocs-core/page-tree";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";
import {
	DEFAULT_FRAMEWORK,
	type DocsFramework,
	FRAMEWORKS,
	hasFrameworks,
	isDocsFramework,
} from "./frameworks";

export const CURRENT_DOCS_VERSION = "v9";
/** Where links written before v9, which carry no version, land when v9 has no such page. */
export const LEGACY_DOCS_VERSION = "v8";
const DOCS_VERSIONS = ["v9", "v8", "v7", "v6", "v5", "v4", "v3", "v2"] as const;
type DocsVersion = (typeof DOCS_VERSIONS)[number];

/**
 * The sidebar of one version. Versions split by framework have one sidebar per
 * framework, found at `{version}/{framework}`.
 */
export function getDocsTree(
	tree: PageTree.Root,
	version: string | undefined,
	framework?: string,
): PageTree.Root {
	const path = [version ?? CURRENT_DOCS_VERSION, framework]
		.filter(Boolean)
		.join("/");
	const folder = findDocsFolder(tree, path);
	// Fumadocs caches navigation by root id, so each sidebar needs its own identity.
	const $id = `${tree.$id ?? "docs"}:${path}`;

	if (!folder) {
		return { ...tree, $id, children: [] };
	}

	return { ...tree, $id, children: folder.children, name: folder.name };
}

/** The framework a docs URL belongs to, or `undefined` for versions that are not split. */
export function getDocsFramework(slugs: string[]): DocsFramework | undefined {
	if (!hasFrameworks(getDocsVersion(slugs))) return undefined;
	return isDocsFramework(slugs[1]) ? slugs[1] : DEFAULT_FRAMEWORK;
}

export function getDocsVersion(slugs: string[]): DocsVersion {
	const version = slugs[0];
	return isDocsVersion(version) ? version : CURRENT_DOCS_VERSION;
}

/** Whether the URL names its version, rather than relying on the current one. */
export function hasDocsVersion(slugs: string[]): boolean {
	return isDocsVersion(slugs[0]);
}

export function getDocsPageSlugs(slugs: string[]): string[] {
	const version = getDocsVersion(slugs);
	const page =
		isDocsVersion(slugs[0]) || slugs[0] === "latest" ? slugs.slice(1) : slugs;
	// `/docs/v9/guides/x` has no framework: send it to the default one.
	if (hasFrameworks(version) && !isDocsFramework(page[0])) {
		return ["docs", version, DEFAULT_FRAMEWORK, ...page];
	}
	return ["docs", version, ...page];
}

export function getCanonicalDocsPath(slugs: string[]): string {
	return `/${getDocsPageSlugs(slugs).join("/")}`;
}

const DOCS_TAB_LABELS = {
	migration: "Migration notes",
};

/**
 * The sidebar switcher. Inside a version split by framework it lists that
 * version's frameworks first, then the other versions.
 */
export function getDocsTabs(
	version: string = CURRENT_DOCS_VERSION,
): LayoutTab[] {
	const versions = getDocsVersionTabs();
	if (!hasFrameworks(version)) return versions;
	return [
		...FRAMEWORKS.map((framework) => ({
			title: `${framework.title} · ${version}`,
			description: framework.description,
			url: `/docs/${version}/${framework.id}`,
		})),
		...versions.filter((tab) => tab.url !== `/docs/${version}`),
	];
}

export function getDocsVersionTabs(): LayoutTab[] {
	return [
		{
			title: CURRENT_DOCS_VERSION,
			description: "Version 9 documentation",
			url: `/docs/${CURRENT_DOCS_VERSION}`,
		},
		{
			title: "v8",
			description: "Version 8 documentation",
			url: "/docs/v8",
		},
		{
			title: "v7",
			description: "Version 7 documentation",
			url: "/docs/v7",
		},
		{
			title: "v6",
			description: DOCS_TAB_LABELS.migration,
			url: "/docs/v6/migration",
		},
		{
			title: "v5",
			description: DOCS_TAB_LABELS.migration,
			url: "/docs/v5/migration",
		},
		{
			title: "v4",
			description: DOCS_TAB_LABELS.migration,
			url: "/docs/v4/migration",
		},
		{
			title: "v3",
			description: DOCS_TAB_LABELS.migration,
			url: "/docs/v3/migration",
		},
		{
			title: "v2",
			description: DOCS_TAB_LABELS.migration,
			url: "/docs/v2/migration",
		},
	];
}

function findDocsFolder(
	node: PageTree.Root | PageTree.Folder,
	version: string,
): PageTree.Folder | undefined {
	for (const child of node.children) {
		if (child.type !== "folder") {
			continue;
		}

		const name = typeof child.name === "string" ? child.name : undefined;
		const ref = child.$ref?.meta;

		if (
			name?.toLowerCase() === version ||
			ref?.includes(`docs/${version}/meta.`)
		) {
			return child;
		}

		const found = findDocsFolder(child, version);

		if (found) {
			return found;
		}
	}
}

function isDocsVersion(value: string | undefined): value is DocsVersion {
	return (DOCS_VERSIONS as readonly string[]).includes(value as string);
}
