import { DemoViewer } from "@/components/demo-viewer";
import { PropsTable } from "@/components/props-table";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-ui/twoslash/popup";
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		...defaultComponents,
		DemoViewer,
		Popup,
		PopupContent,
		PopupTrigger,
		Tabs,
		Tab,
		Steps,
		Step,
		TypeTable,
		Accordion,
		Accordions,
		PropsTable,
		CodeBlock,
		Pre,
		blockquote: (props) => <Callout>{props.children}</Callout>,
		...components,
	};
}
