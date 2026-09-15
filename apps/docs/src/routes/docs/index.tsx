import { createFileRoute, redirect } from "@tanstack/react-router";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";

export const Route = createFileRoute("/docs/")({
	beforeLoad: ({ location }) => {
		throw redirect({
			href: `/docs/${CURRENT_DOCS_VERSION}${location.searchStr}${location.hash ? `#${location.hash}` : ""}`,
			replace: true,
		});
	},
});
