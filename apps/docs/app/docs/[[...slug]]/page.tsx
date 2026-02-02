import { getPageTreePeers } from "fumadocs-core/page-tree";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import { Card, Cards } from "fumadocs-ui/components/card";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BasicCustomIndicatorPreview } from "@/components/demos/basic-custom-indicator-preview";
import { BasicHorizontalPreview } from "@/components/demos/basic-horizontal-preview";
import { BasicVerticalPreview } from "@/components/demos/basic-vertical-preview";
import { ConformReactPreview } from "@/components/demos/conform-react-preview";
import { FirstStepperPreview } from "@/components/demos/first-stepper-preview";
import { MultiScopedPreview } from "@/components/demos/multi-scoped-preview";
import { ReactHookFormPreview } from "@/components/demos/react-hook-form-preview";
import { ScopedPreview } from "@/components/demos/scoped-preview";
import { DemoViewer } from "@/components/demo-viewer";
import { OpenInV0 } from "@/components/open-in-v0";
import { createMetadata } from "@/lib/metadata";
import { source } from "@/lib/source";
import { StepperDemo } from "@/registry/radix-ui/blocks/stepper-demo/components/stepper-demo";
import { StepperWithDescription } from "@/registry/radix-ui/blocks/stepper-with-description/components/stepper-with-description";
import { StepperWithForm } from "@/registry/radix-ui/blocks/stepper-with-form/components/stepper-with-form";
import { StepperWithIcon } from "@/registry/radix-ui/blocks/stepper-with-icon/components/stepper-with-icon";
import { StepperWithLabelOrientation } from "@/registry/radix-ui/blocks/stepper-with-label-orientation/components/stepper-with-label-orientation";
// import { StepperWithResponsiveVariant } from "@/registry/new-york/blocks/stepper-with-responsive-variant/components/stepper-with-responsive-variant";
import { StepperWithScrollTracking } from "@/registry/radix-ui/blocks/stepper-with-scroll-tracking/components/stepper-with-scroll-tracking";
import { StepperWithVariants } from "@/registry/radix-ui/blocks/stepper-with-variants/components/stepper-with-variants";
import { StepperDemo as StepperDemoBase } from "@/registry/base-ui/blocks/stepper-demo/components/stepper-demo";
import { StepperWithDescription as StepperWithDescriptionBase } from "@/registry/base-ui/blocks/stepper-with-description/components/stepper-with-description";
import { StepperWithForm as StepperWithFormBase } from "@/registry/base-ui/blocks/stepper-with-form/components/stepper-with-form";
import { StepperWithIcon as StepperWithIconBase } from "@/registry/base-ui/blocks/stepper-with-icon/components/stepper-with-icon";
import { StepperWithLabelOrientation as StepperWithLabelOrientationBase } from "@/registry/base-ui/blocks/stepper-with-label-orientation/components/stepper-with-label-orientation";
import { StepperWithScrollTracking as StepperWithScrollTrackingBase } from "@/registry/base-ui/blocks/stepper-with-scroll-tracking/components/stepper-with-scroll-tracking";
import { StepperWithVariants as StepperWithVariantsBase } from "@/registry/base-ui/blocks/stepper-with-variants/components/stepper-with-variants";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) notFound();

	const MDX = page.data.body;

	const path = `apps/docs/content/docs/${page.slugs.join("/")}.mdx`;

	return (
		<DocsPage
			toc={page.data.toc}
			full={page.data.full}
			lastUpdate={page.data.lastModified}
			tableOfContent={{
				style: "clerk",
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
				<MDX
					components={{
						...defaultMdxComponents,
						pre: ({ ref: _ref, ...props }) => (
							<CodeBlock keepBackground {...props}>
								<Pre>{props.children}</Pre>
							</CodeBlock>
						),
						Popup,
						PopupContent,
						PopupTrigger,
						Tabs,
						Tab,
						Steps,
						Step,
						DemoViewer,
						BasicHorizontalPreview,
						BasicVerticalPreview,
						BasicCustomIndicatorPreview,
						ConformReactPreview,
						FirstStepperPreview,
						MultiScopedPreview,
						ReactHookFormPreview,
						ScopedPreview,
						StepperDemo,
						StepperWithDescription,
						StepperWithForm,
						StepperWithIcon,
						StepperWithLabelOrientation,
						StepperWithScrollTracking,
						StepperWithVariants,
						StepperDemoBase,
						StepperWithDescriptionBase,
						StepperWithFormBase,
						StepperWithIconBase,
						StepperWithLabelOrientationBase,
						StepperWithScrollTrackingBase,
						StepperWithVariantsBase,
						OpenInV0,
						DocsCategory: ({ url }: { url: string }) => <DocsCategory url={url} />,
					}}
				/>
			</DocsBody>
		</DocsPage>
	);
}

function DocsCategory({ url }: { url: string }) {
	return (
		<Cards>
			{getPageTreePeers(source.pageTree, url).map((peer) => (
				<Card key={peer.url} title={peer.name} href={peer.url}>
					{peer.description}
				</Card>
			))}
		</Cards>
	);
}

export async function generateMetadata(props: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
	const { slug = [] } = await props.params;
	const page = source.getPage(slug);
	if (!page) notFound();

	const description = page.data.description ?? "The library for building stepper components";

	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

	const image = {
		url: `${baseUrl}/og/${slug.join("/")}/image.png`,
		width: 1200,
		height: 630,
	};

	return createMetadata({
		title: page.data.title,
		description,
		openGraph: {
			url: `${baseUrl}/docs/${page.slugs.join("/")}`,
			images: [image],
		},
		twitter: {
			images: [image],
		},
	});
}

export function generateStaticParams() {
	return source.generateParams();
}
