import { createElement } from "react";
import ImageResponse from "takumi-js/response";
import { describe, expect, it } from "vitest";
import { OG_IMAGE, ogImageUrl, parseOgImageRequest } from "@/lib/og";
import { OgImage } from "@/lib/og-image";
import { compactSeoText, homeMeta, seo } from "@/lib/seo";

function metaContent(
	meta: ReturnType<typeof seo>["meta"],
	key: "name" | "property",
	value: string,
) {
	const entry = meta.find((item) => {
		if (key === "name") {
			return "name" in item && item.name === value;
		}

		return "property" in item && item.property === value;
	});

	return entry && "content" in entry ? entry.content : undefined;
}

describe("SEO and OG image boundary", () => {
	it("uses the OG API URL for Open Graph and Twitter image metadata", () => {
		const result = seo({
			title: "First stepper",
			description: "Build a typed multi-step flow.",
			canonical: "/docs/latest/getting-started/first-stepper",
			type: "article",
		});

		const ogImage = metaContent(result.meta, "property", "og:image");
		const twitterImage = metaContent(result.meta, "name", "twitter:image");

		expect(ogImage).toBe(twitterImage);
		expect(ogImage).toContain(`https://stepperize.com${OG_IMAGE.path}?`);
		expect(ogImage).toContain("variant=article");
		expect(ogImage).not.toContain("logo512.png");
	});

	it("uses the route title as the social title without adding the brand suffix", () => {
		const result = seo({
			title: "Installation",
			description: "Install Stepperize with your package manager.",
			canonical: "/docs/latest/getting-started/installation",
			type: "article",
		});

		expect(metaContent(result.meta, "property", "og:title")).toBe(
			"Installation",
		);
		expect(metaContent(result.meta, "name", "twitter:title")).toBe(
			"Installation",
		);
		expect(result.meta).toContainEqual({ title: "Installation — Stepperize" });
	});

	it("allows the home page to use hand-written OG copy", () => {
		const meta = homeMeta();
		const result = seo({
			fullTitle: meta.title,
			description: meta.description,
			socialTitle: meta.socialTitle,
			socialDescription: meta.socialDescription,
			canonical: "/",
		});

		const ogTitle = metaContent(result.meta, "property", "og:title");
		const ogDescription = metaContent(
			result.meta,
			"property",
			"og:description",
		);
		const ogImage = metaContent(result.meta, "property", "og:image");
		const imageProps = parseOgImageRequest(ogImage ?? "");

		expect(meta.title).toBe("Stepperize");
		expect(meta.description).toBe(
			"Build type-safe wizards, forms, and onboarding flows in React.",
		);
		expect(ogTitle).toBe(meta.socialTitle);
		expect(ogDescription).toBe(meta.socialDescription);
		expect(imageProps.title).toBe(ogTitle);
		expect(imageProps.description).toBe(ogDescription);
	});

	it("does not truncate explicit social titles", () => {
		const title =
			"The type-safe way to build wizards, forms & onboarding in React.";
		const result = seo({
			fullTitle: "Stepperize — Type-safe React steppers",
			description: "Build typed, headless multi-step flows in React.",
			socialTitle: title,
			canonical: "/",
		});

		expect(metaContent(result.meta, "property", "og:title")).toBe(title);
		expect(
			parseOgImageRequest(
				metaContent(result.meta, "property", "og:image") ?? "",
			).title,
		).toBe(
			"The type-safe way to build wizards, forms and onboarding in React.",
		);
	});

	it("keeps social title and description compact for OG previews", () => {
		const result = seo({
			fullTitle:
				"Stepperize — Type-safe React stepper, wizard & multi-step flow engine",
			description:
				"Stepperize is a typed, headless flow engine for React. Build multi-step forms, wizards, onboarding, checkout, surveys and approval flows with one small, fully type-safe API. Bring your own UI.",
			canonical: "/",
		});

		const ogTitle = metaContent(result.meta, "property", "og:title");
		const ogDescription = metaContent(
			result.meta,
			"property",
			"og:description",
		);
		const ogImage = metaContent(result.meta, "property", "og:image");
		const imageProps = parseOgImageRequest(ogImage ?? "");

		expect(ogTitle).toBe(
			"Stepperize — Type-safe React stepper, wizard & multi-step...",
		);
		expect(ogDescription).toBe(
			"Stepperize is a typed, headless flow engine for React. Build multi-step forms, wizards, onboarding, checkout, surveys...",
		);
		expect(imageProps.title).toBe(
			"Stepperize — Type-safe React stepper, wizard and multi-step...",
		);
		expect(imageProps.description).toBe(ogDescription);
	});

	it("compacts SEO text on word boundaries", () => {
		expect(compactSeoText("A short title", 58)).toBe("A short title");
		expect(
			compactSeoText(
				"Build reliable multi-step forms, onboarding flows, and checkout wizards",
				42,
			),
		).toBe("Build reliable multi-step forms...");
	});

	it("keeps image URL construction and request parsing in the OG module", () => {
		const url = ogImageUrl({
			title: "Stepperize docs",
			description: "Typed flow engine for React.",
			section: "Guide",
			variant: "article",
		});

		expect(parseOgImageRequest(url)).toEqual({
			title: "Stepperize docs",
			description: "Typed flow engine for React.",
			section: "Guide",
			variant: "article",
		});
	});

	it("replaces ampersands in OG image title and description copy", () => {
		const url = ogImageUrl({
			title: "Wizard &amp; multi-step flows",
			description: "Forms, checkout &amp; onboarding.",
			section: "Docs &amp; guides",
			variant: "article",
		});

		expect(parseOgImageRequest(url)).toEqual({
			title: "Wizard and multi-step flows",
			description: "Forms, checkout and onboarding.",
			section: "Docs & guides",
			variant: "article",
		});

		expect(
			parseOgImageRequest(
				"https://stepperize.com/api/og?title=Wizard%20%26amp%3B%20flows&description=Use%20%26%2338%3B%20reuse",
			),
		).toMatchObject({
			title: "Wizard and flows",
			description: "Use and reuse",
		});
	});

	it("replaces double-escaped ampersands in OG image copy", () => {
		expect(
			parseOgImageRequest(
				"https://stepperize.com/api/og?title=Forms%20%26amp%3Bamp%3B%20onboarding&description=Review%20%26amp%3Bamp%3B%20finish",
			),
		).toMatchObject({
			title: "Forms and onboarding",
			description: "Review and finish",
		});
	});

	it("parses OG image URLs after HTML attribute escaping", () => {
		const escapedUrl =
			"https://stepperize.com/api/og?title=Forms%20%26%20onboarding&amp;description=Typed%20flows&amp;section=Docs&amp;variant=article";

		expect(parseOgImageRequest(escapedUrl)).toEqual({
			title: "Forms and onboarding",
			description: "Typed flows",
			section: "Docs",
			variant: "article",
		});
	});

	it("renders the Takumi OG image response body", async () => {
		const response = new ImageResponse(
			createElement(OgImage, {
				title: "Stepperize docs",
				description: "Typed flow engine for React.",
				section: "Documentation",
				variant: "article",
			}),
			{
				width: OG_IMAGE.width,
				height: OG_IMAGE.height,
			},
		);

		expect(response.headers.get("content-type")).toContain("image/png");
		expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
	});
});
