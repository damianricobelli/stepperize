import { createFileRoute } from "@tanstack/react-router";
import { studioJsonSchema } from "@/lib/studio/agent-guide";

/** JSON Schema for the config behind `/r/studio/<encoded>.json`. */
export const Route = createFileRoute("/r/studio/schema.json")({
	server: {
		handlers: {
			GET: () =>
				Response.json(studioJsonSchema(), {
					headers: {
						"Cache-Control": "public, max-age=3600",
						"Access-Control-Allow-Origin": "*",
					},
				}),
		},
	},
});
