// Builds a shadcn-compatible registry from the Blocks components.
//
// Single source of truth: the registry points at the SAME files the docs render
// (src/components/blocks/*.tsx), so installable items never drift from previews.
//
// Output (mirrors `shadcn build`):
//   - registry.json          → the standard manifest (hand-editable equivalent)
//   - public/r/<name>.json    → built registry items with inlined file content
//   - public/r/registry.json  → index consumed by the docs UI
//
// Run: node scripts/build-registry.mjs   (also wired as `npm run registry:build`)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCKS } from "../src/lib/blocks/catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOCKS_DIR = "src/components/blocks";
const OUT_DIR = resolve(ROOT, "public/r");

const HOMEPAGE = "https://stepperize.com";
const STEPPERIZE_VERSION = "@stepperize/react"; // bare name → resolves to installed/latest

// Catalog is the single source of truth (src/lib/blocks/catalog.mjs); the same
// file drives the docs gallery, so registry items can never drift from previews.

function buildItem({
	id: name,
	title,
	description,
	category,
	capabilities = [],
	difficulty = "intermediate",
	tags = [],
}) {
	const level = difficulty;
	const source = `${BLOCKS_DIR}/${name}.tsx`;
	const abs = resolve(ROOT, source);
	if (!existsSync(abs)) {
		throw new Error(`Block source not found: ${source}`);
	}
	const content = readFileSync(abs, "utf8");

	const dependencies = [STEPPERIZE_VERSION];
	if (content.includes('from "lucide-react"')) dependencies.push("lucide-react");
	if (content.includes('from "zod"')) dependencies.push("zod");

	// Any `@/components/ui/<name>` import becomes a shadcn registryDependency, so
	// `shadcn add <block>` also installs the shadcn/ui components it uses.
	const registryDependencies = [
		...new Set([...content.matchAll(/from "@\/components\/ui\/([a-z-]+)"/g)].map((m) => m[1])),
	].sort();

	const target = `components/stepperize/${name}.tsx`;

	return {
		manifest: {
			name,
			type: "registry:component",
			title,
			description,
			dependencies,
			registryDependencies,
			categories: [category],
			meta: { capabilities, level, tags },
			files: [{ path: source, type: "registry:component", target }],
		},
		item: {
			$schema: "https://ui.shadcn.com/schema/registry-item.json",
			name,
			type: "registry:component",
			title,
			description,
			author: "Stepperize",
			dependencies,
			registryDependencies,
			categories: [category],
			meta: { capabilities, level, tags },
			files: [{ path: target, type: "registry:component", target, content }],
		},
	};
}

const built = BLOCKS.map(buildItem);

// registry.json — the standard manifest (what `shadcn build` consumes)
const registry = {
	$schema: "https://ui.shadcn.com/schema/registry.json",
	name: "stepperize",
	homepage: HOMEPAGE,
	items: built.map((b) => b.manifest),
};
writeFileSync(resolve(ROOT, "registry.json"), `${JSON.stringify(registry, null, "\t")}\n`);

// public/r/<name>.json — built, installable items
mkdirSync(OUT_DIR, { recursive: true });
for (const b of built) {
	writeFileSync(resolve(OUT_DIR, `${b.item.name}.json`), `${JSON.stringify(b.item, null, 2)}\n`);
}

// public/r/registry.json — lightweight index for the docs UI
const index = {
	name: "stepperize",
	homepage: HOMEPAGE,
	items: built.map((b) => ({
		name: b.item.name,
		title: b.item.title,
		description: b.item.description,
		categories: b.item.categories,
		capabilities: b.item.meta.capabilities,
		level: b.item.meta.level,
		tags: b.item.meta.tags,
	})),
};
writeFileSync(resolve(OUT_DIR, "registry.json"), `${JSON.stringify(index, null, 2)}\n`);

console.log(`✓ Registry built: ${built.length} items → public/r/  +  registry.json`);
