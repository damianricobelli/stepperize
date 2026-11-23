import { CURRENT_DOCS_VERSION, getCanonicalDocsPath } from "./docs-tree";
import { DEFAULT_FRAMEWORK, hasFrameworks } from "./frameworks";

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

/**
 * The sitemap priority of a docs page, from its Fumadocs slugs. The current
 * version comes first, with each framework's introduction above its pages and
 * the main binding above the others; v8 and v7 are kept for projects still on
 * them, and the older versions only have their migration guide.
 */
export function docsSitemapPriority(slugs: string[]): number {
	const [, version, framework, ...page] = slugs;
	if (version === CURRENT_DOCS_VERSION && hasFrameworks(version)) {
		const main = framework === DEFAULT_FRAMEWORK;
		if (page.length === 0) return main ? 0.9 : 0.8;
		return main ? 0.7 : 0.6;
	}
	if (version === "v8") return 0.3;
	if (version === "v7") return 0.2;
	return 0.1;
}

export type SitemapEntry = { loc: string; lastmod?: string; priority: number };

/** The `<urlset>` of a sitemap. */
export function sitemapXml(entries: SitemapEntry[]): string {
	const urls = entries
		.map(
			({ loc, lastmod, priority }) =>
				`  <url>\n    <loc>${escapeXml(loc)}</loc>\n${
					lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""
				}    <priority>${priority.toFixed(1)}</priority>\n  </url>`,
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const escapeXml = (text: string) =>
	text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
