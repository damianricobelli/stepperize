"use client";

import { LayoutGrid, Search, X } from "lucide-react";
import {
	BLOCKS,
	type BlockCategory,
	categoryCount,
	categoryIcon,
} from "@/lib/blocks";
import { cn } from "@/lib/utils";

/**
 * Sidebar discovery controls for the gallery. Search stays primary and
 * categories are simple navigation items.
 */
export function BlocksToolbar({
	query,
	onQueryChange,
	categories,
	category,
	onCategoryChange,
	resultCount,
}: {
	query: string;
	onQueryChange: (value: string) => void;
	categories: BlockCategory[];
	category: string | null;
	onCategoryChange: (value: string | null) => void;
	resultCount: number;
}) {
	const hasFilters = Boolean(query || category);

	return (
		<aside className="space-y-5">
			<div className="relative">
				<Search
					className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<input
					type="search"
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
					placeholder="Search blocks..."
					aria-label="Search blocks"
					className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
				/>
			</div>

			<nav aria-label="Block categories" className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Categories
					</h2>
					<span className="text-xs text-muted-foreground tabular-nums">
						{resultCount}
					</span>
				</div>

				<div className="space-y-1">
					<CategoryItem
						active={category === null}
						icon={<LayoutGrid className="size-4" aria-hidden />}
						label="All Blocks"
						count={BLOCKS.length}
						onClick={() => onCategoryChange(null)}
					/>
					{categories.map((item) => {
						const Icon = categoryIcon(item);
						return (
							<CategoryItem
								key={item.id}
								active={category === item.id}
								icon={<Icon className="size-4" aria-hidden />}
								label={item.name}
								count={categoryCount(item.id)}
								onClick={() => onCategoryChange(item.id)}
							/>
						);
					})}
				</div>
			</nav>

			<div className="flex items-center justify-between gap-2 border-t pt-4">
				<span className="text-xs text-muted-foreground tabular-nums">
					{resultCount} {resultCount === 1 ? "block" : "blocks"}
				</span>
				{hasFilters && (
					<button
						type="button"
						onClick={() => {
							onCategoryChange(null);
							onQueryChange("");
						}}
						className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<X className="size-3.5" aria-hidden />
						Clear
					</button>
				)}
			</div>
		</aside>
	);
}

function CategoryItem({
	active,
	icon,
	label,
	count,
	onClick,
}: {
	active: boolean;
	icon: React.ReactNode;
	label: string;
	count: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-current={active ? "page" : undefined}
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
				active
					? "bg-primary/10 text-primary"
					: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
			)}
		>
			{icon}
			<span className="min-w-0 flex-1 truncate">{label}</span>
			<span className="text-xs tabular-nums opacity-70">{count}</span>
		</button>
	);
}
