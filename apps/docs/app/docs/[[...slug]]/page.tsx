import { DemoViewer } from "@/components/demo-viewer";
import { source } from "@/lib/source";
import { getPageTreePeers } from "fumadocs-core/server";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import { Card } from "fumadocs-ui/components/card";
import { Cards } from "fumadocs-ui/components/card";
import { CodeBlock } from "fumadocs-ui/components/codeblock";
import { Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";

import { StepperDemo } from "@/registry/new-york/blocks/stepper-demo/components/stepper-demo";
import { StepperWithActivity } from "@/registry/new-york/blocks/stepper-with-activity/components/stepper-with-activity";
import { StepperWithDescription } from "@/registry/new-york/blocks/stepper-with-description/components/stepper-with-description";
import { StepperWithForm } from "@/registry/new-york/blocks/stepper-with-form/components/stepper-with-form";
import { StepperWithIcon } from "@/registry/new-york/blocks/stepper-with-icon/components/stepper-with-icon";
import { StepperWithLabelOrientation } from "@/registry/new-york/blocks/stepper-with-label-orientation/components/stepper-with-label-orientation";
import { StepperWithResponsiveVariant } from "@/registry/new-york/blocks/stepper-with-responsive-variant/components/stepper-with-responsive-variant";
import { StepperWithTracking } from "@/registry/new-york/blocks/stepper-with-tracking/components/stepper-with-tracking";
import { StepperWithVariants } from "@/registry/new-york/blocks/stepper-with-variants/components/stepper-with-variants";

import { OpenInV0 } from "@/components/open-in-v0";

import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  const path = `apps/docs/content/docs/${page.file.path}`;

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
            StepperDemo,
            StepperWithActivity,
            StepperWithDescription,
            StepperWithForm,
            StepperWithIcon,
            StepperWithLabelOrientation,
            StepperWithResponsiveVariant,
            StepperWithTracking,
            StepperWithVariants,
            OpenInV0,
            DocsCategory: ({ url }: { url: string }) => (
              <DocsCategory url={url} />
            ),
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

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const description =
    page.data.description ?? "The library for building stepper components";

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
