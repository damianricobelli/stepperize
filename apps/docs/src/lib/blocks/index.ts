import {
	LayoutPanelLeft,
	Loader,
	type LucideIcon,
	ShieldCheck,
	ShoppingCart,
	UserPlus,
	Workflow,
} from "lucide-react";
import type {
	BlockCategory,
	BlockDifficulty,
	BlockMeta,
} from "./catalog.d.mts";
import { BLOCKS, CATEGORIES } from "./catalog.mjs";
import { BLOCK_COMPONENTS } from "./components";

export type { BlockCategory, BlockDifficulty, BlockMeta };
export { BLOCK_COMPONENTS, BLOCKS, CATEGORIES };

/**
 * Public base URL where the built registry items are served (`public/r/*.json`).
 * In production this must be the deployed docs domain so `shadcn add` and
 * "Open in v0" can fetch the item. Shared with the docs `BlockActions`.
 */
export const REGISTRY_BASE = "https://stepperize.com";

export const PACKAGE_MANAGERS = [
	{ id: "npm", label: "npm", exec: "npx" },
	{ id: "pnpm", label: "pnpm", exec: "pnpm dlx" },
	{ id: "yarn", label: "yarn", exec: "yarn dlx" },
	{ id: "bun", label: "bun", exec: "bunx --bun" },
] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number]["id"];

/** Raw source of every block, keyed by id — Vite inlines these at build time. */
const RAW_SOURCES = import.meta.glob("../../components/blocks/*.tsx", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const CODE_BY_ID: Record<string, string> = Object.fromEntries(
	Object.entries(RAW_SOURCES).map(([path, source]) => {
		const id = path.replace(/^.*\/([^/]+)\.tsx$/, "$1");
		return [id, source];
	}),
);

const BLOCKS_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]));
const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** lucide icon for a category (by the name string stored in the catalog). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
	LayoutPanelLeft,
	UserPlus,
	ShoppingCart,
	ShieldCheck,
	Loader,
	Workflow,
};

export function getBlock(id: string): BlockMeta | undefined {
	return BLOCKS_BY_ID.get(id);
}

export function getCategory(id: string): BlockCategory | undefined {
	return CATEGORY_BY_ID.get(id);
}

export function categoryIcon(category: BlockCategory): LucideIcon {
	return CATEGORY_ICONS[category.icon] ?? Workflow;
}

/** Source code string for a block's preview file. */
export function getBlockCode(id: string): string {
	return CODE_BY_ID[id] ?? "";
}

export function categoryCount(categoryId: string): number {
	return BLOCKS.filter((b) => b.category === categoryId).length;
}

export function blocksInCategory(categoryId: string): BlockMeta[] {
	return BLOCKS.filter((b) => b.category === categoryId);
}

export function relatedBlocks(id: string): BlockMeta[] {
	const block = getBlock(id);
	if (!block?.related?.length) return [];
	return block.related
		.map((relId) => getBlock(relId))
		.filter((b): b is BlockMeta => Boolean(b));
}

/** All difficulties present in the catalog, in learning order. */
export const DIFFICULTIES: BlockDifficulty[] = [
	"beginner",
	"intermediate",
	"advanced",
];

/* ─────────────────────── registry / install / v0 URLs ───────────────────── */

export function registryUrl(id: string): string {
	return `${REGISTRY_BASE}/r/${id}.json`;
}

export function installCommand(id: string, pm: PackageManager = "npm"): string {
	const exec = PACKAGE_MANAGERS.find((m) => m.id === pm)?.exec ?? "npx";
	return `${exec} shadcn@latest add ${registryUrl(id)}`;
}

export function v0Url(id: string): string {
	return `https://v0.dev/chat/api/open?url=${encodeURIComponent(registryUrl(id))}`;
}

/** Public source file for a block on GitHub (the "View source" action). */
const REPO = "https://github.com/damianricobelli/stepperize";
export function sourceUrl(id: string): string {
	return `${REPO}/blob/main/apps/docs/src/components/blocks/${id}.tsx`;
}
