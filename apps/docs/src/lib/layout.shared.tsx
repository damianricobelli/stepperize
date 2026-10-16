import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Blocks, History } from "lucide-react";
import { GITHUB_URL, Wordmark } from "@/components/site/brand";

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
				icon: <Blocks />,
				text: "Blocks",
				url: "/blocks",
			},
			{
				icon: <History />,
				text: "Changelog",
				url: "/changelog",
			},
		],
		searchToggle: {
			full: {
				className: "w-full whitespace-nowrap",
			},
		},
	};
}
