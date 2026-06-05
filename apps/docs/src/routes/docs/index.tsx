import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { type DocsPageProps, renderDocsPage } from "@/components/docs-page";
import { getDocsTree, getDocsVersionTabs } from "@/lib/docs-tree";
import { baseOptions } from "@/lib/layout.shared";
import {
	breadcrumbLd,
	docKeywords,
	jsonLdScript,
	seo,
	techArticleLd,
} from "@/lib/seo";
import { serializeLoaderData } from "@/lib/serialize-loader-data";
import { source } from "@/lib/source";

export const Route = createFileRoute("/docs/")({
	component: Page,
	loader: async () => {
		const data = await loadDocsIndex({
			data: {
				slugs: ["docs", "latest"],
			},
		});

		await clientLoader.preload(data.path);
		return data;
	},
	head: ({ loaderData }) => {
		const title = loaderData?.title ?? "Documentation";
		const description = loaderData?.description;
		const canonical = "/docs/latest";

		return {
			...seo({
				fullTitle: title,
				description,
				keywords: docKeywords("latest"),
				canonical,
				type: "article",
			}),
			scripts: [
				jsonLdScript(techArticleLd({ title, description, url: canonical })),
				jsonLdScript(
					breadcrumbLd([
						{ name: "Stepperize", url: "/" },
						{ name: "Docs", url: canonical },
					]),
				),
			],
		};
	},
});

const loadDocsIndex = createServerFn({ method: "GET" })
	.inputValidator((data: { slugs: string[] }) => data)
	.handler(async ({ data }) => {
		const page = source.getPage(data.slugs);

		if (!page) {
			throw notFound();
		}

		const pageTree = getDocsTree(source.getPageTree(), "latest");

		return serializeLoaderData({
			description: page.data.description,
			editPath: `apps/docs/content/docs/${page.path}`,
			full: page.data.full,
			lastModified: page.data.lastModified?.toISOString(),
			pageTree: await source.serializePageTree(pageTree),
			path: page.path,
			title: page.data.title,
			toc: [],
		} satisfies DocsPageProps & {
			pageTree: Awaited<ReturnType<typeof source.serializePageTree>>;
			path: string;
		});
	});

const clientLoader = browserCollections.docs.createClientLoader({
	component: renderDocsPage,
});

function Page() {
	const data = useFumadocsLoader(Route.useLoaderData());

	return (
		<DocsLayout
			{...baseOptions()}
			tabMode="auto"
			tabs={getDocsVersionTabs()}
			tree={data.pageTree}
		>
			{clientLoader.useContent(data.path, data)}
		</DocsLayout>
	);
}
