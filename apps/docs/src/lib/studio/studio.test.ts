import { transformWithOxc } from "vite";
import { describe, expect, it } from "vitest";
import {
	EXAMPLE_CONFIG,
	studioAgentGuide,
	studioJsonSchema,
} from "./agent-guide";
import { generateProject, toRegistryItem } from "./codegen/generate";
import { jsxText } from "./codegen/shared";
import {
	BASES,
	DEFAULT_CONFIG,
	FIELD_TYPES,
	type FieldType,
	FORMS,
	FRAMEWORKS,
	LAYOUTS,
	NAVIGATIONS,
	normalizeConfig,
	normalizeField,
	PRESET_IDS,
	PRESETS,
	type StudioConfig,
	unavailableReason,
	VALIDATIONS,
} from "./config";
import { loadSchemaFactory } from "./runtime-schemas";
import { decodeConfig, encodeConfig } from "./share";

/** One field of every type, labelled by its type. */
const everyField = (required: boolean) =>
	FIELD_TYPES.map((type) =>
		normalizeField({
			label: type,
			type,
			required,
			...(type === "slider" ? { min: 1, max: 9 } : {}),
		}),
	);

/** A flow that exercises every field type, required and optional. */
const EVERY_FIELD: StudioConfig = {
	...DEFAULT_CONFIG,
	steps: [
		{
			title: "Required A",
			description: "",
			fields: everyField(true).slice(0, 8),
		},
		{ title: "Required B", description: "", fields: everyField(true).slice(8) },
		{
			title: "Optional A",
			description: "",
			fields: everyField(false).slice(0, 8),
		},
		{
			title: "Optional B",
			description: "",
			fields: everyField(false).slice(8),
		},
		{ title: "Review", description: "", fields: [] },
	],
};

const paths = (config: StudioConfig) =>
	generateProject(config).files.map((f) => f.path);

/** Every combination the panel can produce, minus the ones it disables. */
function matrix(): StudioConfig[] {
	const out: StudioConfig[] = [];
	for (const framework of FRAMEWORKS)
		for (const navigation of NAVIGATIONS)
			for (const form of FORMS)
				for (const validation of VALIDATIONS) {
					const config = {
						...DEFAULT_CONFIG,
						framework,
						navigation,
						form,
						validation,
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
	for (const base of BASES)
		for (const form of FORMS)
			for (const validation of VALIDATIONS) {
				const config = { ...EVERY_FIELD, base, form, validation };
				if (
					!unavailableReason(config, { kind: "validation", value: validation })
				)
					out.push(normalizeConfig(config));
			}
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

describe("fields", () => {
	it("keeps only the extras a type reads", () => {
		expect(
			normalizeField({
				label: "A",
				type: "text",
				required: true,
				options: ["x"],
				min: 1,
			}),
		).toEqual({ label: "A", type: "text", required: true });
		expect(
			normalizeField({ label: "A", type: "radio", required: true }).options,
		).toHaveLength(3);
		expect(
			normalizeField({
				label: "A",
				type: "slider",
				required: true,
				min: 5,
				max: 2,
			}),
		).toMatchObject({ min: 5, max: 6 });
	});

	it("round-trips every field type through a share link", () => {
		expect(decodeConfig(encodeConfig(EVERY_FIELD))).toEqual(EVERY_FIELD);
	});

	it("ships the date picker only to flows that use a date", () => {
		const has = (config: StudioConfig) =>
			paths(config).some((p) => p.endsWith("/date-picker.tsx"));
		expect(has(EVERY_FIELD)).toBe(true);
		expect(has(DEFAULT_CONFIG)).toBe(false);
	});

	it("opens links from when the UI kit was configurable, with shadcn/ui", () => {
		const legacy = { ...DEFAULT_CONFIG, ui: "tailwind" };
		const encoded = btoa(JSON.stringify(legacy))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		const decoded = decodeConfig(encoded);
		expect(decoded).toEqual(DEFAULT_CONFIG);
		expect(decoded && "ui" in decoded).toBe(false);
	});
});

describe("shadcn/ui bases", () => {
	/** All step files of a flow, concatenated. */
	const steps = (config: StudioConfig) =>
		generateProject(config)
			.files.filter((f) => f.path.includes("/steps/"))
			.map((f) => f.content)
			.join("\n");
	const datePicker = (config: StudioConfig) =>
		generateProject(config).files.find((f) =>
			f.path.endsWith("/date-picker.tsx"),
		)?.content ?? "";

	it("opens links from before the choice existed on Radix", () => {
		const { base: _, ...legacy } = DEFAULT_CONFIG;
		expect(decodeConfig(encodeConfig(legacy as StudioConfig))?.base).toBe(
			"radix",
		);
	});

	it("spells Radix props", () => {
		const code = steps({ ...EVERY_FIELD, base: "radix" });
		expect(code).toContain('<SelectContent position="popper">');
		expect(code).toContain('value={field.value ?? ""} onValueChange=');
		expect(code).toContain("field.onChange(checked === true)");
		expect(code).toContain("field.onChange(value[0] ?? 1)");
		expect(code).not.toContain("alignItemWithTrigger");
		expect(datePicker({ ...EVERY_FIELD, base: "radix" })).toContain(
			"<PopoverTrigger asChild>",
		);
	});

	it("spells Base UI props", () => {
		const code = steps({ ...EVERY_FIELD, base: "base" });
		expect(code).toContain("<SelectContent alignItemWithTrigger={false}>");
		expect(code).toContain("value={field.value ?? null} onValueChange=");
		expect(datePicker({ ...EVERY_FIELD, base: "base" })).toContain(
			"<PopoverTrigger\n\t\t\t\trender={",
		);
	});

	it("spells React Aria props", () => {
		const aria = { ...EVERY_FIELD, base: "aria" } as const;
		const code = steps(aria);
		for (const prop of [
			"isSelected={field.value ?? false} onChange=",
			"isInvalid={!!errors.",
			"minValue={1} maxValue={9}",
			"<SelectItem key={option} id={option}>",
			'placeholder="Select…"',
			"isDisabled={stepper.isFirst} onPress={() => stepper.prev()}",
		])
			expect(code).toContain(prop);
		// The shipped DatePicker keeps its own `onValueChange` on every base.
		for (const prop of ["onCheckedChange", "alignItemWithTrigger", "onClick="])
			expect(code).not.toContain(prop);
		expect(datePicker(aria)).toContain('from "@internationalized/date"');
		expect(generateProject(aria).dependencies).toContain(
			"@internationalized/date",
		);
	});

	it("submits React Aria sliders from uncontrolled forms through a hidden input", () => {
		const code = steps({ ...EVERY_FIELD, base: "aria", form: "native" });
		expect(code).toContain(
			"const [sliderValue, setSliderValue] = useState<number>(saved?.slider ?? 1);",
		);
		expect(code).toContain(
			'<input type="hidden" name="slider" value={sliderValue} />',
		);
	});
});

const VALID: Record<FieldType, unknown> = {
	text: "Ada",
	email: "ada@example.com",
	password: "secret",
	tel: "+1 555 0100",
	url: "https://example.com",
	textarea: "Hello",
	otp: "123456",
	number: 3,
	slider: 4,
	select: "Option A",
	radio: "Option B",
	checkboxes: ["Option A", "Option C"],
	checkbox: true,
	switch: true,
	date: "2024-02-29",
	time: "09:30",
};

/** What each control submits when the user leaves it alone. */
const UNTOUCHED: Record<FieldType, unknown> = {
	text: "",
	email: "",
	password: "",
	tel: "",
	url: "",
	textarea: "",
	otp: "",
	number: undefined,
	slider: 1,
	select: "",
	radio: "",
	checkboxes: [],
	checkbox: false,
	switch: false,
	date: "",
	time: "",
};

describe("preview schemas", () => {
	const issueKeys = (issues: readonly { path?: readonly unknown[] }[] = []) =>
		new Set(
			issues.map((issue) => {
				const key = issue.path?.[0];
				return String(
					typeof key === "object" && key ? (key as { key: unknown }).key : key,
				);
			}),
		);

	for (const validation of ["zod", "valibot", "arktype"] as const) {
		it(`${validation}: accepts valid values, flags untouched required fields, lets optional ones pass`, async () => {
			const factory = await loadSchemaFactory(validation);
			if (!factory) throw new Error("no factory");
			const schema = (required: boolean) =>
				factory(
					everyField(required).map((field) => ({ key: field.type, field })),
				);

			const valid = await schema(true)["~standard"].validate(VALID);
			expect(valid.issues).toBeUndefined();

			const untouched = await schema(true)["~standard"].validate(UNTOUCHED);
			// A slider always holds an in-range value, so it is the only field that passes.
			expect(issueKeys(untouched.issues)).toEqual(
				new Set(FIELD_TYPES.filter((type) => type !== "slider")),
			);

			const optional = await schema(false)["~standard"].validate(UNTOUCHED);
			expect(optional.issues).toBeUndefined();
		});
	}
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
		expect(project.registryDependencies).toEqual([
			"button",
			"field",
			"input",
			"radio-group",
			"select",
			"switch",
		]);
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

describe("agent guide", () => {
	const guide = studioAgentGuide();

	it("documents every field type, framework and preset", () => {
		for (const type of FIELD_TYPES) expect(guide).toContain(`| \`${type}\` |`);
		for (const framework of FRAMEWORKS)
			expect(guide).toContain(`\`${framework}\``);
		for (const id of PRESET_IDS)
			expect(guide).toContain(`/studio?preset=${id}`);
	});

	it("states each compatibility rule with the reason the code gives", () => {
		const rules = guide
			.split("## Compatibility")[1]
			.split("## Generated files")[0]
			.split("\n")
			.filter((line) => line.startsWith("- "));
		expect(rules.length).toBeGreaterThanOrEqual(5);
		for (const rule of rules) expect(rule).not.toMatch(/: allowed$/);
	});

	it("links configs that decode back to themselves", () => {
		const links = [...guide.matchAll(/\/r\/studio\/([\w-]+)\.json/g)]
			.map((match) => match[1])
			.filter((encoded) => encoded !== "schema");
		expect(links.length).toBeGreaterThan(PRESET_IDS.length);
		expect(decodeConfig(links[0])).toEqual(EXAMPLE_CONFIG);
		for (const encoded of links) expect(decodeConfig(encoded)).toBeDefined();
	});

	it("publishes a JSON Schema for the whole config", () => {
		const schema = studioJsonSchema() as {
			type: string;
			properties: Record<string, unknown>;
		};
		expect(schema.type).toBe("object");
		expect(Object.keys(schema.properties)).toEqual(
			expect.arrayContaining(Object.keys(EXAMPLE_CONFIG)),
		);
	});
});
