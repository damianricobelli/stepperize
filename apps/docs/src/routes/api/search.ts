import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import {
	pageSearchBreadcrumbs,
	pageSearchTags,
	preferFramework,
	resolveSearchTag,
} from "@/lib/search";
import { source } from "@/lib/source";

const server = createFromSource(source, {
	buildIndex: (page) => ({
		id: page.url,
		title: page.data.title,
		description: page.data.description,
		url: page.url,
		tag: pageSearchTags(page.slugs),
		breadcrumbs: pageSearchBreadcrumbs(page.slugs),
		structuredData: page.data.structuredData,
	}),
});

/** Results of the version, with the framework of the page being read first. See `lib/search.ts`. */
async function GET(request: Request): Promise<Response> {
	const params = new URL(request.url).searchParams;
	const query = params.get("query");
	if (!query) return Response.json([]);
	const { tag, prefer } = resolveSearchTag(params.get("tag")?.split(","));
	const limit = Number(params.get("limit"));
	if (!prefer) {
		return Response.json(
			await server.search(query, {
				tag,
				limit: Number.isInteger(limit) && limit > 0 ? limit : undefined,
			}),
		);
	}
	// Search wider than one page of results, so the framework's matches are not cut off before they are ranked.
	const results = await server.search(query, { tag, limit: 300 });
	return Response.json(
		preferFramework(
			results,
			prefer,
			Number.isInteger(limit) && limit > 0 ? limit : undefined,
		),
	);
}

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: ({ request }) => GET(request),
		},
	},
});
