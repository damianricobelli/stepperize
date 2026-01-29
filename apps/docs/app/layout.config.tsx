import { icons } from "@/components/icons";
import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared";
import { Waypoints } from "lucide-react";

export const linkItems: LinkItemType[] = [
	{
		icon: <icons.ReactIcon />,
		text: "React",
		url: "/docs/react",
		active: "nested-url",
		description: "Stepperize for React",
	},
];

export const baseOptions: BaseLayoutProps = {
	githubUrl: "https://github.com/damianricobelli/stepperize",
	nav: {
		title: (
			<div className="flex items-center gap-2 text-lg">
				<Waypoints fill="currentColor" />
				<span className="hidden md:block">Stepperize</span>
			</div>
		),
		transparentMode: "top",
	},
	links: [...linkItems],
};
