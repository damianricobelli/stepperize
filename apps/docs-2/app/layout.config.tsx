import type { HomeLayoutProps } from "fumadocs-ui/home-layout";
import type { DocsLayoutProps } from "fumadocs-ui/layout";

import { NavChildren } from "@/app/layout.client";
import { source } from "@/app/source";
import { modes } from "@/lib/modes";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { BookIcon, Heart, Waypoints } from "lucide-react";

export const baseOptions: HomeLayoutProps = {
	githubUrl: "https://github.com/damianricobelli/stepperize",
	nav: {
		title: (
			<div className="flex items-center gap-2 mb-2">
				<Waypoints className="size-6" fill="currentColor" />
				<span className="font-medium text-xl">Stepperize</span>
			</div>
		),
		transparentMode: "top",
		children: <NavChildren />,
	},
	links: [
		{
			icon: <BookIcon />,
			text: "Blog",
			url: "/blog",
			active: "nested-url",
		},
		{
			text: "Sponsors",
			url: "/sponsors",
			icon: <Heart />,
		},
	],
};

export const docsOptions: DocsLayoutProps = {
	...baseOptions,
	tree: source.pageTree,
	nav: {
		...baseOptions.nav,
		transparentMode: "none",
		children: undefined,
	},
	sidebar: {
		banner: (
			<RootToggle
				options={modes.map((mode) => ({
					url: `/docs/${mode.param}`,
					icon: <mode.icon className="size-9 shrink-0 rounded-md p-1.5" />,
					title: mode.name,
					description: mode.description,
				}))}
			/>
		),
	},
};
