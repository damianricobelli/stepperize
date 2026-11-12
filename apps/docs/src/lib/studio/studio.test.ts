import { transformWithOxc } from "vite";
import { describe, expect, it } from "vitest";
import { generateProject, toRegistryItem } from "./codegen/generate";
import { jsxText } from "./codegen/shared";
import {
	DEFAULT_CONFIG,
	FORMS,
	FRAMEWORKS,
	LAYOUTS,
	NAVIGATIONS,
	normalizeConfig,
	PRESET_IDS,
	PRESETS,
	type StudioConfig,
	UI_KITS,
	unavailableReason,
	VALIDATIONS,
} from "./config";
import { decodeConfig, encodeConfig } from "./share";

const paths = (config: StudioConfig) =>
	generateProject(config).files.map((f) => f.path);

/** Every combination the panel can produce, minus the ones it disables. */
function matrix(): StudioConfig[] {
	const out: StudioConfig[] = [];
	for (const framework of FRAMEWORKS)
		for (const navigation of NAVIGATIONS)
			for (const form of FORMS)
				for (const validation of VALIDATIONS)
					for (const ui of UI_KITS) {
						const config = {
							...DEFAULT_CONFIG,
							framework,
							navigation,
							form,
							validation,
							ui,
						};
						if (
							unavailableReason(config, {
								kind: "navigation",
								value: navigation,
							})
						)
							continue;
						if (
							unavailableReason(config, {
								kind: "validation",
								value: validation,
							})
						)
							continue;
						out.push(normalizeConfig(config));
					}
	for (const layout of LAYOUTS) {
		for (const indicator of ["number", "check", "dot"] as const) {
			out.push({ ...DEFAULT_CONFIG, layout, indicator });
		}
	}
	out.push(
		normalizeConfig({
			...DEFAULT_CONFIG,
			behavior: {
				linear: false,
				guard: true,
				persist: true,
				keepMounted: true,
			},
			navigation: "component",
		}),
	);
	for (const id of PRESET_IDS) out.push(PRESETS[id].config);
	return out;
}

describe("share links", () => {
	it("round-trips a config", () => {
		expect(decodeConfig(encodeConfig(DEFAULT_CONFIG))).toEqual(DEFAULT_CONFIG);
	});

	it("round-trips non-ASCII text", () => {
		const config = { ...DEFAULT_CONFIG, name: "Inscripción" };
		expect(decodeConfig(encodeConfig(config))?.name).toBe("Inscripción");
	});

	it("rejects garbage, oversized and out-of-bounds input", () => {
		expect(decodeConfig("not base64 !")).toBeUndefined();
		expect(decodeConfig("eyJmb28iOjF9")).toBeUndefined();
		expect(decodeConfig("a".repeat(20_000))).toBeUndefined();
		const tooMany = {
			...DEFAULT_CONFIG,
			steps: Array.from({ length: 9 }, () => DEFAULT_CONFIG.steps[0]),
		};
		expect(decodeConfig(encodeConfig(tooMany))).toBeUndefined();
	});

	it("repairs impossible combinations from old links", () => {
		const config = decodeConfig(
			encodeConfig({
				...DEFAULT_CONFIG,
				framework: "vite",
				navigation: "routes",
			}),
		);
		expect(config?.navigation).toBe("search-params");
	});
});

describe("compatibility", () => {
	it("disables routes without a router and ArkType with Conform", () => {
		const vite = { ...DEFAULT_CONFIG, framework: "vite" as const };
		expect(
			unavailableReason(vite, { kind: "navigation", value: "routes" }),
		).toBeDefined();
		const conform = { ...DEFAULT_CONFIG, form: "conform" as const };
		expect(
			unavailableReason(conform, { kind: "validation", value: "arktype" }),
		).toBeDefined();
		expect(
			unavailableReason(conform, { kind: "validation", value: "zod" }),
		).toBeUndefined();
	});

	it("turns off the guard when there is nothing to validate", () => {
		const config = normalizeConfig({ ...DEFAULT_CONFIG, validation: "none" });
		expect(config.behavior.guard).toBe(false);
	});
});

describe("generated files", () => {
	it("keeps the flow router-agnostic in component mode", () => {
		const files = paths({ ...DEFAULT_CONFIG, navigation: "component" });
		expect(
			files.every((p) => p.startsWith("components/stepperize/checkout/")),
		).toBe(true);
	});

	it("writes route files per framework", () => {
		const routes = (framework: StudioConfig["framework"]) =>
			paths({ ...DEFAULT_CONFIG, framework, navigation: "routes" }).filter(
				(p) => !p.startsWith("components/"),
			);
		expect(routes("nextjs")).toEqual([
			"app/checkout/layout.tsx",
			"app/checkout/page.tsx",
			"app/checkout/[step]/page.tsx",
		]);
		expect(routes("tanstack-start")).toEqual([
			"src/routes/checkout.tsx",
			"src/routes/checkout.index.tsx",
			"src/routes/checkout.$step.tsx",
		]);
		expect(routes("react-router")).toEqual([
			"app/routes/checkout.tsx",
			"app/routes/checkout._index.tsx",
			"app/routes/checkout.$step.tsx",
		]);
	});

	it("keeps search params in the router of each framework", () => {
		const content = (framework: StudioConfig["framework"]) =>
			generateProject({
				...DEFAULT_CONFIG,
				framework,
				navigation: "search-params",
			})
				.files.map((f) => f.content)
				.join("\n");
		expect(content("nextjs")).toContain('from "next/navigation"');
		expect(content("tanstack-start")).toContain("validateSearch");
		expect(content("react-router")).toContain("useSearchParams");
		expect(content("vite")).toContain("useSyncExternalStore");
	});

	it("lists the packages and shadcn components the files import", () => {
		const project = generateProject(DEFAULT_CONFIG);
		expect(project.dependencies).toEqual(
			expect.arrayContaining([
				"@stepperize/react@^8.0.0",
				"react-hook-form",
				"@hookform/resolvers",
				"zod@^4",
			]),
		);
		expect(project.registryDependencies).toEqual(
			expect.arrayContaining([
				"button",
				"checkbox",
				"field",
				"input",
				"native-select",
			]),
		);
		expect(
			generateProject({ ...DEFAULT_CONFIG, ui: "tailwind" })
				.registryDependencies,
		).toEqual([]);
	});

	it("never lets user text escape a string or JSX text", async () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal text is the attack
		const hostile = "</label>{alert(1)}\"'`${x}";
		const config: StudioConfig = {
			...DEFAULT_CONFIG,
			name: hostile,
			steps: [
				{
					title: hostile,
					description: hostile,
					fields: [
						{
							label: hostile,
							type: "select",
							required: true,
							options: [hostile],
						},
					],
				},
				{ title: "Review", description: "", fields: [] },
			],
		};
		for (const validation of VALIDATIONS) {
			for (const file of generateProject(
				normalizeConfig({ ...config, validation }),
			).files) {
				await expect(parse(file.path, file.content)).resolves.toBeUndefined();
			}
		}
		expect(jsxText("Plain label")).toBe("Plain label");
		expect(jsxText("a {b}")).toBe('{"a {b}"}');
	});

	it("produces a valid registry item", () => {
		const item = toRegistryItem(DEFAULT_CONFIG);
		expect(item.type).toBe("registry:block");
		expect(
			item.files.every((f) => f.target === f.path && f.content.length > 0),
		).toBe(true);
		expect(new Set(item.files.map((f) => f.path)).size).toBe(item.files.length);
	});
});

async function parse(path: string, content: string): Promise<undefined> {
	const lang = path.endsWith(".tsx") ? "tsx" : "ts";
	// Throws with the parse error and its location when the source is invalid.
	await transformWithOxc(content, path, { lang });
	return undefined;
}

describe("every combination parses", () => {
	const configs = matrix();

	it(`covers ${configs.length} configs`, async () => {
		for (const config of configs) {
			for (const file of generateProject(config).files) {
				await parse(file.path, file.content);
			}
		}
	});
});
