import { source } from "@/app/source";
import { modes } from "@/lib/modes";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import type { DocsLayoutProps, LinkItemType } from "fumadocs-ui/layouts/docs";
import type { HomeLayoutProps } from "fumadocs-ui/layouts/home";
import { Waypoints } from "lucide-react";

import { icons } from "@/components/icons";

export const linkItems: LinkItemType[] = [
	{
		icon: <icons.ReactIcon />,
		text: "React",
		url: "/docs/react",
		active: "nested-url",
		description: "Stepperize for React",
	},
	{
		icon: <icons.VueIcon />,
		text: "Vue",
		url: "/docs/vue",
		active: "nested-url",
		description: "Stepperize for Vue",
	},
	{
		icon: <icons.SolidIcon />,
		text: "Solid",
		url: "/docs/solid",
		active: "nested-url",
		description: "Stepperize for Solid",
	},
	{
		icon: <icons.SvelteIcon />,
		text: "Svelte",
		url: "/docs/svelte",
		active: "nested-url",
		description: "Stepperize for Svelte",
	},
];

export const baseOptions: HomeLayoutProps = {
	githubUrl: "https://github.com/damianricobelli/stepperize",
	nav: {
		title: (
			<div className="flex items-center gap-2">
				<Waypoints className="size-6" fill="currentColor" />
				<span className="font-medium text-xl hidden md:block">Stepperize</span>
			</div>
		),
		transparentMode: "top",
	},
	links: [...linkItems],
};

export const docsOptions: DocsLayoutProps = {
	...baseOptions,
	tree: source.pageTree,
	nav: {
		...baseOptions.nav,
		transparentMode: "none",
	},
	sidebar: {
		tabs: false,
		banner: (
			<RootToggle
				className="flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fd-accent/50 hover:text-fd-accent-foreground -mx-2"
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
