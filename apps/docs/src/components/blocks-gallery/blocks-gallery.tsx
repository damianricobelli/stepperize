"use client";

import { useNavigate } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { BLOCKS, CATEGORIES, getCategory } from "@/lib/blocks";
import { BlockCard } from "./block-card";
import { BlocksHero } from "./blocks-hero";
import { BlocksToolbar } from "./blocks-toolbar";

export type BlocksSearch = {
	category?: string;
	q?: string;
};

const DIFFICULTY_ORDER = {
	beginner: 0,
	intermediate: 1,
	advanced: 2,
} as const;

/**
 * The Blocks gallery: hero + a simple docs-style filtering sidebar beside a
 * scannable two-column card grid. Filter state lives in the URL so views are
 * shareable.
 */
export function BlocksGallery({ search }: { search: BlocksSearch }) {
	const navigate = useNavigate({ from: "/blocks" });

	const category = search.category ?? null;
	const [query, setQuery] = useState(search.q ?? "");

	const patch = (next: Partial<BlocksSearch>) => {
		navigate({
			search: (prev) => {
				const merged = { ...prev, ...next };
				for (const key of Object.keys(merged) as (keyof BlocksSearch)[]) {
					if (!merged[key]) delete merged[key];
				}
				return merged;
			},
			replace: true,
			resetScroll: false,
		});
	};

	const activeCategory = category ? getCategory(category) : null;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return BLOCKS.filter((block) => {
			if (category && block.category !== category) return false;
			if (q) {
				const haystack = [
					block.title,
					block.description,
					block.id,
					...block.tags,
				]
					.join(" ")
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		}).sort(
			(a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty],
		);
	}, [category, query]);

	return (
		<>
			<BlocksHero />

			<section
				id="gallery"
				className="mx-auto grid w-full max-w-7xl scroll-mt-20 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]"
			>
				<div className="lg:sticky lg:top-20 lg:self-start">
					<BlocksToolbar
						query={query}
						onQueryChange={(v) => {
							setQuery(v);
							patch({ q: v || undefined });
						}}
						categories={CATEGORIES}
						category={category}
						onCategoryChange={(id) => patch({ category: id ?? undefined })}
						resultCount={filtered.length}
					/>
				</div>

				<div className="min-w-0">
					{activeCategory && (
						<header className="mb-6">
							<h2 className="font-heading text-2xl font-bold tracking-tight">
								{activeCategory.name}
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								{activeCategory.description}
							</p>
						</header>
					)}

					{filtered.length > 0 ? (
						<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
							{filtered.map((block) => (
								<BlockCard key={block.id} block={block} />
							))}
						</div>
					) : (
						<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
							<SearchX className="size-6 text-muted-foreground" aria-hidden />
							<p className="font-heading text-base font-semibold">
								No blocks match your filters
							</p>
							<p className="max-w-sm text-sm text-muted-foreground">
								Try a different category or search term.
							</p>
						</div>
					)}
				</div>
			</section>
		</>
	);
}
