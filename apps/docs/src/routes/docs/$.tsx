import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { type DocsPageProps, renderDocsPage } from "@/components/docs-page";
import {
	getDocsPageSlugs,
	getDocsTree,
	getDocsVersion,
	getDocsVersionTabs,
} from "@/lib/docs-tree";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { baseOptions } from "@/lib/layout.shared";
import {
	breadcrumbLd,
	docKeywords,
	docsBreadcrumb,
	faqPageLd,
	jsonLdScript,
	seo,
	techArticleLd,
} from "@/lib/seo";
import { serializeLoaderData } from "@/lib/serialize-loader-data";
import { source } from "@/lib/source";

// The Blocks docs section was promoted to a first-class gallery at `/blocks`.
// Map the retired docs pages to the matching gallery category.
const BLOCKS_CATEGORY_REDIRECTS: Record<string, string> = {
	patterns: "layouts",
	onboarding: "onboarding",
	commerce: "commerce",
	auth: "auth",
	"flow-steppers": "async",
	"flow-logic": "flow-control",
};

export const Route = createFileRoute("/docs/$")({
	component: Page,
	beforeLoad: ({ params }) => {
		const splat = params._splat ?? "";
		if (splat === "latest/blocks" || splat.startsWith("latest/blocks/")) {
			const page = splat.replace(/^latest\/blocks\/?/, "").split("#")[0];
			const category = BLOCKS_CATEGORY_REDIRECTS[page];
			throw redirect({
				to: "/blocks",
				search: category ? { category } : {},
			});
		}
	},
	loader: async ({ params }) => {
		const data = await loadDocsPage({
			data: {
				slugs: params._splat?.split("/").filter(Boolean) ?? [],
			},
		});

		await clientLoader.preload(data.path);
		return data;
	},
	head: ({ params, loaderData }) => {
		const splat = params._splat ?? "";
		const title = loaderData?.title ?? "Documentation";
		const description = loaderData?.description;
		const canonical = `/docs/${splat}`;
		const lastModified =
			typeof loaderData?.lastModified === "string"
				? loaderData.lastModified
				: undefined;

		const scripts = [
			jsonLdScript(
				techArticleLd({ title, description, url: canonical, lastModified }),
			),
			jsonLdScript(breadcrumbLd(docsBreadcrumb(splat, title))),
		];

		if (splat.endsWith("getting-started/faq")) {
			scripts.push(jsonLdScript(faqPageLd(FAQ_ITEMS)));
		}

		return {
			...seo({
				fullTitle: title,
				description,
				keywords: docKeywords(splat),
				canonical,
				type: "article",
			}),
			scripts,
		};
	},
});

const loadDocsPage = createServerFn({ method: "GET" })
	.inputValidator((data: { slugs: string[] }) => data)
	.handler(async ({ data }) => {
		const pageSlugs = getDocsPageSlugs(data.slugs);
		const page = source.getPage(pageSlugs);

		if (!page) {
			throw notFound();
		}

		const pageTree = getDocsTree(
			source.getPageTree(),
			getDocsVersion(data.slugs),
		);

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
