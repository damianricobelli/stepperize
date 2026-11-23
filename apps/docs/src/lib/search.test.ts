import { describe, expect, it } from "vitest";
import {
	pageSearchBreadcrumbs,
	pageSearchTags,
	preferFramework,
	resolveSearchTag,
	searchTagForPath,
	searchTagOptions,
} from "./search";

describe("search tags", () => {
	it("tags v9 pages with their version and framework, older ones with their version", () => {
		expect(pageSearchTags(["docs", "v9", "vue", "guides", "forms"])).toEqual([
			"v9",
			"v9/vue",
		]);
		expect(pageSearchTags(["docs", "v9", "core"])).toEqual(["v9", "v9/core"]);
		expect(pageSearchTags(["docs", "v8", "forms"])).toEqual(["v8"]);
		expect(pageSearchBreadcrumbs(["docs", "v9", "vue", "guides"])).toEqual([
			"Vue v9",
		]);
		expect(pageSearchBreadcrumbs(["docs", "v7", "forms"])).toEqual([
			"React v7",
		]);
	});

	it("sends the tag of the page being read", () => {
		expect(searchTagForPath("/docs/v9/vue/guides/forms")).toBe("v9/vue");
		expect(searchTagForPath("/docs/v9/angular")).toBe("v9/angular");
		expect(searchTagForPath("/docs/v8/forms")).toBe("v8");
		// Off the docs, the main framework of the current version.
		expect(searchTagForPath("/")).toBe("v9/react");
		expect(searchTagForPath("/blocks")).toBe("v9/react");
		expect(searchTagOptions("/docs/v9/vue").map((tag) => tag.value)).toContain(
			"v9/vue",
		);
		expect(searchTagOptions("/docs/v8/forms")).toEqual([]);
	});

	it("searches the whole version for a framework tag, and filters by a version tag", () => {
		expect(resolveSearchTag(["v9/vue"])).toEqual({
			tag: ["v9"],
			prefer: { version: "v9", framework: "vue" },
		});
		// Clients that only know versions keep working.
		expect(resolveSearchTag(["v8"])).toEqual({ tag: ["v8"] });
		expect(resolveSearchTag(["v9"])).toEqual({ tag: ["v9"] });
		expect(resolveSearchTag(undefined)).toEqual({});
	});

	it("puts the framework's results first, then the core, keeping each page's matches with it", () => {
		const results = [
			{ type: "page", url: "/docs/v9/react/forms" },
			{ type: "heading", url: "/docs/v9/react/forms#a" },
			{ type: "page", url: "/docs/v9/core/errors" },
			{ type: "page", url: "/docs/v9/vue/guides/forms" },
			{ type: "text", url: "/docs/v9/vue/guides/forms#b" },
			{ type: "page", url: "/docs/v9/vue" },
			{ type: "page", url: "/docs/v9/vuex" },
		];
		expect(
			preferFramework(results, { version: "v9", framework: "vue" }).map(
				(result) => result.url,
			),
		).toEqual([
			"/docs/v9/vue/guides/forms",
			"/docs/v9/vue/guides/forms#b",
			"/docs/v9/vue",
			"/docs/v9/core/errors",
			"/docs/v9/react/forms",
			"/docs/v9/react/forms#a",
			"/docs/v9/vuex",
		]);
		// Whole pages only: the limit never splits one from its matches.
		expect(
			preferFramework(results, { version: "v9", framework: "react" }, 1),
		).toEqual(results.slice(0, 2));
	});
});
