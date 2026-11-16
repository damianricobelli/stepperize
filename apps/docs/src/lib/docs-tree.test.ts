import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as PageTree from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import {
	getCanonicalDocsPath,
	getDocsFramework,
	getDocsPageSlugs,
	getDocsTabs,
	getDocsTree,
	getDocsVersionTabs,
} from "./docs-tree";
import { FRAMEWORKS } from "./frameworks";
import { docsBreadcrumb } from "./seo";
import { docRouteForSlugs } from "./sitemap-urls";

const content = fileURLToPath(
	new URL("../../content/docs/docs/", import.meta.url),
);

function read(version: string, path: string) {
	return readFileSync(`${content}/${version}/${path}`, "utf8");
}

describe("versioned documentation", () => {
	it("keeps explicit versions and resolves latest or unversioned URLs to v8", () => {
		expect(getDocsPageSlugs(["v7", "api", "react", "use-stepper"])).toEqual([
			"docs",
			"v7",
			"api",
			"react",
			"use-stepper",
		]);
		expect(
			getCanonicalDocsPath(["latest", "guides", "local-and-shared-state"]),
		).toBe("/docs/v8/guides/local-and-shared-state");
		expect(getCanonicalDocsPath(["getting-started", "installation"])).toBe(
			"/docs/v8/getting-started/installation",
		);
		expect(getCanonicalDocsPath([])).toBe("/docs/v8");
		expect(
			getCanonicalDocsPath(["v7", "guides", "local-and-shared-state"]),
		).toBe("/docs/v7/guides/local-and-shared-state");
	});

	it("offers real v7/v8 roots in the version selector", () => {
		const tabs = getDocsVersionTabs();
		expect(tabs.map((t) => t.url)).toContain("/docs/v7");
		expect(tabs.map((t) => t.url)).toContain("/docs/v8");
		for (const version of ["v7", "v8"]) {
			expect(existsSync(`${content}/${version}/index.mdx`)).toBe(true);
			const meta = JSON.parse(read(version, "meta.json"));
			expect(meta.title).toBe(version);
		}
	});

	it("archives the v7 contract and keeps v8-only pages out of v7", () => {
		expect(read("v7", "api/react/use-stepper.mdx")).toContain(
			"Inside the generated `Provider` or `Stepper.Root`, it reads the shared instance",
		);
		expect(read("v7", "api/react/use-stepper.mdx")).toContain(
			"resolves to `true`",
		);
		expect(read("v8", "api/react/use-stepper.mdx")).toContain(
			"Every call owns independent state",
		);
		for (const page of [
			"guides/local-and-shared-state.mdx",
			"api/react/use-stepper-context.mdx",
			"migration/v8.mdx",
		]) {
			expect(existsSync(`${content}/v8/${page}`)).toBe(true);
			expect(existsSync(`${content}/v7/${page}`)).toBe(false);
		}
		expect(read("v7", "api/react/provider.mdx")).not.toContain(
			"useStepperContext",
		);
		expect(read("v7", "getting-started/installation.mdx")).toContain(
			"@stepperize/react@^7.0.0",
		);
	});

	it("keeps internal documentation links inside their version", () => {
		for (const version of ["v7", "v8"]) {
			for (const file of readdirSync(`${content}/${version}`, {
				recursive: true,
			})) {
				if (!String(file).endsWith(".mdx")) continue;
				if (version === "v7") {
					expect(read(version, String(file))).not.toContain(
						"<InteractiveExample",
					);
				}
				expect(
					read(version, String(file)),
					`${version}/${String(file)}`,
				).not.toMatch(/(?:\]\(|href=["'])\/docs\/latest/);
			}
		}
	});

	it("does not fall back to another version's sidebar", () => {
		const v7: PageTree.Folder = {
			type: "folder",
			name: "Archived",
			$ref: { folder: "docs/v7", meta: "docs/v7/meta.json" },
			children: [{ type: "page", name: "v7 API", url: "/docs/v7/api" }],
		};
		const v8: PageTree.Folder = {
			type: "folder",
			name: "Preview",
			$ref: { folder: "docs/v8", meta: "docs/v8/meta.json" },
			children: [
				{
					type: "page",
					name: "Selectors",
					url: "/docs/v8/api/react/use-stepper-context",
				},
			],
		};
		const tree: PageTree.Root = { name: "Docs", children: [v7, v8] };
		expect(getDocsTree(tree, "v7").children).toEqual(v7.children);
		expect(getDocsTree(tree, "v8").children).toEqual(v8.children);
		expect(getDocsTree(tree, "v99").children).toEqual([]);
		expect(getDocsTree(tree, "v7").$id).not.toBe(getDocsTree(tree, "v8").$id);
		expect(getDocsTree(tree, "v7").$id).toBe(getDocsTree(tree, "v7").$id);
	});

	it("uses versioned canonical URLs in sitemap and breadcrumbs", () => {
		expect(docRouteForSlugs(["docs", "latest", "forms"])).toBe(
			"/docs/v8/forms",
		);
		expect(docRouteForSlugs(["docs", "v7", "forms"])).toBe("/docs/v7/forms");
		const trail = docsBreadcrumb("v7/api/react/use-stepper", "useStepper");
		expect(trail.map((t) => t.url)).toEqual([
			"/",
			"/docs/v7",
			"/docs/v7/api",
			"/docs/v7/api/react/use-stepper",
		]);
	});

	describe("documentation split by framework", () => {
		it("sends framework-less v9 URLs to the default framework", () => {
			expect(getCanonicalDocsPath(["v9"])).toBe("/docs/v9/react");
			expect(getCanonicalDocsPath(["v9", "guides", "url"])).toBe(
				"/docs/v9/react/guides/url",
			);
			expect(getCanonicalDocsPath(["v9", "core", "errors"])).toBe(
				"/docs/v9/core/errors",
			);
			expect(getDocsFramework(["v9", "core", "errors"])).toBe("core");
			expect(getDocsFramework(["v9", "guides"])).toBe("react");
			expect(getDocsFramework(["v8", "guides"])).toBeUndefined();
		});

		it("has content, a root sidebar and a switcher entry for every framework", () => {
			const listed = JSON.parse(read("v9", "meta.json")).pages;
			const tabs = getDocsTabs("v9").map((tab) => tab.url);
			for (const framework of FRAMEWORKS) {
				expect(listed).toContain(framework.id);
				expect(existsSync(`${content}/v9/${framework.id}/index.mdx`)).toBe(
					true,
				);
				expect(JSON.parse(read("v9", `${framework.id}/meta.json`)).root).toBe(
					true,
				);
				expect(tabs).toContain(`/docs/v9/${framework.id}`);
			}
			// The version itself is not offered next to its own frameworks.
			expect(tabs).not.toContain("/docs/v9");
			expect(tabs).toContain("/docs/v8");
			expect(getDocsTabs("v8")).toEqual(getDocsVersionTabs());
		});

		it("gives each framework its own sidebar", () => {
			const folder = (
				path: string,
				children: PageTree.Node[],
			): PageTree.Folder => ({
				type: "folder",
				name: path,
				$ref: { folder: `docs/${path}`, meta: `docs/${path}/meta.json` },
				children,
			});
			const react = folder("v9/react", [
				{ type: "page", name: "Hooks", url: "/docs/v9/react/api" },
			]);
			const core = folder("v9/core", [
				{ type: "page", name: "Flow", url: "/docs/v9/core/flow" },
			]);
			const tree: PageTree.Root = {
				name: "Docs",
				children: [folder("v9", [react, core])],
			};
			expect(getDocsTree(tree, "v9", "react").children).toEqual(react.children);
			expect(getDocsTree(tree, "v9", "core").children).toEqual(core.children);
			expect(getDocsTree(tree, "v9", "vue").children).toEqual([]);
			expect(getDocsTree(tree, "v9", "react").$id).not.toBe(
				getDocsTree(tree, "v9", "core").$id,
			);
		});

		it("links only to pages that exist, and every listed page exists", () => {
			for (const framework of FRAMEWORKS) {
				const meta = JSON.parse(read("v9", `${framework.id}/meta.json`));
				for (const page of meta.pages) {
					if (page.startsWith("---")) continue;
					expect(
						existsSync(`${content}/v9/${framework.id}/${page}.mdx`),
						`${framework.id}/${page}`,
					).toBe(true);
				}
			}
			for (const file of readdirSync(`${content}/v9`, { recursive: true })) {
				if (!String(file).endsWith(".mdx")) continue;
				const links = read("v9", String(file)).matchAll(
					/\/docs\/(v9\/[a-z0-9/-]+)/g,
				);
				for (const [, target] of links) {
					const [, ...rest] = target.split("/");
					const path = rest.join("/");
					expect(
						existsSync(`${content}/v9/${path}.mdx`) ||
							existsSync(`${content}/v9/${path}/index.mdx`),
						`${String(file)} -> /docs/${target}`,
					).toBe(true);
				}
			}
		});
	});
});
