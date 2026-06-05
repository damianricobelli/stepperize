"use client";

import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { BLOCK_COMPONENTS, type BlockMeta, getCategory } from "@/lib/blocks";
import { DifficultyBadge } from "./block-badges";
import { BlockPreviewFrame } from "./block-preview-frame";

/**
 * A gallery item — a single navigation target. The live block renders as an
 * inert thumbnail; a stretched link over the whole card opens the detail page,
 * where code, install, and v0 live. Nothing else competes for the click.
 */
export function BlockCard({ block }: { block: BlockMeta }) {
	const Preview = BLOCK_COMPONENTS[block.id];
	const category = getCategory(block.category);

	return (
		<article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/40">
			<div className="h-44 overflow-hidden border-b">
				{Preview ? (
					<BlockPreviewFrame
						interactive={false}
						className="p-3 sm:p-4"
						minHeightClass="h-44"
						contentMaxWidthClass="max-w-lg"
						thumbnailScaleClass="scale-[0.68]"
					>
						<Preview />
					</BlockPreviewFrame>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-2 p-4">
				<div className="flex items-start justify-between gap-2">
					<h3 className="font-heading text-base font-semibold tracking-tight">
						<Link
							to="/blocks/$blockId"
							params={{ blockId: block.id }}
							className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
						>
							{block.title}
						</Link>
					</h3>
					{block.featured && (
						<Sparkles
							className="mt-0.5 size-4 shrink-0 text-primary"
							aria-label="Featured"
						/>
					)}
				</div>

				<p className="line-clamp-2 text-sm text-muted-foreground">
					{block.description}
				</p>

				<div className="mt-auto flex items-center gap-2 pt-1">
					{category && (
						<span className="text-xs font-medium text-muted-foreground">
							{category.name}
						</span>
					)}
					<DifficultyBadge difficulty={block.difficulty} className="ml-auto" />
				</div>
			</div>
		</article>
	);
}
