import { createFileRoute } from "@tanstack/react-router";
import {
	BlocksGallery,
	type BlocksSearch,
} from "@/components/blocks-gallery/blocks-gallery";
import {
	BLOCKS_KEYWORDS,
	blocksCollectionLd,
	blocksMeta,
	breadcrumbLd,
	jsonLdScript,
	seo,
} from "@/lib/seo";

export const Route = createFileRoute("/blocks/")({
	component: BlocksPage,
	validateSearch: (search: Record<string, unknown>): BlocksSearch => {
		return {
			category:
				typeof search.category === "string" ? search.category : undefined,
			q: typeof search.q === "string" ? search.q : undefined,
		};
	},
	head: () => {
		const meta = blocksMeta();
		return {
			...seo({
				title: meta.title,
				description: meta.description,
				socialTitle: meta.socialTitle,
				socialDescription: meta.socialDescription,
				keywords: BLOCKS_KEYWORDS,
				canonical: "/blocks",
				type: "website",
			}),
			scripts: [
				jsonLdScript(blocksCollectionLd()),
				jsonLdScript(
					breadcrumbLd([
						{ name: "Stepperize", url: "/" },
						{ name: "Blocks", url: "/blocks" },
					]),
				),
			],
		};
	},
});

function BlocksPage() {
	const search = Route.useSearch();
	return <BlocksGallery search={search} />;
}
