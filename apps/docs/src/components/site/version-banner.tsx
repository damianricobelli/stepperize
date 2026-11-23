import { Link } from "@tanstack/react-router";
import { Banner } from "fumadocs-ui/components/banner";
import { ArrowRight } from "lucide-react";
import { OTHER_BINDINGS } from "@/lib/frameworks";

/**
 * The one announcement at the top of every page. The `id` is what a dismissal
 * is remembered by: change it when the announcement changes, so people who
 * closed the previous one see the new one.
 */
export function VersionBanner() {
	return (
		<Banner
			id="stepperize-frameworks"
			role="region"
			aria-label="Announcement"
			className="shrink-0 border-b border-primary/20 bg-secondary px-12 text-foreground"
		>
			<Link
				to="/"
				hash="frameworks"
				className="inline-flex flex-wrap items-center justify-center gap-x-2 text-xs leading-snug hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:text-sm"
			>
				<span className="font-semibold">Not only React anymore</span>
				<span className="inline-flex items-center gap-1">
					Stepperize now runs in {OTHER_BINDINGS}
					<ArrowRight className="size-3.5 shrink-0" aria-hidden />
				</span>
			</Link>
		</Banner>
	);
}
