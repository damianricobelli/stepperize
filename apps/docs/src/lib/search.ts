import { getDocsFramework, getDocsVersion } from "./docs-tree";
import {
	CORE_FRAMEWORK,
	type DocsFramework,
	FRAMEWORKS,
	hasFrameworks,
	isDocsFramework,
} from "./frameworks";

/**
 * Search tags. Every page is tagged with its version (`v8`), and in a version
 * split by framework also with `{version}/{framework}` (`v9/vue`).
 *
 * The client asks for the tag of the page it is on. `v9/vue` does not filter
 * to Vue: it searches all of v9 and puts Vue first, then the core, then the
 * other frameworks, because some answers only exist once (the concept pages
 * are in the React docs). A bare version tag (`v8`, and `v9` from clients
 * built before frameworks) filters by version only, as before.
 */

/** The tags of a page, from its Fumadocs slugs (`["docs", "v9", "vue", ...]`). */
export function pageSearchTags(slugs: string[]): string[] {
	const segments = slugs[0] === "docs" ? slugs.slice(1) : slugs;
	const version = getDocsVersion(segments);
	const framework = getDocsFramework(segments);
	return framework ? [version, `${version}/${framework}`] : [version];
}

/**
 * The trail shown under a result: the framework and version, so two pages
 * called "Forms" can be told apart. Before the split, every page is React.
 */
export function pageSearchBreadcrumbs(slugs: string[]): string[] {
	const segments = slugs[0] === "docs" ? slugs.slice(1) : slugs;
	const version = getDocsVersion(segments);
	const framework = FRAMEWORKS.find(
		(entry) => entry.id === getDocsFramework(segments),
	);
	return [`${framework?.title ?? "React"} ${version}`];
}

/** The tag the search dialog sends from a URL path, such as `/docs/v9/vue/guides/forms`. */
export function searchTagForPath(pathname: string): string {
	const segments = pathname.split("/").filter(Boolean);
	// Off the docs (the landing, the Blocks), search the current docs.
	const docs = segments[0] === "docs" ? segments.slice(1) : [];
	const version = getDocsVersion(docs);
	const framework = getDocsFramework(docs);
	return framework ? `${version}/${framework}` : version;
}

/** The tags the search dialog offers on a version split by framework: one per framework. */
export function searchTagOptions(
	pathname: string,
): { name: string; value: string }[] {
	const segments = pathname.split("/").filter(Boolean);
	const version = getDocsVersion(
		segments[0] === "docs" ? segments.slice(1) : [],
	);
	if (!hasFrameworks(version)) return [];
	return FRAMEWORKS.map((entry) => ({
		name: entry.title,
		value: `${version}/${entry.id}`,
	}));
}

/** What the server searches for a requested tag. */
export function resolveSearchTag(tags: string[] | undefined): {
	/** The tags to filter by. */
	tag?: string[];
	/** The framework to rank first, within the version. */
	prefer?: { version: string; framework: DocsFramework };
} {
	if (!tags?.length) return {};
	const [version, framework] = tags[0].split("/");
	if (framework !== undefined && isDocsFramework(framework)) {
		return { tag: [version], prefer: { version, framework } };
	}
	return { tag: tags };
}

/** The shape of a Fumadocs search result. */
type Result = { type: string; url: string };

/**
 * Reorders search results so a framework's pages come first, then the core,
 * then the rest, keeping the engine's order inside each group. A page result
 * is followed by its heading and text matches, which move with it.
 */
export function preferFramework<T extends Result>(
	results: T[],
	prefer: { version: string; framework: DocsFramework },
	limit = 60,
): T[] {
	const groups: T[][] = [];
	for (const result of results) {
		if (result.type === "page" || groups.length === 0) groups.push([]);
		groups[groups.length - 1].push(result);
	}
	const rank = (group: T[]) => {
		const url = group[0].url;
		const under = (framework: string) =>
			url === `/docs/${prefer.version}/${framework}` ||
			url.startsWith(`/docs/${prefer.version}/${framework}/`) ||
			url.startsWith(`/docs/${prefer.version}/${framework}#`);
		if (under(prefer.framework)) return 0;
		if (under(CORE_FRAMEWORK)) return 1;
		return 2;
	};
	const ordered = groups
		.map((group, index) => ({ group, index, rank: rank(group) }))
		.sort((a, b) => a.rank - b.rank || a.index - b.index)
		.map((entry) => entry.group);
	const out: T[] = [];
	for (const group of ordered) {
		if (out.length >= limit) break;
		out.push(...group);
	}
	return out;
}
