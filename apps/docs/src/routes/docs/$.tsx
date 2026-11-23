import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { type DocsPageProps, renderDocsPage } from "@/components/docs-page";
import { DocsSwitcher } from "@/components/docs-switcher";
import {
	getCanonicalDocsPath,
	getDocsFramework,
	getDocsPageSlugs,
	getDocsTree,
	getDocsVersion,
	getFrameworkOptions,
	getVersionOptions,
	hasDocsVersion,
	LEGACY_DOCS_VERSION,
} from "@/lib/docs-tree";
import { isDocsFramework } from "@/lib/frameworks";
import { baseOptions } from "@/lib/layout.shared";
import { retiredReactPage } from "@/lib/legacy-redirects";
import {
	breadcrumbLd,
	docKeywords,
	docsBreadcrumb,
	faqFromMarkdown,
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
	beforeLoad: ({ params, location }) => {
		const splat = params._splat ?? "";
		if (/^(latest|v8)\/blocks(?:\/|$)/.test(splat)) {
			const page = splat.replace(/^(latest|v8)\/blocks\/?/, "").split("#")[0];
			const category = BLOCKS_CATEGORY_REDIRECTS[page];
			throw redirect({
				to: "/blocks",
				search: category ? { category } : {},
			});
		}
		const retired = retiredReactPage(splat);
		if (retired) {
			throw redirect({ href: retired, replace: true });
		}
		const slugs = splat.split("/").filter(Boolean);
		const canonical = getCanonicalDocsPath(slugs);
		// A URL without a version is resolved by the loader, which knows which pages exist.
		if (hasDocsVersion(slugs) && `/docs/${splat}` !== canonical) {
			throw redirect({
				href:
					canonical +
					location.searchStr +
					(location.hash ? `#${location.hash}` : ""),
				replace: true,
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
		];
		if (loaderData?.breadcrumb) {
			scripts.push(jsonLdScript(breadcrumbLd(loaderData.breadcrumb)));
		}
		if (loaderData?.faq?.length) {
			scripts.push(jsonLdScript(faqPageLd(loaderData.faq)));
		}

		const head = seo({
			fullTitle: title,
			description,
			keywords: docKeywords(splat),
			canonical,
			type: "article",
		});
		return {
			...head,
			links: [
				...head.links,
				// The same page as markdown, for LLMs and coding agents.
				{
					rel: "alternate",
					type: "text/markdown",
					href: `/llms.mdx/${getDocsPageSlugs(splat.split("/").filter(Boolean)).join("/")}`,
				},
			],
			scripts,
		};
	},
});

const loadDocsPage = createServerFn({ method: "GET" })
	.validator((data: { slugs: string[] }) => data)
	.handler(async ({ data }) => {
		const pageSlugs = getDocsPageSlugs(data.slugs);
		const page = source.getPage(pageSlugs);

		if (!hasDocsVersion(data.slugs)) {
			// Links written before v9 carry no version: the ones v9 has no page for still open in v8.
			const legacy = [
				LEGACY_DOCS_VERSION,
				...(data.slugs[0] === "latest" ? data.slugs.slice(1) : data.slugs),
			];
			const target = page
				? data.slugs
				: source.getPage(getDocsPageSlugs(legacy)) && legacy;
			if (target) {
				throw redirect({ href: getCanonicalDocsPath(target), replace: true });
			}
			// A framework URL without a version that names no page, such as a link to
			// the site before v7: open that framework rather than a dead end.
			if (isDocsFramework(data.slugs[0])) {
				throw redirect({
					href: getCanonicalDocsPath([data.slugs[0]]),
					replace: true,
				});
			}
		}

		if (!page) {
			throw notFound();
		}

		const pageTree = getDocsTree(
			source.getPageTree(),
			getDocsVersion(data.slugs),
			getDocsFramework(data.slugs),
		);

		const hasPage = (path: string) =>
			!!source.getPage(path.split("/").filter(Boolean));

		return serializeLoaderData({
			breadcrumb: docsBreadcrumb(
				data.slugs.join("/"),
				page.data.title,
				hasPage,
			),
			description: page.data.description,
			editPath: `apps/docs/content/docs/${page.path}`,
			// Every version names its FAQ page `faq`.
			faq:
				pageSlugs.at(-1) === "faq"
					? faqFromMarkdown(await page.data.getText("processed"))
					: undefined,
			full: page.data.full,
			lastModified: page.data.lastModified?.toISOString(),
			pageTree: await source.serializePageTree(pageTree),
			version: getDocsVersion(data.slugs),
			path: page.path,
			switcher: {
				frameworks: getFrameworkOptions(data.slugs, hasPage),
				versions: getVersionOptions(data.slugs),
			},
			title: page.data.title,
			toc: [],
		} satisfies DocsPageProps & {
			breadcrumb: ReturnType<typeof docsBreadcrumb>;
			faq: ReturnType<typeof faqFromMarkdown> | undefined;
			pageTree: Awaited<ReturnType<typeof source.serializePageTree>>;
			path: string;
			switcher: {
				frameworks: ReturnType<typeof getFrameworkOptions>;
				versions: ReturnType<typeof getVersionOptions>;
			};
			version: string;
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
			sidebar={{ banner: <DocsSwitcher {...data.switcher} /> }}
			tabs={false}
			tree={data.pageTree}
		>
			{clientLoader.useContent(data.path, data)}
		</DocsLayout>
	);
}
