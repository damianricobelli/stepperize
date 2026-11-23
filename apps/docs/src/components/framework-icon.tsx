import { Box, Waypoints } from "lucide-react";
import {
	siAngular,
	siHtml5,
	siLit,
	siReact,
	siSolid,
	siSvelte,
	siVuedotjs,
} from "simple-icons";
import { cn } from "@/lib/utils";

/**
 * The logo of each documented framework, by its id in `FRAMEWORKS`. Colors are
 * the brand's own where it reads on both themes, and a lighter or darker shade
 * of it where it does not. An id without an entry gets a neutral box, so a new
 * framework never breaks the switchers.
 */
const LOGOS: Record<string, { path: string; className: string }> = {
	react: {
		path: siReact.path,
		className: "text-[#087ea4] dark:text-[#61dafb]",
	},
	vue: { path: siVuedotjs.path, className: "text-[#42b883]" },
	svelte: { path: siSvelte.path, className: "text-[#ff3e00]" },
	solid: {
		path: siSolid.path,
		className: "text-[#2c4f7c] dark:text-[#76b3e1]",
	},
	lit: { path: siLit.path, className: "text-[#324fff] dark:text-[#00e8ff]" },
	angular: { path: siAngular.path, className: "text-foreground" },
	html: { path: siHtml5.path, className: "text-[#e34f26]" },
};

export function FrameworkIcon({
	id,
	className,
}: {
	id: string;
	className?: string;
}) {
	const size = cn("size-4 shrink-0", className);
	// The core is Stepperize itself: its own mark.
	if (id === "core") {
		return <Waypoints aria-hidden className={cn(size, "text-primary")} />;
	}
	const logo = LOGOS[id];
	if (!logo) {
		return <Box aria-hidden className={cn(size, "text-muted-foreground")} />;
	}
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			fill="currentColor"
			className={cn(size, logo.className)}
		>
			<path d={logo.path} />
		</svg>
	);
}
