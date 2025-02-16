import { DemoViewer } from "@/components/demo-viewer";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		...defaultComponents,
		DemoViewer,
		Tabs,
		Tab,
		Steps,
		Step,
		TypeTable,
		Accordion,
		Accordions,
		CodeBlock,
		Pre,
		blockquote: (props) => <Callout>{props.children}</Callout>,
		...components,
	};
}
