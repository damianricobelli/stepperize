import { Link } from "@tanstack/react-router";
import { Waypoints } from "lucide-react";

const GITHUB = "https://github.com/damianricobelli/stepperize";

/** Shared footer for the marketing surfaces (landing + Blocks gallery). */
export function SiteFooter() {
	return (
		<footer className="border-t">
			<div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
				<Link
					to="/"
					className="flex items-center gap-2 font-heading text-sm font-semibold"
				>
					<Waypoints className="size-4 text-primary" aria-hidden />
					Stepperize
				</Link>
				<nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
					<Link
						to="/docs/$"
						params={{ _splat: "latest" }}
						className="hover:text-foreground"
					>
						Docs
					</Link>
					<Link
						to="/docs/$"
						params={{ _splat: "latest/forms" }}
						className="hover:text-foreground"
					>
						Forms
					</Link>
					<Link to="/blocks" className="hover:text-foreground">
						Blocks
					</Link>
					<Link
						to="/docs/$"
						params={{ _splat: "latest/guides/primitives" }}
						className="hover:text-foreground"
					>
						Primitives
					</Link>
					<a
						href={GITHUB}
						target="_blank"
						rel="noreferrer noopener"
						className="hover:text-foreground"
					>
						GitHub
					</a>
				</nav>
				<p className="text-xs text-muted-foreground">MIT licensed</p>
			</div>
		</footer>
	);
}
