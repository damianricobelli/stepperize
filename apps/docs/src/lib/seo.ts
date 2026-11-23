import {
	CURRENT_DOCS_VERSION,
	getCanonicalDocsPath,
	getDocsFramework,
	getDocsVersion,
} from "./docs-tree";
import { FRAMEWORKS } from "./frameworks";
/**
 * Centralized SEO helpers for the docs site.
 *
 * Every route builds its `<head>` from {@link seo}, so titles, descriptions,
 * Open Graph fields, Twitter card fields and canonical URLs stay consistent and
 * unique. The OG API owns social image URL construction and rendering.
 * Structured-data builders emit JSON-LD that search engines use for rich
 * results (software listing, article, breadcrumbs, FAQ).
 */

import type { BlockMeta } from "@/lib/blocks/catalog.d.mts";
import { BLOCKS } from "@/lib/blocks/catalog.mjs";
import { ogImageUrl } from "@/lib/og";
import { absoluteUrl, SITE } from "@/lib/site";

export { absoluteUrl, SITE } from "@/lib/site";

type HeadMeta =
	| { title: string }
	| { name: string; content: string }
	| { property: string; content: string };

type HeadLink = { rel: string; href: string; [key: string]: string };

const SOCIAL_TITLE_MAX = 58;
const SOCIAL_DESCRIPTION_MAX = 118;

export type SeoInput = {
	/** Page title without the brand suffix. Falls back to the site default. */
	title?: string;
	/** Use to set the exact `<title>` (no suffix appended). */
	fullTitle?: string;
	description?: string;
	/** Explicit social preview title. Falls back to the route title/fullTitle. */
	socialTitle?: string;
	/** Explicit social preview description. Falls back to description. */
	socialDescription?: string;
	keywords?: readonly string[];
	/** Path (e.g. `/docs/latest`) or absolute URL. Drives canonical + og:url. */
	canonical?: string;
	/** Fully resolved social image URL. Defaults to the OG API image for this content. */
	socialImageUrl?: string;
	type?: "website" | "article";
};

/**
 * Build the `meta` and `links` head fragments for a route. Deeper routes
 * override the root defaults because TanStack merges head entries by key.
 */
export function seo(input: SeoInput = {}): {
	meta: HeadMeta[];
	links: HeadLink[];
} {
	const title = input.fullTitle
		? input.fullTitle
		: input.title
			? `${input.title} — ${SITE.titleSuffix}`
			: SITE.defaultTitle;
	const description = input.description ?? SITE.defaultDescription;
	const socialTitle = input.socialTitle
		? normalizeSeoText(input.socialTitle)
		: compactSeoText(
				input.title ?? input.fullTitle ?? SITE.name,
				SOCIAL_TITLE_MAX,
			);
	const socialDescription = input.socialDescription
		? normalizeSeoText(input.socialDescription)
		: compactSeoText(description, SOCIAL_DESCRIPTION_MAX);
	const image =
		input.socialImageUrl ??
		ogImageUrl({
			title: socialTitle,
			description: socialDescription,
			variant: input.type ?? "website",
		});
	const url = input.canonical ? absoluteUrl(input.canonical) : undefined;

	const meta: HeadMeta[] = [
		{ title },
		{ name: "description", content: description },
		{ name: "application-name", content: SITE.name },
		{ property: "og:type", content: input.type ?? "website" },
		{ property: "og:site_name", content: SITE.name },
		{ property: "og:title", content: socialTitle },
		{ property: "og:description", content: socialDescription },
		{ property: "og:image", content: image },
		{ name: "twitter:card", content: SITE.twitterCard },
		{ name: "twitter:title", content: socialTitle },
		{ name: "twitter:description", content: socialDescription },
		{ name: "twitter:image", content: image },
	];

	if (input.keywords?.length) {
		meta.push({ name: "keywords", content: input.keywords.join(", ") });
	}
	if (url) {
		meta.push({ property: "og:url", content: url });
	}

	const links: HeadLink[] = url ? [{ rel: "canonical", href: url }] : [];

	return { meta, links };
}

export function compactSeoText(text: string, maxLength: number): string {
	const normalized = normalizeSeoText(text);

	if (normalized.length <= maxLength) return normalized;

	const candidate = normalized.slice(0, maxLength + 1);
	const lastSpace = candidate.lastIndexOf(" ");
	const end = lastSpace > Math.floor(maxLength * 0.65) ? lastSpace : maxLength;

	return `${normalized
		.slice(0, end)
		.trimEnd()
		.replace(/[.,;:!?-]+$/, "")}...`;
}

function normalizeSeoText(text: string): string {
	return text.trim().replace(/\s+/g, " ");
}

/** Wrap a JSON-LD object as a TanStack head `scripts` entry. */
export function jsonLdScript(data: unknown): {
	type: string;
	children: string;
} {
	return {
		type: "application/ld+json",
		children: JSON.stringify(data),
	};
}

/** SoftwareApplication / SoftwareSourceCode listing for the landing page. */
export function softwareApplicationLd() {
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: SITE.name,
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Web, Node.js",
		description: SITE.defaultDescription,
		url: SITE.url,
		image: ogImageUrl({
			title: SITE.homeOgTitle,
			description: SITE.homeOgDescription,
			variant: "website",
		}),
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		license: "https://opensource.org/licenses/MIT",
		programmingLanguage: "TypeScript",
		keywords: HOME_KEYWORDS.join(", "),
		sameAs: ["https://github.com/damianricobelli/stepperize"],
	};
}

/** Marks the canonical site search box for sitelinks. */
export function webSiteLd() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE.name,
		url: SITE.url,
		description: SITE.defaultDescription,
	};
}

/** TechArticle for a documentation page. */
export function techArticleLd(opts: {
	title: string;
	description?: string;
	url: string;
	lastModified?: string;
}) {
	return {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: opts.title,
		description: opts.description ?? SITE.defaultDescription,
		url: absoluteUrl(opts.url),
		...(opts.lastModified ? { dateModified: opts.lastModified } : {}),
		image: ogImageUrl({
			title: opts.title,
			description: opts.description,
			variant: "article",
		}),
		author: { "@type": "Organization", name: SITE.name, url: SITE.url },
		publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
		isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
	};
}

/** BreadcrumbList from `[{name, url}]` trail. */
export function breadcrumbLd(items: { name: string; url: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: absoluteUrl(item.url),
		})),
	};
}

/** FAQPage from `[{question, answer}]` pairs. */
export function faqPageLd(qa: { question: string; answer: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: qa.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: { "@type": "Answer", text: item.answer },
		})),
	};
}

/** Title/description/OG copy for the landing page. */
export type HomeMeta = {
	title: string;
	description: string;
	socialTitle: string;
	socialDescription: string;
};

const HOME_META: HomeMeta = {
	title: SITE.defaultTitle,
	description: SITE.defaultDescription,
	socialTitle: SITE.homeOgTitle,
	socialDescription: SITE.homeOgDescription,
};

/** Resolve landing-page metadata. */
export function homeMeta(): HomeMeta {
	return HOME_META;
}

/**
 * Home/landing keyword targets — the high-intent searches developers actually
 * use, balanced against the "flow engine" positioning.
 */
export const HOME_KEYWORDS = [
	"React stepper",
	"React wizard",
	"multi-step form React",
	"multi-step flow",
	"headless stepper",
	"type-safe stepper",
	"React flow engine",
	"React onboarding flow",
	"React checkout flow",
	"React form wizard",
	"React wizard library",
	"type-safe multi-step form",
	"stepper component React",
] as const;

/** Resolve the home keyword set. */
export function homeKeywords(): readonly string[] {
	return HOME_KEYWORDS;
}

/* ────────────────────────────── Blocks SEO ──────────────────────────────── */

/** High-intent search targets for the Blocks gallery. */
export const BLOCKS_KEYWORDS = [
	"stepper blocks",
	"React stepper examples",
	"multi-step form examples",
	"wizard UI blocks",
	"shadcn stepper blocks",
	"Stepperize registry",
	"React wizard patterns",
	"copy paste stepper",
	"headless stepper components",
] as const;

/** Title/description/OG copy for the Blocks gallery index. */
export function blocksMeta(): HomeMeta {
	return {
		title: "Stepper Blocks",
		description:
			"Production-ready, accessible stepper blocks built with Stepperize and shadcn/ui. Preview them live, copy the code, open them in v0, or install from the registry.",
		socialTitle: "Production-ready stepper blocks",
		socialDescription:
			"Complete, accessible, customizable stepper flows. Preview live, copy the code, or install from the registry.",
	};
}

/** Title/description/keywords for a single block detail page. */
export function blockSeoMeta(block: BlockMeta): {
	title: string;
	description: string;
	keywords: string[];
} {
	return {
		title: `${block.title} — Stepper Block`,
		description: block.description,
		keywords: [
			block.title.toLowerCase(),
			...block.tags,
			...BLOCKS_KEYWORDS.slice(0, 4),
		],
	};
}

/** CollectionPage JSON-LD listing every block on the gallery. */
export function blocksCollectionLd() {
	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: "Stepper Blocks",
		description: blocksMeta().description,
		url: absoluteUrl("/blocks"),
		isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
		hasPart: BLOCKS.map((block) => ({
			"@type": "SoftwareSourceCode",
			name: block.title,
			description: block.description,
			url: absoluteUrl(`/blocks/${block.id}`),
			programmingLanguage: "TypeScript",
			runtimePlatform: "React",
		})),
	};
}

/** SoftwareSourceCode JSON-LD for a single block. */
export function blockSourceCodeLd(block: BlockMeta) {
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareSourceCode",
		name: block.title,
		description: block.description,
		url: absoluteUrl(`/blocks/${block.id}`),
		programmingLanguage: "TypeScript",
		runtimePlatform: "React",
		codeSampleType: "code snippet",
		author: { "@type": "Organization", name: SITE.name, url: SITE.url },
		isPartOf: {
			"@type": "CollectionPage",
			name: "Stepper Blocks",
			url: absoluteUrl("/blocks"),
		},
	};
}

/**
 * Per-route secondary keyword targets, keyed by the docs splat (the part after
 * `/docs/`). Used to enrich `<meta name="keywords">` and align each page with a
 * specific search intent.
 *
 * `current/...` keys describe the current version, whatever its number is.
 * `latest/...` keys are the v7 and v8 pages, which shared one structure.
 */
export const DOC_KEYWORDS: Record<string, readonly string[]> = {
	"current/react": [
		"React stepper",
		"multi-step flow",
		"headless stepper",
		"React wizard",
	],
	"current/react/installation": [
		"install React stepper",
		"@stepperize/react",
		"npm React wizard",
	],
	"current/react/first-stepper": [
		"React stepper tutorial",
		"build a multi-step form",
		"React wizard example",
	],
	"current/react/migration": [
		"Stepperize v9 migration",
		"upgrade Stepperize",
		"Stepperize codemod",
	],
	"current/react/migration-agent": [
		"Stepperize v9 migration",
		"AI agent migration",
		"coding agent upgrade prompt",
	],
	"current/react/concepts/steps": [
		"stepper steps",
		"typed steps React",
		"step ids",
	],
	"current/react/concepts/stepper": [
		"useStepper",
		"stepper state React",
		"flow state",
	],
	"current/react/concepts/moves": [
		"stepper navigation lifecycle",
		"next prev goTo",
		"navigation guard React",
	],
	"current/react/concepts/step-state": [
		"step state",
		"step completion",
		"current step React",
	],
	"current/react/guides/navigation": [
		"stepper navigation",
		"linear stepper",
		"next prev step React",
	],
	"current/react/guides/branching": [
		"branching flow React",
		"conditional steps",
		"skip steps wizard",
	],
	"current/react/guides/persistence": [
		"save and resume form",
		"persist multi-step form",
		"stepper snapshot",
	],
	"current/react/guides/url": [
		"stepper URL sync",
		"step in the URL",
		"router multi-step form",
	],
	"current/react/guides/shared-state": [
		"share stepper state",
		"stepper Provider",
		"useStepperContext",
	],
	"current/react/guides/activity": [
		"React Activity",
		"keep form state between steps",
		"hidden step state",
	],
	"current/react/guides/validation": [
		"stepper schema validation",
		"Zod multi-step form",
		"Standard Schema",
	],
	"current/react/guides/primitives": [
		"headless stepper primitives",
		"accessible stepper",
		"custom stepper UI",
	],
	"current/react/guides/styling": [
		"style stepper",
		"stepper data attributes",
		"Tailwind stepper",
	],
	"current/react/guides/accessibility": [
		"accessible stepper",
		"stepper ARIA",
		"keyboard navigation stepper",
	],
	"current/react/guides/testing": [
		"test multi-step form",
		"stepper unit test",
		"Vitest wizard",
	],
	"current/react/forms": [
		"multi-step form React",
		"React form wizard",
		"multi-step form validation",
	],
	"current/react/forms/patterns": [
		"multi-step form pattern",
		"wizard form state",
		"step validation",
	],
	"current/react/forms/common-problems": [
		"multi-step form problems",
		"wizard form bugs",
		"lost form state",
	],
	"current/react/forms/react-hook-form": [
		"React Hook Form multi-step",
		"React Hook Form wizard",
		"multi-step form RHF",
	],
	"current/react/forms/tanstack-form": [
		"TanStack Form multi-step",
		"TanStack Form wizard",
		"multi-step form",
	],
	"current/react/forms/conform": [
		"Conform multi-step form",
		"Conform wizard",
		"server-side form validation",
	],
	"current/react/api/define-stepper": [
		"defineStepper",
		"useStepper hook",
		"React stepper API",
	],
	"current/react/api/options": [
		"stepper options",
		"linear stepper",
		"onFinish guard",
	],
	"current/react/api/stepper": [
		"stepper API",
		"useStepper return",
		"stepper methods",
	],
	"current/react/api/primitives": [
		"Stepper primitives",
		"headless stepper components",
		"accessible stepper",
	],
	"current/react/faq": [
		"React stepper FAQ",
		"multi-step form questions",
		"headless stepper",
	],
	"current/react/troubleshooting": [
		"React stepper errors",
		"multi-step form bugs",
		"stepper not working",
	],
	"current/react/changelog": ["Stepperize changelog", "Stepperize v9"],
	"current/react/checklist": [
		"production stepper",
		"accessible multi-step form",
		"SSR stepper",
	],
	"current/vue": [
		"Vue stepper",
		"Vue wizard",
		"multi-step flow Vue",
		"headless stepper Vue",
	],
	"current/vue/installation": [
		"install Vue stepper",
		"@stepperize/vue",
		"Vue 3 wizard package",
	],
	"current/vue/first-stepper": [
		"Vue stepper tutorial",
		"Vue multi-step example",
		"useStepper Vue",
	],
	"current/vue/guides/forms": [
		"Vue multi-step form",
		"v-model stepper",
		"Vue form wizard validation",
	],
	"current/vue/guides/shared-state": [
		"Vue stepper provide inject",
		"useStepperContext Vue",
		"shared stepper state",
	],
	"current/vue/guides/url": [
		"Vue Router stepper",
		"step in URL Vue",
		"wizard route sync",
	],
	"current/vue/guides/ssr": [
		"Nuxt stepper",
		"Vue SSR wizard",
		"stepper hydration",
	],
	"current/vue/guides/primitives": [
		"Vue stepper components",
		"accessible stepper Vue",
		"unstyled stepper Vue",
	],
	"current/vue/api/define-stepper": [
		"defineStepper Vue",
		"useStepper composable",
		"Stepperize Vue API",
	],
	"current/vue/api/primitives": [
		"Vue stepper props",
		"Stepper slots",
		"as-child stepper",
	],
	"current/svelte": [
		"Svelte stepper",
		"Svelte 5 wizard",
		"multi-step flow Svelte",
		"headless stepper Svelte",
	],
	"current/svelte/installation": [
		"install Svelte stepper",
		"@stepperize/svelte",
		"Svelte 5 wizard package",
	],
	"current/svelte/first-stepper": [
		"Svelte stepper tutorial",
		"Svelte multi-step example",
		"runes stepper",
	],
	"current/svelte/guides/forms": [
		"Svelte multi-step form",
		"bind:value stepper",
		"Svelte form wizard validation",
	],
	"current/svelte/guides/shared-state": [
		"Svelte stepper context",
		"useStepperContext Svelte",
		"shared stepper state",
	],
	"current/svelte/guides/url": [
		"SvelteKit stepper",
		"step in URL SvelteKit",
		"wizard route sync",
	],
	"current/svelte/guides/ssr": [
		"SvelteKit SSR wizard",
		"Svelte stepper hydration",
		"server rendered stepper",
	],
	"current/svelte/guides/primitives": [
		"Svelte stepper components",
		"accessible stepper Svelte",
		"unstyled stepper Svelte",
	],
	"current/svelte/api/define-stepper": [
		"defineStepper Svelte",
		"useStepper Svelte",
		"Stepperize Svelte API",
	],
	"current/svelte/api/primitives": [
		"Svelte stepper props",
		"Stepper snippets",
		"child snippet stepper",
	],
	"current/solid": [
		"Solid stepper",
		"SolidJS wizard",
		"multi-step flow Solid",
		"headless stepper Solid",
	],
	"current/solid/installation": [
		"install Solid stepper",
		"@stepperize/solid",
		"SolidJS wizard package",
	],
	"current/solid/first-stepper": [
		"Solid stepper tutorial",
		"SolidJS multi-step example",
		"useStepper Solid",
	],
	"current/solid/guides/forms": [
		"Solid multi-step form",
		"createStore stepper",
		"SolidJS form wizard validation",
	],
	"current/solid/guides/shared-state": [
		"Solid stepper context",
		"useStepperContext Solid",
		"shared stepper state",
	],
	"current/solid/guides/url": [
		"Solid Router stepper",
		"step in URL SolidStart",
		"wizard route sync",
	],
	"current/solid/guides/ssr": [
		"SolidStart stepper",
		"Solid SSR wizard",
		"stepper hydration",
	],
	"current/solid/guides/primitives": [
		"Solid stepper components",
		"accessible stepper Solid",
		"unstyled stepper Solid",
	],
	"current/solid/api/define-stepper": [
		"defineStepper Solid",
		"useStepper Solid",
		"Stepperize Solid API",
	],
	"current/solid/api/primitives": [
		"Solid stepper props",
		"Stepper as prop",
		"polymorphic stepper Solid",
	],
	"current/core": [
		"@stepperize/core",
		"framework-agnostic stepper",
		"stepper state machine",
	],
	"current/core/create-stepper": [
		"createStepper",
		"framework-agnostic stepper",
		"stepper store subscribe",
	],
	"current/core/errors": [
		"Stepperize errors",
		"Stepperize warnings",
		"stepper error codes",
	],
	latest: ["React stepper", "multi-step flow", "headless stepper", "wizard"],
	"latest/getting-started/installation": [
		"install React stepper",
		"@stepperize/react",
		"npm React wizard",
	],
	"latest/getting-started/first-stepper": [
		"React stepper tutorial",
		"build a multi-step form",
		"React wizard example",
	],
	"latest/getting-started/concepts": [
		"stepper steps",
		"typed steps React",
		"step ids",
	],
	"latest/getting-started/faq": [
		"React stepper FAQ",
		"multi-step form questions",
		"headless stepper",
	],
	"latest/getting-started/troubleshooting": [
		"React stepper errors",
		"multi-step form bugs",
		"stepper not working",
	],
	"latest/core-concepts/stepper-instance": [
		"useStepper",
		"stepper instance API",
		"React stepper state",
	],
	"latest/core-concepts/navigation-lifecycle": [
		"stepper navigation",
		"transition guard React",
		"beforeStepChange",
	],
	"latest/core-concepts/status-vs-completion": [
		"stepper status",
		"step completion state",
		"active step React",
	],
	"latest/core-concepts/controlled-vs-uncontrolled": [
		"controlled stepper",
		"URL synced step",
		"stepper state management",
	],
	"latest/forms": [
		"multi-step form React",
		"React form wizard",
		"multi-step form validation",
	],
	"latest/forms/patterns": [
		"multi-step form pattern",
		"wizard form state",
		"step validation",
	],
	"latest/forms/schema-validation": [
		"stepper schema validation",
		"Zod multi-step form",
		"Standard Schema",
	],
	"latest/forms/react-hook-form": [
		"React Hook Form multi-step",
		"React Hook Form wizard",
		"multi-step form RHF",
	],
	"latest/forms/tanstack-form": [
		"TanStack Form multi-step",
		"TanStack Form wizard",
		"multi-step form",
	],
	"latest/forms/conform": [
		"Conform multi-step form",
		"Conform wizard",
		"server-side form validation",
	],
	"latest/forms/common-problems": [
		"multi-step form problems",
		"wizard form bugs",
		"lost form state",
	],
	"latest/blocks": [
		"React stepper examples",
		"shadcn stepper",
		"copy paste stepper",
		"stepper components",
	],
	"latest/blocks/onboarding": [
		"onboarding flow React",
		"SaaS onboarding stepper",
		"team invite flow",
		"multi-step onboarding form",
	],
	"latest/blocks/commerce": [
		"checkout stepper",
		"appointment booking flow",
		"subscription billing wizard",
	],
	"latest/blocks/auth": [
		"KYC verification flow",
		"two-factor setup wizard",
		"identity verification React",
	],
	"latest/blocks/flow-steppers": [
		"React wizard examples",
		"order tracking timeline",
		"approval flow",
		"async status stepper",
	],
	"latest/blocks/flow-logic": [
		"branching flow React",
		"async stepper",
		"decision tree React",
		"stepper validation",
	],
	"latest/blocks/patterns": [
		"stepper UI",
		"progress bar stepper",
		"vertical stepper",
		"breadcrumb stepper",
	],
	"latest/guides/navigation": [
		"stepper navigation",
		"next prev step React",
		"reset stepper",
	],
	"latest/guides/primitives": [
		"headless stepper primitives",
		"accessible stepper",
		"custom stepper UI",
	],
	"latest/guides/styling": [
		"style stepper",
		"stepper data-status",
		"Tailwind stepper",
		"stepper data attributes",
	],
	"latest/guides/shared-state": [
		"share stepper state",
		"stepper provider",
		"controlled stepper",
	],
	"latest/api/react/define-stepper": [
		"defineStepper",
		"typed stepper definition",
		"React stepper API",
	],
	"latest/api/react/use-stepper": [
		"useStepper hook",
		"React stepper hook",
		"stepper state hook",
	],
	"latest/api/react/primitives": [
		"Stepper primitives",
		"headless stepper components",
		"accessible stepper",
	],
	"latest/api/react/provider": [
		"stepper Provider",
		"share stepper instance",
		"React context stepper",
	],
	"latest/api/react/stepper-instance": [
		"stepper instance API",
		"useStepper return",
		"stepper methods",
	],
	"latest/api/react/types": ["Stepperize types", "TypeScript stepper types"],
	"latest/api/core/overview": [
		"@stepperize/core",
		"framework-agnostic stepper",
		"stepper helpers",
	],
	"latest/migration/v8": [
		"Stepperize v8 migration",
		"React 18",
		"useStepperContext",
		"NavigationResult",
	],
	"latest/guides/local-and-shared-state": [
		"local stepper",
		"shared stepper",
		"Provider",
		"useStepperContext",
	],
	"latest/api/react/use-stepper-context": [
		"useStepperContext",
		"stepper selector",
		"shared state",
	],
	"latest/migration/v7": [
		"Stepperize v7 migration",
		"upgrade Stepperize",
		"flat stepper API",
	],
	"latest/production/checklist": [
		"production stepper",
		"accessible multi-step form",
		"SSR stepper",
	],
};

const CURRENT_VERSION_PREFIX = new RegExp(`^${CURRENT_DOCS_VERSION}(?=/|$)`);

/** Resolve the keyword set for a docs splat. */
export function docKeywords(splat: string): readonly string[] | undefined {
	const normalized = splat
		.replace(CURRENT_VERSION_PREFIX, "current")
		.replace(/^(v8|v7)(?=\/|$)/, "latest");
	return DOC_KEYWORDS[normalized];
}

const SECTION_LABELS: Record<string, string> = {
	"getting-started": "Getting started",
	"core-concepts": "Core concepts",
	guides: "Guides",
	forms: "Forms",
	blocks: "Blocks",
	api: "API",
	migration: "Migration",
	production: "Production",
};

type Crumb = { name: string; url: string };

/**
 * Build a breadcrumb trail (Home → version or framework → section → page) from
 * a docs splat. Search engines follow every crumb, so a level is only listed
 * when `hasPage` says its URL exists: `api` in `/docs/v7/api/react/x` is a
 * folder, not a page.
 */
export function docsBreadcrumb(
	splat: string,
	pageTitle: string,
	hasPage: (path: string) => boolean,
): Crumb[] {
	const segments = splat.split("/").filter(Boolean);
	const version = getDocsVersion(segments);
	const framework = getDocsFramework(segments);
	const page = getCanonicalDocsPath(segments);
	// The canonical path always carries the version, and the framework when the version has them.
	const home = `/docs/${[version, framework].filter(Boolean).join("/")}`;
	const rest = page.slice(home.length).split("/").filter(Boolean);
	const title = FRAMEWORKS.find((entry) => entry.id === framework)?.title;

	const levels: Crumb[] = [
		{ name: title ? `${title} ${version}` : `Docs ${version}`, url: home },
	];
	if (rest.length > 1) {
		levels.push({
			name: SECTION_LABELS[rest[0]] ?? humanize(rest[0]),
			url: `${home}/${rest[0]}`,
		});
	}
	return [
		{ name: "Stepperize", url: "/" },
		...levels.filter((level) => level.url !== page && hasPage(level.url)),
		{ name: pageTitle, url: page },
	];
}

function humanize(slug: string): string {
	return slug
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

/**
 * The question and answer pairs of a FAQ page, read from its markdown: every
 * `##` heading is a question and the prose below it the answer. `FAQPage`
 * JSON-LD must say what the page says, so it is derived rather than copied.
 */
export function faqFromMarkdown(
	markdown: string,
): { question: string; answer: string }[] {
	const plain = (text: string) =>
		text
			.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
			.replace(/<[^>]+>/g, "")
			// The id Fumadocs appends to a processed heading.
			.replace(/\s*\[#[^\]]*\]\s*$/gm, "")
			// Tables: drop the separator row, read the cells as a sentence.
			.replace(/^\s*\|[\s:|-]+\|\s*$/gm, "")
			.replace(/\s*\|\s*/g, " ")
			.replace(/(\*\*|__|`)/g, "")
			.replace(/^\s*[-*]\s+/gm, "")
			.replace(/\s+/g, " ")
			.trim();
	return markdown
		.replace(/^\s*```[\s\S]*?^\s*```\s*$/gm, "")
		.split(/^## /m)
		.slice(1)
		.map((block) => {
			const end = block.indexOf("\n");
			return {
				question: plain(end === -1 ? block : block.slice(0, end)),
				answer: plain(end === -1 ? "" : block.slice(end)),
			};
		})
		.filter((item) => item.question && item.answer);
}
