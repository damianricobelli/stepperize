export const SITE = {
	url: "https://stepperize.com",
	name: "Stepperize",
	/** Brand suffix appended to page titles. */
	titleSuffix: "Stepperize",
	/** The fallback `<title>` for routes with no title. */
	defaultTitle: "Stepperize",
	/**
	 * The landing page's `<title>`: the name, then what it is and for whom,
	 * kept near 60 characters so results show it whole.
	 */
	homeTitle: "Stepperize: type-safe multi-step flows for React, Vue and more",
	defaultDescription:
		"Build type-safe wizards, forms, and onboarding flows in React or any framework.",
	homeOgTitle: "Type-safe multi-step flows for React and any framework",
	/** Two lines of the social image at most, so it is never cut. */
	homeOgDescription:
		"Validation in next(), branching and resumable snapshots, in every framework.",
	/** The badge of the home social image: the frameworks, not a docs section. */
	homeOgSection: "React · Vue · Svelte · Solid · Angular · Lit",
	twitterCard: "summary_large_image",
} as const;

/** Resolve a path or absolute URL to an absolute URL on the canonical host. */
export function absoluteUrl(pathOrUrl: string): string {
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	return `${SITE.url}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
