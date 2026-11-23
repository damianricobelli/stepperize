import { CURRENT_DOCS_VERSION } from "./docs-tree";

/**
 * Pages of the site as it was before v7, when everything lived under
 * `/docs/react/...`. That prefix is now the React framework of the current
 * version, so only the pages that were renamed need an entry: a path that still
 * exists resolves by itself.
 *
 * Values are paths inside the current version, or a site path when they start
 * with `/`.
 */
const RETIRED_REACT_PAGES: Record<string, string> = {
	"api-references/define": "react/api/define-stepper",
	"api-references/hook": "react/api/stepper",
	"api-references/primitives": "react/api/primitives",
	"api-references/schema-validation": "react/guides/validation",
	"api-references/types": "core/create-stepper#types",
	"examples/basic": "react/first-stepper",
	"examples/conform-react": "react/forms/conform",
	"examples/forms": "react/forms",
	"examples/react-hook-form": "react/forms/react-hook-form",
	"migration/migrating-to-v7": "/docs/v7/migration/v7",
	"my-first-stepper": "react/first-stepper",
	shadcn: "/blocks",
};

export const RETIRED_REACT_TARGETS = Object.values(RETIRED_REACT_PAGES);

/** Where a retired `/docs/react/...` URL lives now, or `undefined` when it was never retired. */
export function retiredReactPage(splat: string): string | undefined {
	const page = splat.match(/^react\/(.+?)\/?$/)?.[1];
	if (!page) return undefined;
	const legacy = page.match(/^migration\/legacy\/migrating-to-(v\d+)$/)?.[1];
	if (legacy) {
		return legacy === "v7"
			? "/docs/v7/migration/v7"
			: `/docs/${legacy}/migration`;
	}
	const target = RETIRED_REACT_PAGES[page];
	if (!target) return undefined;
	return target.startsWith("/")
		? target
		: `/docs/${CURRENT_DOCS_VERSION}/${target}`;
}
