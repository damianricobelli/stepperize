import { source } from "@/app/source";
import { useMDXComponents } from "@/mdx-components";
import { createMetadata, metadataImage } from "@/utils/metadata";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page(props: {
	params: Promise<{ slug?: string[] }>;
}) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	const MDX = page.data.body;

	const components = useMDXComponents(defaultMdxComponents);

	const path = `apps/docs/content/docs/${page.file.path}`;

	return (
		<DocsPage
			toc={page.data.toc}
			lastUpdate={page.data.lastModified}
			full={page.data.full}
			tableOfContent={{
				style: "clerk",
				single: false,
			}}
			editOnGithub={{
				repo: "stepperize",
				owner: "damianricobelli",
				sha: "main",
				path,
			}}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				<MDX components={{ ...components }} />
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata(props: {
	params: Promise<{ slug?: string[] }>;
}) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	const description = page.data.description ?? "The library for building step-by-step workflows.";

	return createMetadata(
		metadataImage.withImage(page.slugs, {
			title: page.data.title,
			description,
			openGraph: {
				url: `/docs/${page.slugs.join("/")}`,
			},
			icons: {
				icon: "/icon.png",
			},
		}),
	);
}
