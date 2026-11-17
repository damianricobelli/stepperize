/**
 * Documentation split by framework.
 *
 * From v9 on, content lives under `content/docs/docs/{version}/{framework}/...`
 * and is served at `/docs/{version}/{framework}/...`. To document a new binding
 * (Vue, Svelte, ...):
 *
 * 1. Add an entry to `FRAMEWORKS` below.
 * 2. Create `content/docs/docs/{version}/{id}/meta.json` (with `"root": true`)
 *    and its pages.
 * 3. List the folder in `content/docs/docs/{version}/meta.json`.
 *
 * The sidebar switcher, canonical URLs, the sitemap and `llms.txt` follow.
 */
export const FRAMEWORKS = [
	{
		id: "react",
		title: "React",
		package: "@stepperize/react",
		description: "Hooks and accessible primitives",
	},
	{
		id: "core",
		title: "Core",
		package: "@stepperize/core",
		description: "The state machine, without a framework",
	},
] as const;

export type DocsFramework = (typeof FRAMEWORKS)[number]["id"];

/** Where `/docs/{version}` and framework-less URLs land. */
export const DEFAULT_FRAMEWORK: DocsFramework = "react";

/** Versions whose documentation is split by framework. Older ones are React only. */
const FRAMEWORK_VERSIONS: readonly string[] = ["v9"];

export const hasFrameworks = (version: string) =>
	FRAMEWORK_VERSIONS.includes(version);

export const isDocsFramework = (
	value: string | undefined,
): value is DocsFramework => FRAMEWORKS.some((entry) => entry.id === value);
