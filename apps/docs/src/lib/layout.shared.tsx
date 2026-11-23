import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Blocks, History } from "lucide-react";
import { GITHUB_URL, Wordmark } from "@/components/site/brand";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";

export function baseOptions(): BaseLayoutProps {
	return {
		githubUrl: GITHUB_URL,
		nav: {
			title: <Wordmark />,
			transparentMode: "top",
			url: "/",
		},
		links: [
			{
				// Listed in every framework's docs: the blocks are shadcn/ui, so React.
				icon: <Blocks />,
				text: "React blocks",
				url: "/blocks",
			},
			{
				icon: <History />,
				text: "Changelog",
				// The page itself: `/changelog` only redirects here.
				url: `/docs/${CURRENT_DOCS_VERSION}/react/changelog`,
			},
		],
		searchToggle: {
			full: {
				className: "w-full whitespace-nowrap",
			},
		},
	};
}
