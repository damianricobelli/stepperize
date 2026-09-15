import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const { GET } = createFromSource(source, {
	buildIndex: (page) => ({
		id: page.url,
		title: page.data.title,
		description: page.data.description,
		url: page.url,
		tag: page.slugs[1],
		structuredData: page.data.structuredData,
	}),
});

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: ({ request }) => GET(request),
		},
	},
});
