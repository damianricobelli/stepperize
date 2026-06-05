import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlockDetail } from "@/components/blocks-gallery/block-detail";
import { getBlock, getBlockCode } from "@/lib/blocks";
import { highlightCode } from "@/lib/highlight";
import {
	blockSeoMeta,
	blockSourceCodeLd,
	breadcrumbLd,
	jsonLdScript,
	seo,
} from "@/lib/seo";

export const Route = createFileRoute("/blocks/$blockId")({
	component: BlockDetailPage,
	loader: async ({ params }) => {
		const block = getBlock(params.blockId);
		if (!block) throw notFound();
		const code = getBlockCode(block.id);
		const { html } = await highlightCode({ data: { code, lang: "tsx" } });
		return { codeHtml: html };
	},
	head: ({ params }) => {
		const block = getBlock(params.blockId);
		if (!block) {
			return seo({
				title: "Block not found",
				canonical: `/blocks/${params.blockId}`,
			});
		}
		const meta = blockSeoMeta(block);
		return {
			...seo({
				title: meta.title,
				description: meta.description,
				keywords: meta.keywords,
				canonical: `/blocks/${block.id}`,
				type: "article",
			}),
			scripts: [
				jsonLdScript(blockSourceCodeLd(block)),
				jsonLdScript(
					breadcrumbLd([
						{ name: "Stepperize", url: "/" },
						{ name: "Blocks", url: "/blocks" },
						{ name: block.title, url: `/blocks/${block.id}` },
					]),
				),
			],
		};
	},
});

function BlockDetailPage() {
	const { blockId } = Route.useParams();
	const { codeHtml } = Route.useLoaderData();
	const block = getBlock(blockId);
	if (!block) return null;
	return <BlockDetail block={block} codeHtml={codeHtml} />;
}
