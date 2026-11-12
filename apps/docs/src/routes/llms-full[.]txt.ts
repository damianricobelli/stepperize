import { createFileRoute } from "@tanstack/react-router";
import { llmsFullTxt, TEXT_HEADERS } from "@/lib/llms";

/** Every current docs page as one markdown file, for LLM context windows. */
export const Route = createFileRoute("/llms-full.txt")({
	server: {
		handlers: {
			GET: async () =>
				new Response(await llmsFullTxt(), { headers: TEXT_HEADERS }),
		},
	},
});
