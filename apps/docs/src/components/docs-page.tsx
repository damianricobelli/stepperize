import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";
import type { ReactNode } from "react";
import { getMDXComponents } from "./mdx";

type ContentModule = {
	default: (props: {
		components?: ReturnType<typeof getMDXComponents>;
	}) => ReactNode | Promise<ReactNode>;
	frontmatter: {
		title?: string;
		description?: string;
		full?: boolean;
	};
	toc?: unknown;
};

export type DocsPageProps = {
	description?: string;
	editPath: string;
	full?: boolean;
	lastModified?: string | Date;
	title: string;
	toc?: unknown;
};

export function renderDocsPage(content: ContentModule, props: DocsPageProps) {
	const MDX = content.default as (props: {
		components?: ReturnType<typeof getMDXComponents>;
	}) => ReactNode;
	const toc = content.toc ?? props.toc;

	return (
		<DocsPage
			editOnGithub={{
				owner: "damianricobelli",
				path: props.editPath,
				repo: "stepperize",
				sha: "main",
			}}
			full={props.full ?? content.frontmatter.full}
			lastUpdate={props.lastModified ? new Date(props.lastModified) : undefined}
			tableOfContent={{
				style: "clerk",
			}}
			toc={toc as never}
		>
			<DocsTitle>{props.title}</DocsTitle>
			<DocsDescription>{props.description}</DocsDescription>
			<DocsBody>
				<MDX components={getMDXComponents()} />
			</DocsBody>
		</DocsPage>
	);
}
