"use client";

import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type ComponentType, useRef } from "react";
import { cta } from "@/components/site/cta";
// Import the plain catalog, not `@/lib/blocks`: that barrel also inlines every
// block's raw source for the gallery's code view, which the homepage never needs.
import { BLOCKS, CATEGORIES } from "@/lib/blocks/catalog.mjs";
import { AiWorkflowBlock } from "../blocks/ai-workflow";
import { ApprovalTimelineBlock } from "../blocks/approval-timeline";
import { CicdPipelineBlock } from "../blocks/cicd-pipeline";
import { PlanPickerBlock } from "../blocks/plan-picker";
import { TwoFactorBlock } from "../blocks/two-factor";
import { Section, SectionHeading } from "./shared";

const FEATURED: { id: string; Block: ComponentType }[] = [
	{ id: "approval-timeline", Block: ApprovalTimelineBlock },
	{ id: "plan-picker", Block: PlanPickerBlock },
	{ id: "ai-workflow", Block: AiWorkflowBlock },
	{ id: "two-factor", Block: TwoFactorBlock },
	{ id: "cicd-pipeline", Block: CicdPipelineBlock },
];

const BLOCK_BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));
const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c.name]));

/**
 * A native-scroll rail of live blocks. Scroll snapping gives touch users the
 * browser's own physics; on desktop, arrow buttons page by one card.
 */
export function BlocksRail() {
	const railRef = useRef<HTMLDivElement>(null);

	const page = (direction: 1 | -1) => {
		const rail = railRef.current;
		const card = rail?.querySelector<HTMLElement>("[data-rail-card]");
		if (!rail || !card) return;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		rail.scrollBy({
			left: direction * (card.offsetWidth + 16),
			behavior: reduce ? "auto" : "smooth",
		});
	};

	return (
		<Section className="overflow-hidden border-t bg-muted/30 [contain-intrinsic-size:auto_56rem] [content-visibility:auto]">
			<div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
				<SectionHeading
					eyebrow="Own your UI"
					title={`${BLOCKS.length} blocks. Copy, paste, own every line.`}
				>
					Headless core, optional unstyled primitives, and production-ready
					blocks built with Tailwind and shadcn/ui. Install one from the
					registry and it is your code, with nothing to eject.
				</SectionHeading>
				<div className="flex shrink-0 items-center gap-2">
					<Link to="/blocks" className={cta({ variant: "secondary" })}>
						Browse all blocks
						<ArrowRight aria-hidden />
					</Link>
					<div className="hidden gap-1 pointer-fine:flex">
						<button
							type="button"
							aria-label="Previous blocks"
							onClick={() => page(-1)}
							className={cta({ variant: "secondary", className: "w-10 px-0" })}
						>
							<ArrowLeft aria-hidden />
						</button>
						<button
							type="button"
							aria-label="Next blocks"
							onClick={() => page(1)}
							className={cta({ variant: "secondary", className: "w-10 px-0" })}
						>
							<ArrowRight aria-hidden />
						</button>
					</div>
				</div>
			</div>

			<div
				ref={railRef}
				className="-mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
			>
				{FEATURED.map(({ id, Block }) => {
					const meta = BLOCK_BY_ID.get(id);
					if (!meta) return null;
					return (
						<figure
							key={id}
							data-rail-card
							className="flex w-[min(24rem,calc(100vw-3rem))] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border bg-card shadow-xs"
						>
							<div className="flex min-h-[27rem] flex-1 items-center justify-center bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] p-4">
								<Block />
							</div>
							<figcaption className="flex items-center justify-between gap-3 border-t px-5 py-4">
								<span className="min-w-0">
									<span className="block truncate text-sm font-semibold tracking-tight">
										{meta.title}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{CATEGORY_BY_ID.get(meta.category)}
									</span>
								</span>
								<Link
									to="/blocks/$blockId"
									params={{ blockId: id }}
									className={cta({ variant: "ghost", size: "sm" })}
								>
									View code
									<ArrowRight aria-hidden />
								</Link>
							</figcaption>
						</figure>
					);
				})}
			</div>
		</Section>
	);
}
