export const SITE = {
	url: "https://stepperize.com",
	name: "Stepperize",
	/** Brand suffix appended to page titles. */
	titleSuffix: "Stepperize",
	/** Used as the home/landing title and the fallback for routes with no title. */
	defaultTitle: "Stepperize",
	defaultDescription:
		"Build type-safe wizards, forms, and onboarding flows in React or any framework.",
	homeOgTitle: "Type-safe multi-step flows for React and any framework",
	homeOgDescription:
		"Validation in next(), declarative branching, resumable snapshots and accessible primitives. React first.",
	twitterCard: "summary_large_image",
} as const;

/** Resolve a path or absolute URL to an absolute URL on the canonical host. */
export function absoluteUrl(pathOrUrl: string): string {
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	return `${SITE.url}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
