// Type declarations for catalog.mjs (the shared, React-free block catalog).

export type BlockDifficulty = "beginner" | "intermediate" | "advanced";

export type BlockCategory = {
	/** Stable category id (also used as the `category` value on blocks). */
	id: string;
	/** Human-facing category name. */
	name: string;
	/** Short one-line description shown in the sidebar. */
	description: string;
	/** lucide icon name; the app maps this to a component. */
	icon: string;
};

export type BlockMeta = {
	/** kebab-case id == source file stem == registry name. */
	id: string;
	title: string;
	description: string;
	/** A {@link BlockCategory} id. */
	category: string;
	/** Stepperize features the block teaches (registry metadata). */
	capabilities: string[];
	difficulty: BlockDifficulty;
	/** Searchable keywords for the gallery search box. */
	tags: string[];
	/** "When to reach for this" — shown on the detail page. */
	useCase?: string;
	/** Accessibility note — shown on the detail page. */
	accessibility?: string;
	/** Customization note — shown on the detail page. */
	customization?: string;
	/** Related block ids. */
	related?: string[];
	/** Flagship blocks highlighted in the gallery. */
	featured?: boolean;
};

export const CATEGORIES: BlockCategory[];
export const BLOCKS: BlockMeta[];
