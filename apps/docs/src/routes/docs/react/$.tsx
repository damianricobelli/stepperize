import { createFileRoute, redirect } from "@tanstack/react-router";

const redirects: Record<string, string> = {
	"api-references/define": "/docs/latest/api/react/define-stepper",
	"api-references/hook": "/docs/latest/api/react/use-stepper",
	"api-references/primitives": "/docs/latest/api/react/primitives",
	"api-references/schema-validation":
		"/docs/latest/core-concepts/navigation-lifecycle",
	"api-references/types": "/docs/latest/api/react/types",
	"examples/basic": "/docs/latest/getting-started/first-stepper",
	"examples/conform-react": "/docs/latest/forms/conform",
	"examples/forms": "/docs/latest/forms",
	"examples/react-hook-form": "/docs/latest/forms/react-hook-form",
	installation: "/docs/latest/getting-started/installation",
	"migration/migrating-to-v7": "/docs/latest/migration/v7",
	"my-first-stepper": "/docs/latest/getting-started/first-stepper",
	shadcn: "/docs/latest/blocks",
};

export const Route = createFileRoute("/docs/react/$")({
	beforeLoad: ({ params }) => {
		const splat = params._splat ?? "";

		if (splat.startsWith("migration/legacy/")) {
			const version = splat.replace(
				"migration/legacy/migrating-to-",
				"",
			);
			throw redirect({
				href: version === "v7" ? "/docs/latest/migration/v7" : `/docs/${version}/migration`,
			});
		}

		throw redirect({ href: redirects[splat] ?? "/docs/latest" });
	},
});
