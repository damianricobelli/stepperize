import { createFileRoute } from "@tanstack/react-router";
import { MARKDOWN_HEADERS } from "@/lib/llms";
import { studioAgentGuide } from "@/lib/studio/agent-guide";

/** How an agent builds, shares and installs a Stepper Studio flow. */
export const Route = createFileRoute("/studio.md")({
	server: {
		handlers: {
			GET: () =>
				new Response(studioAgentGuide(), { headers: MARKDOWN_HEADERS }),
		},
	},
});
