"use client";

import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type ComponentType, useRef, useState } from "react";
import { cta } from "@/components/site/cta";
// Import the plain catalog, not `@/lib/blocks`: that barrel also inlines every
// block's raw source for the gallery's code view, which the homepage never needs.
import { BLOCKS, CATEGORIES } from "@/lib/blocks/catalog.mjs";
import { AiWorkflowBlock } from "../blocks/ai-workflow";
import { ApprovalTimelineBlock } from "../blocks/approval-timeline";
import { CicdPipelineBlock } from "../blocks/cicd-pipeline";
import { PlanPickerBlock } from "../blocks/plan-picker";
import { TwoFactorBlock } from "../blocks/two-factor";
import { SectionHeading } from "./shared";

const FEATURED: { id: string; Block: ComponentType }[] = [
	{ id: "approval-timeline", Block: ApprovalTimelineBlock },
	{ id: "plan-picker", Block: PlanPickerBlock },
	{ id: "ai-workflow", Block: AiWorkflowBlock },
	{ id: "two-factor", Block: TwoFactorBlock },
	{ id: "cicd-pipeline", Block: CicdPipelineBlock },
];

const BLOCK_BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));
const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c.name]));

const CARD_GAP = 20;

/**
 * A native-scroll rail of live blocks. Scroll snapping gives touch users the
 * browser's own physics; on desktop, arrow buttons page by one card.
 *
 * The rail is full-bleed (cards run to the viewport edge instead of being
 * clipped mid-screen by the content column), while its inline padding keeps
 * the first card aligned with the heading above. Each stage is sized for the
 * blocks' own design width (`max-w-md`, 28rem) plus breathing room, so a block
 * never has to squeeze into a frame narrower than it was built for.
 */
export function BlocksRail() {
	const railRef = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState({ start: true, end: false });

	const syncEdges = () => {
		const rail = railRef.current;
		if (!rail) return;
		const start = rail.scrollLeft <= 4;
		const end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
		// Same values bail out of the render, so this is cheap on every scroll.
		setEdges((prev) =>
			prev.start === start && prev.end === end ? prev : { start, end },
		);
	};

	const page = (direction: 1 | -1) => {
		const rail = railRef.current;
		const card = rail?.querySelector<HTMLElement>("[data-rail-card]");
		if (!rail || !card) return;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		rail.scrollBy({
			left: direction * (card.offsetWidth + CARD_GAP),
			behavior: reduce ? "auto" : "smooth",
		});
	};

	return (
		<section className="border-t bg-muted/30 [contain-intrinsic-size:auto_60rem] [content-visibility:auto]">
			<div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 px-4 pt-20 sm:px-6 md:flex-row md:items-end lg:pt-28">
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
							disabled={edges.start}
							className={cta({ variant: "secondary", className: "w-10 px-0" })}
						>
							<ArrowLeft aria-hidden />
						</button>
						<button
							type="button"
							aria-label="Next blocks"
							onClick={() => page(1)}
							disabled={edges.end}
							className={cta({ variant: "secondary", className: "w-10 px-0" })}
						>
							<ArrowRight aria-hidden />
						</button>
					</div>
				</div>
			</div>

			<section
				ref={railRef}
				aria-label="Featured blocks"
				onScroll={syncEdges}
				style={{ gap: CARD_GAP }}
				className="mt-12 flex snap-x snap-mandatory scroll-px-(--rail-inset) overflow-x-auto overscroll-x-contain px-(--rail-inset) pb-20 [--rail-inset:1rem] [scrollbar-width:none] sm:[--rail-inset:max(1.5rem,calc((100%-80rem)/2+1.5rem))] lg:pb-28 [&::-webkit-scrollbar]:hidden"
			>
				{FEATURED.map(({ id, Block }) => {
					const meta = BLOCK_BY_ID.get(id);
					if (!meta) return null;
					return (
						<figure
							key={id}
							data-rail-card
							className="flex w-[min(32rem,calc(100vw-2rem))] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border bg-card shadow-xs"
						>
							<div className="relative flex min-h-[33rem] flex-1 items-center justify-center px-3 py-8 sm:px-8">
								<div
									aria-hidden
									className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_75%_70%_at_50%_50%,black,transparent)]"
								/>
								<div className="relative flex w-full justify-center">
									<Block />
								</div>
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
			</section>
		</section>
	);
}
