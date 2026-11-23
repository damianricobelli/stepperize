import { createFileRoute, redirect } from "@tanstack/react-router";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";

export const Route = createFileRoute("/changelog/")({
	beforeLoad: () => {
		// Straight to the canonical page, without a second redirect through `/docs/latest`.
		throw redirect({ href: `/docs/${CURRENT_DOCS_VERSION}/react/changelog` });
	},
});
