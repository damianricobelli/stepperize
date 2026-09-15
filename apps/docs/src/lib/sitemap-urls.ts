import { getCanonicalDocsPath } from "./docs-tree";
/**
 * Map a fumadocs page's slugs to the real TanStack route URL.
 *
 * Content lives under `content/docs/docs/{version}/...`, so fumadocs
 * slugs look like `["docs", "latest", "getting-started", "installation"]`.
 * The custom routes serve these at `/docs/{version}/...`.
 */
export function docRouteForSlugs(slugs: string[]): string | null {
	if (slugs[0] !== "docs") return null;
	const rest = slugs.slice(1); // e.g. ["latest", "getting-started", "installation"]
	return getCanonicalDocsPath(rest);
}
