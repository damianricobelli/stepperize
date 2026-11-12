import { createFileRoute } from "@tanstack/react-router";
import { findDocsPage, MARKDOWN_HEADERS, pageMarkdown } from "@/lib/llms";

/** One docs page as markdown: `/llms.mdx/docs/v8/guides/navigation`. */
export const Route = createFileRoute("/llms.mdx/$")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const page = findDocsPage(params._splat ?? "");
				if (!page)
					return new Response("Not found. See /llms.txt for every page.", {
						status: 404,
						headers: { "Content-Type": "text/plain; charset=utf-8" },
					});
				return new Response(await pageMarkdown(page), {
					headers: MARKDOWN_HEADERS,
				});
			},
		},
	},
});
