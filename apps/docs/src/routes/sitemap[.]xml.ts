import { createFileRoute } from "@tanstack/react-router";
import { BLOCKS } from "@/lib/blocks/catalog.mjs";
import { SITE } from "@/lib/seo";
import { docRouteForSlugs } from "@/lib/sitemap-urls";
import { source } from "@/lib/source";

/**
 * XML sitemap covering the landing page and every documentation page. Linked
 * from robots.txt so crawlers discover the full route surface.
 */
function buildSitemap(): string {
	const now = new Date().toISOString();
	const urls = new Map<string, { lastmod?: string; priority: string }>();

	const add = (path: string, priority: string, lastmod?: string) => {
		const loc = `${SITE.url}${path}`;
		if (!urls.has(loc)) urls.set(loc, { lastmod, priority });
	};

	add("/", "1.0", now);
	add("/docs/latest", "0.9", now);

	// Blocks gallery + every block detail page.
	add("/blocks", "0.9", now);
	for (const block of BLOCKS) {
		add(`/blocks/${block.id}`, "0.7", now);
	}

	for (const page of source.getPages()) {
		const route = docRouteForSlugs(page.slugs);
		if (!route) continue;
		const lastmod =
			page.data.lastModified instanceof Date
				? page.data.lastModified.toISOString()
				: undefined;
		const priority = page.slugs[1] === "latest" ? "0.8" : "0.4";
		add(route, priority, lastmod);
	}

	const entries = Array.from(urls.entries())
		.map(
			([loc, { lastmod, priority }]) =>
				`  <url>\n    <loc>${loc}</loc>\n${
					lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""
				}    <priority>${priority}</priority>\n  </url>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
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
