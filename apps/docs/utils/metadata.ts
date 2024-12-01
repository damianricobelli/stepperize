import { source } from "@/app/source";
import { createMetadataImage } from "fumadocs-core/server";
import type { Metadata } from "next/types";

export function createMetadata(override: Metadata): Metadata {
	return {
		...override,
		openGraph: {
			title: override.title ?? undefined,
			description: override.description ?? undefined,
			url: "https://stepperize.vercel.app",
			images: "/banner.png",
			siteName: "Stepperize",
			...override.openGraph,
		},
		twitter: {
			card: "summary_large_image",
			creator: "@damianricobelli",
			title: override.title ?? undefined,
			description: override.description ?? undefined,
			images: "/banner.png",
			...override.twitter,
		},
	};
}

export const baseUrl =
	process.env.NODE_ENV === "development" || !process.env.VERCEL_URL
		? new URL("http://localhost:3000")
		: new URL(`https://${process.env.VERCEL_URL}`);

export const metadataImage = createMetadataImage({
	source,
	imageRoute: "og",
});
