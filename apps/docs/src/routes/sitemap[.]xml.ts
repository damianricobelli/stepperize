import { createFileRoute } from "@tanstack/react-router";
import { BLOCKS } from "@/lib/blocks/catalog.mjs";
import { SITE } from "@/lib/seo";
import {
	docRouteForSlugs,
	docsSitemapPriority,
	type SitemapEntry,
	sitemapXml,
} from "@/lib/sitemap-urls";
import { source } from "@/lib/source";

/**
 * XML sitemap of every indexable URL: the landing page, the Blocks, the
 * Studio and every docs page of every framework and version, each at its
 * canonical URL (never one that redirects, such as `/docs/v9`). Linked from
 * robots.txt.
 *
 * `lastmod` is only given when it is known: the docs pages carry their git
 * date, and the landing page takes the newest of them. A made-up date would
 * teach crawlers to ignore it.
 */
function buildSitemap(): string {
	const entries = new Map<string, SitemapEntry>();
	const add = (path: string, priority: number, lastmod?: string) => {
		const loc = `${SITE.url}${path}`;
		if (!entries.has(loc)) entries.set(loc, { loc, lastmod, priority });
	};

	const docs = source
		.getPages()
		.map((page) => ({
			route: docRouteForSlugs(page.slugs),
			priority: docsSitemapPriority(page.slugs),
			lastmod:
				page.data.lastModified instanceof Date
					? page.data.lastModified.toISOString()
					: undefined,
		}))
		.filter((page): page is typeof page & { route: string } => !!page.route)
		.sort((a, b) => b.priority - a.priority);
	const newest = docs
		.map((page) => page.lastmod)
		.filter(Boolean)
		.sort()
		.at(-1);

	add("/", 1.0, newest);
	// React only: built on @stepperize/react and shadcn/ui.
	add("/blocks", 0.8);
	add("/studio", 0.7);
	for (const block of BLOCKS) add(`/blocks/${block.id}`, 0.5);
	for (const page of docs) add(page.route, page.priority, page.lastmod);

	return sitemapXml(Array.from(entries.values()));
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () =>
				new Response(buildSitemap(), {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=3600",
					},
				}),
		},
	},
});
