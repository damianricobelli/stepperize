import type * as PageTree from "fumadocs-core/page-tree";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";

export const CURRENT_DOCS_VERSION = "v8";
type DocsVersion = "v8" | "v7" | "v6" | "v5" | "v4" | "v3" | "v2";

export function getDocsTree(
	tree: PageTree.Root,
	version: string | undefined,
): PageTree.Root {
	const folder = findDocsVersionFolder(tree, version);

	if (!folder) {
		return {
			...tree,
			$id: `${tree.$id ?? "docs"}:${version ?? CURRENT_DOCS_VERSION}`,
			children: [],
		};
	}

	return {
		...tree,
		// Fumadocs caches navigation by root id, so each version needs its own identity.
		$id: `${tree.$id ?? "docs"}:${version ?? CURRENT_DOCS_VERSION}`,
		children: folder.children,
		name: folder.name,
	};
}

export function getDocsVersion(slugs: string[]): DocsVersion {
	const version = slugs[0];
	return isDocsVersion(version) ? version : CURRENT_DOCS_VERSION;
}

export function getDocsPageSlugs(slugs: string[]): string[] {
	const version = getDocsVersion(slugs);
	const page =
		isDocsVersion(slugs[0]) || slugs[0] === "latest" ? slugs.slice(1) : slugs;
	return ["docs", version, ...page];
}

export function getCanonicalDocsPath(slugs: string[]): string {
	return `/${getDocsPageSlugs(slugs).join("/")}`;
}

const DOCS_TAB_LABELS = {
	latest: "v8",
	current: "Version 8 documentation",
	migration: "Migration notes",
};

export function getDocsVersionTabs(): LayoutTab[] {
	return [
		{
			title: DOCS_TAB_LABELS.latest,
			description: DOCS_TAB_LABELS.current,
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

function findDocsVersionFolder(
	node: PageTree.Root | PageTree.Folder,
	version = CURRENT_DOCS_VERSION,
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

		const found = findDocsVersionFolder(child, version);

		if (found) {
			return found;
		}
	}
}

function isDocsVersion(value: string | undefined): value is DocsVersion {
	return (
		value === "v8" ||
		value === "v7" ||
		value === "v6" ||
		value === "v5" ||
		value === "v4" ||
		value === "v3" ||
		value === "v2"
	);
}
