import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Waypoints } from "lucide-react";

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
};
