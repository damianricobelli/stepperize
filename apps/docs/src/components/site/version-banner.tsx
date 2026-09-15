import { Link } from "@tanstack/react-router";
import { Banner } from "fumadocs-ui/components/banner";
import { ArrowRight } from "lucide-react";

export function VersionBanner() {
	return (
		<Banner
			id="stepperize-v8"
			role="region"
			aria-label="Version announcement"
			className="shrink-0 border-b border-primary/20 bg-secondary px-12 text-foreground"
		>
			<Link
				to="/docs/$"
				params={{ _splat: "v8/migration/v8" }}
				className="inline-flex flex-wrap items-center justify-center gap-x-2 text-xs leading-snug hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:text-sm"
			>
				<span className="font-semibold">Stepperize v8</span>
				<span className="inline-flex items-center gap-1">
					Explore the changes <ArrowRight className="size-3.5" aria-hidden />
				</span>
			</Link>
		</Banner>
	);
}
