import { absoluteUrl, SITE } from "@/lib/site";

export const OG_IMAGE = {
	path: "/api/og",
	width: 1200,
	height: 630,
	defaultSection: "Documentation",
} as const;

export type OgImageVariant = "website" | "article";

export type OgImageDescriptor = {
	title?: string;
	description?: string;
	section?: string;
	variant?: OgImageVariant;
};

export type OgImageProps = Required<
	Pick<OgImageDescriptor, "title" | "description" | "section" | "variant">
>;

const HTML_ENTITIES: Record<string, string> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	quot: '"',
};

function decodeHtmlEntities(text: string): string {
	return text.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity) => {
		if (entity[0] !== "#") {
			return HTML_ENTITIES[entity.toLowerCase()] ?? match;
		}

		const isHex = entity[1]?.toLowerCase() === "x";
		const codePoint = Number.parseInt(
			entity.slice(isHex ? 2 : 1),
			isHex ? 16 : 10,
		);

		if (!Number.isFinite(codePoint)) return match;

		try {
			return String.fromCodePoint(codePoint);
		} catch {
			return match;
		}
	});
}

function decodeHtmlEntitiesDeep(text: string): string {
	let decoded = text;

	for (let i = 0; i < 5; i++) {
		const next = decodeHtmlEntities(decoded);
		if (next === decoded) return decoded;
		decoded = next;
	}

	return decoded;
}

function normalizeOgText(text: string | undefined, fallback: string): string {
	return decodeHtmlEntitiesDeep(text?.trim() || fallback);
}

function normalizeOgCopy(text: string | undefined, fallback: string): string {
	return normalizeOgText(text, fallback)
		.replace(/\s*&\s*/g, " and ")
		.replace(/\s+/g, " ");
}

function parseOgSearchParams(url: string): URLSearchParams {
	const parsed = new URL(url);

	return new URLSearchParams(
		parsed.search.replace(
			/&amp;(?=(?:title|description|section|variant)=)/g,
			"&",
		),
	);
}

export function ogImageUrl(input: OgImageDescriptor = {}): string {
	const params = new URLSearchParams({
		title: normalizeOgCopy(input.title, SITE.name),
		description: normalizeOgCopy(input.description, SITE.defaultDescription),
		section: normalizeOgText(input.section, OG_IMAGE.defaultSection),
		variant: input.variant ?? "website",
	});

	return absoluteUrl(`${OG_IMAGE.path}?${params.toString()}`);
}

export function parseOgImageRequest(url: string): OgImageProps {
	const searchParams = parseOgSearchParams(url);

	return {
		title: normalizeOgCopy(searchParams.get("title") ?? undefined, SITE.name),
		description: normalizeOgCopy(
			searchParams.get("description") ?? undefined,
			SITE.defaultDescription,
		),
		section: normalizeOgText(
			searchParams.get("section") ?? undefined,
			OG_IMAGE.defaultSection,
		),
		variant: searchParams.get("variant") === "article" ? "article" : "website",
	};
}
