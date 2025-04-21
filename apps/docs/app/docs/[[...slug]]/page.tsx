import { DemoViewer } from "@/components/demo-viewer";
import { metadataImage } from "@/lib/metadata";
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

import StepperDemo from "@/registry/new-york/blocks/stepper-demo/stepper-demo";
import StepperWithDescription from "@/registry/new-york/blocks/stepper-with-description/stepper-with-description";
import StepperWithForm from "@/registry/new-york/blocks/stepper-with-form/stepper-with-form";
import StepperWithIcon from "@/registry/new-york/blocks/stepper-with-icon/stepper-with-icon";
import StepperWithLabelOrientation from "@/registry/new-york/blocks/stepper-with-label-orientation/stepper-with-label-orientation";
import StepperWithResponsiveVariant from "@/registry/new-york/blocks/stepper-with-responsive-variant/components/stepper-with-responsive-variant";
import StepperWithTracking from "@/registry/new-york/blocks/stepper-with-tracking/stepper-with-tracking";
import StepperWithVariants from "@/registry/new-york/blocks/stepper-with-variants/stepper-with-variants";

import { OpenInV0 } from "@/components/open-in-v0";

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

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return metadataImage.withImage(page.slugs, {
    title: page.data.title,
    description: page.data.description,
  });
}
