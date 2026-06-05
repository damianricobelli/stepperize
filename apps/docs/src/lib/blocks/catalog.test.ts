import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	BLOCK_COMPONENTS,
	BLOCKS,
	CATEGORIES,
	DIFFICULTIES,
	getBlockCode,
} from "./index";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const BLOCKS_DIR = resolve(ROOT, "src/components/blocks");
const REGISTRY_DIR = resolve(ROOT, "public/r");

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const BLOCK_IDS = new Set(BLOCKS.map((b) => b.id));
const DIFFICULTY_SET = new Set<string>(DIFFICULTIES);

describe("blocks catalog", () => {
	it("has unique block ids", () => {
		expect(BLOCK_IDS.size).toBe(BLOCKS.length);
	});

	it.each(BLOCKS)("$id is internally consistent", (block) => {
		// Source file exists and matches the id.
		expect(
			existsSync(resolve(BLOCKS_DIR, `${block.id}.tsx`)),
			`missing source for ${block.id}`,
		).toBe(true);

		// Has a live preview component and inlined source code.
		expect(
			BLOCK_COMPONENTS[block.id],
			`no component for ${block.id}`,
		).toBeTypeOf("function");
		expect(
			getBlockCode(block.id).length,
			`no code for ${block.id}`,
		).toBeGreaterThan(0);

		// Category + difficulty are valid.
		expect(CATEGORY_IDS.has(block.category)).toBe(true);
		expect(DIFFICULTY_SET.has(block.difficulty)).toBe(true);

		// Metadata is present and well-formed.
		expect(block.tags.length).toBeGreaterThan(0);
		expect(block.capabilities.length).toBeGreaterThan(0);

		// Related ids all resolve to real blocks.
		for (const rel of block.related ?? []) {
			expect(BLOCK_IDS.has(rel), `${block.id} → unknown related ${rel}`).toBe(
				true,
			);
		}
	});

	it("maps every component back to a catalog entry", () => {
		for (const id of Object.keys(BLOCK_COMPONENTS)) {
			expect(BLOCK_IDS.has(id), `orphan component ${id}`).toBe(true);
		}
	});
});

describe("built registry (run registry:build first)", () => {
	const built = existsSync(REGISTRY_DIR)
		? readdirSync(REGISTRY_DIR).filter(
				(f) => f.endsWith(".json") && f !== "registry.json",
			)
		: [];

	it("has a built item per block with inlined content + deps", () => {
		for (const block of BLOCKS) {
			const file = resolve(REGISTRY_DIR, `${block.id}.json`);
			expect(existsSync(file), `missing registry item for ${block.id}`).toBe(
				true,
			);
			const item = JSON.parse(readFileSync(file, "utf8"));
			expect(item.name).toBe(block.id);
			expect(item.files?.[0]?.content?.length ?? 0).toBeGreaterThan(0);
			expect(item.dependencies).toContain("@stepperize/react");
		}
	});

	it("has no orphan registry items", () => {
		for (const file of built) {
			const id = file.replace(/\.json$/, "");
			expect(BLOCK_IDS.has(id), `orphan registry item ${id}`).toBe(true);
		}
	});
});
