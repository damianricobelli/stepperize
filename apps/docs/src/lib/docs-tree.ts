import type * as PageTree from "fumadocs-core/page-tree";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";

type DocsVersion = "latest" | "v7" | "v6" | "v5" | "v4" | "v3" | "v2";

export function getDocsTree(
	tree: PageTree.Root,
	version: string | undefined,
): PageTree.Root {
	const folder = findDocsVersionFolder(tree, version);

	if (!folder) {
		return tree;
	}

	return {
		...tree,
		children: folder.children,
		name: folder.name,
	};
}

export function getDocsVersion(slugs: string[]): DocsVersion {
	const version = slugs[0];
	return isDocsVersion(version) ? version : "latest";
}

export function getDocsPageSlugs(slugs: string[]): string[] {
	const version = getDocsVersion(slugs);
	return isDocsVersion(slugs[0])
		? ["docs", ...slugs]
		: ["docs", version, ...slugs];
}

const DOCS_TAB_LABELS = {
	latest: "Latest",
	current: "Current documentation",
	migration: "Migration notes",
};

export function getDocsVersionTabs(): LayoutTab[] {
	return [
		{
			title: DOCS_TAB_LABELS.latest,
			description: DOCS_TAB_LABELS.current,
			url: "/docs/latest",
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
	version = "latest",
): PageTree.Folder | undefined {
	for (const child of node.children) {
		if (child.type !== "folder") {
			continue;
		}

		const name = typeof child.name === "string" ? child.name : undefined;
		const ref = typeof child.$ref === "string" ? child.$ref : undefined;

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
		value === "latest" ||
		value === "v7" ||
		value === "v6" ||
		value === "v5" ||
		value === "v4" ||
		value === "v3" ||
		value === "v2"
	);
}
