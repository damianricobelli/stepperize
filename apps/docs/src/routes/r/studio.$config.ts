import { createFileRoute } from "@tanstack/react-router";
import { toRegistryItem } from "@/lib/studio/codegen/generate";
import { decodeConfig } from "@/lib/studio/share";

/**
 * Dynamic shadcn registry item: `/r/studio/<encoded config>.json`.
 *
 * The config is decoded against a strict, bounded schema and the generator
 * escapes every user string, so the response is safe to install. Output is a
 * pure function of the URL, so it caches forever.
 */
export const Route = createFileRoute("/r/studio/$config")({
	server: {
		handlers: {
			GET: ({ params }) => {
				const config = decodeConfig(params.config.replace(/\.json$/, ""));
				if (!config) {
					return Response.json(
						{ error: "Invalid or outdated Studio config." },
						{ status: 400 },
					);
				}
				return Response.json(toRegistryItem(config), {
					headers: {
						"Cache-Control": "public, max-age=31536000, immutable",
						"Access-Control-Allow-Origin": "*",
					},
				});
			},
		},
	},
});
