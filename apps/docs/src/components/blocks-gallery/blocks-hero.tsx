"use client";

import { ArrowRight, Blocks, Boxes, ExternalLink } from "lucide-react";
import { cta } from "@/components/site/cta";
import { BLOCKS, CATEGORIES, REGISTRY_BASE } from "@/lib/blocks";

/**
 * Hero for the Blocks gallery. Same type scale, backdrop, and CTAs as the
 * homepage hero so the two surfaces read as one product.
 */
export function BlocksHero() {
	return (
		<section className="relative overflow-hidden border-b">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[20px_20px] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute top-[-18rem] left-1/2 h-[40rem] w-[min(68rem,140vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--primary)_16%,transparent),transparent)]"
			/>

			<div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
				<div className="mx-auto max-w-3xl text-center">
					<span
						className="lp-rise inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-[13px] text-muted-foreground shadow-xs backdrop-blur"
						style={{ animationDelay: "0ms" }}
					>
						<Blocks className="size-3.5 text-primary" aria-hidden />
						{BLOCKS.length} blocks · {CATEGORIES.length} categories ·
						shadcn-ready
					</span>

					<h1
						className="lp-rise mt-6 text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]"
						style={{ animationDelay: "80ms" }}
					>
						Production-ready{" "}
						<span className="text-primary">stepper blocks</span>
					</h1>

					<p
						className="lp-rise mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
						style={{ animationDelay: "160ms" }}
					>
						Complete, accessible, customizable stepper flows built with
						Stepperize and shadcn/ui. Preview them live, inspect the code, open
						them in v0, or install them straight from the registry.
					</p>

					<div
						className="lp-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
						style={{ animationDelay: "240ms" }}
					>
						<a
							href="#gallery"
							className={cta({ size: "lg", className: "w-full sm:w-auto" })}
						>
							Browse blocks
							<ArrowRight className="size-4" aria-hidden />
						</a>
						<a
							href={`${REGISTRY_BASE}/r/registry.json`}
							target="_blank"
							rel="noreferrer noopener"
							className={cta({
								variant: "secondary",
								size: "lg",
								className: "w-full sm:w-auto",
							})}
						>
							<Boxes className="size-4" aria-hidden />
							View registry
							<ExternalLink
								className="size-3.5 text-muted-foreground"
								aria-hidden
							/>
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
