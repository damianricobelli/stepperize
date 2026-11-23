import type * as PageTree from "fumadocs-core/page-tree";
import {
	DEFAULT_FRAMEWORK,
	type DocsFramework,
	FRAMEWORKS,
	hasFrameworks,
	isDocsFramework,
	LEGACY_FRAMEWORK,
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

/** Versions that only kept their migration guide. */
const MIGRATION_ONLY: readonly string[] = ["v6", "v5", "v4", "v3", "v2"];

/** One entry of the framework or the version switcher. */
export type DocsOption = {
	id: string;
	title: string;
	description: string;
	url: string;
	active: boolean;
	/** For a version: what its documentation is, which picks its icon. */
	kind?: "latest" | "previous" | "migration";
};

/**
 * The framework a docs URL is about, for the switchers. Versions that are not
 * split by framework document React.
 */
export function getSwitcherFramework(slugs: string[]): DocsFramework {
	return getDocsFramework(slugs) ?? LEGACY_FRAMEWORK;
}

/** The versions a framework has documentation for, newest first. */
export function getFrameworkVersions(framework: DocsFramework): DocsVersion[] {
	return DOCS_VERSIONS.filter(
		(version) => hasFrameworks(version) || framework === LEGACY_FRAMEWORK,
	);
}

function versionHome(version: string, framework: DocsFramework): string {
	if (hasFrameworks(version)) return `/docs/${version}/${framework}`;
	return MIGRATION_ONLY.includes(version)
		? `/docs/${version}/migration`
		: `/docs/${version}`;
}

/**
 * The framework switcher. Each framework opens the page being read when it has
 * one at the same path (`guides/url` exists for most of them), and its
 * introduction otherwise. From a version a framework does not have, it opens
 * that framework's newest version.
 */
export function getFrameworkOptions(
	slugs: string[],
	hasPage: (path: string) => boolean,
): DocsOption[] {
	const version = getDocsVersion(slugs);
	const current = getSwitcherFramework(slugs);
	// `["docs", version, framework, ...page]` in a version split by framework.
	const page = hasFrameworks(version) ? getDocsPageSlugs(slugs).slice(3) : [];
	return FRAMEWORKS.map((framework) => {
		const target = getFrameworkVersions(framework.id).includes(version)
			? version
			: getFrameworkVersions(framework.id)[0];
		const home = versionHome(target, framework.id);
		const same = [home, ...page].join("/");
		return {
			id: framework.id,
			title: framework.title,
			description: framework.description,
			url: page.length && hasPage(same) ? same : home,
			active: framework.id === current,
		};
	});
}

const VERSION_KINDS = {
	latest: "Latest",
	previous: "Previous version",
	migration: "Migration notes",
} as const;

/** The version switcher: the versions of the framework being read. */
export function getVersionOptions(slugs: string[]): DocsOption[] {
	const current = getDocsVersion(slugs);
	const framework = getSwitcherFramework(slugs);
	return getFrameworkVersions(framework).map((version) => {
		const kind =
			version === CURRENT_DOCS_VERSION
				? "latest"
				: MIGRATION_ONLY.includes(version)
					? "migration"
					: "previous";
		return {
			id: version,
			title: version,
			description: VERSION_KINDS[kind],
			url: versionHome(version, framework),
			active: version === current,
			kind,
		};
	});
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
