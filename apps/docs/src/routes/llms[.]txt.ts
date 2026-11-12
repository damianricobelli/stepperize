import { createFileRoute } from "@tanstack/react-router";
import { llmsTxt, TEXT_HEADERS } from "@/lib/llms";

/** https://llmstxt.org index of the docs, the Studio and the Blocks. */
export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: () => new Response(llmsTxt(), { headers: TEXT_HEADERS }),
		},
	},
});
