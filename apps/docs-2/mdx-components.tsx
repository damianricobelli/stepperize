import { Playground } from "@/components/playground";
import { PropsTable } from "@/components/props-table";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-ui/twoslash/popup";
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		...defaultComponents,
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
		Playground,
		blockquote: (props) => <Callout>{props.children}</Callout>,
		...components,
	};
}
