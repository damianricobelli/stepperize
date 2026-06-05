import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const { GET } = createFromSource(source);

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: ({ request }) => GET(request),
    },
  },
});
