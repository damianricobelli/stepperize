import { z } from "zod";
import { generateProject } from "./codegen/generate";
import {
	BEHAVIOR_KEYS,
	FIELD_TYPES,
	FORM_OPTIONS,
	FRAMEWORK_OPTIONS,
	INDICATOR_OPTIONS,
	LAYOUT_OPTIONS,
	LIMITS,
	NAVIGATION_OPTIONS,
	normalizeConfig,
	PRESET_IDS,
	PRESETS,
	type StudioConfig,
	unavailableReason,
	VALIDATION_OPTIONS,
} from "./config";
import { FIELD_KINDS, fieldSpec, OTP_LENGTH, PATTERNS } from "./fields";
import {
	encodeConfig,
	registryUrl,
	SITE_ORIGIN,
	shareUrl,
	studioConfigSchema,
} from "./share";

/**
 * Machine-readable guides to Stepper Studio for LLMs and coding agents.
 *
 * Everything here is derived from the same constants the Studio, the
 * generator and the registry endpoint use, so the guide cannot drift from
 * what `shadcn add` actually installs.
 */

/** JSON Schema for a Studio config, served at `/r/studio/schema.json`. */
export function studioJsonSchema(origin = SITE_ORIGIN) {
	return {
		$id: `${origin}/r/studio/schema.json`,
		title: "Stepper Studio config",
		description:
			"A multi-step flow for Stepper Studio. base64url-encode the JSON (UTF-8, no padding) and request /r/studio/<encoded>.json for a shadcn registry item, or open /studio?c=<encoded>.",
		...z.toJSONSchema(studioConfigSchema),
	};
}

// ─── Markdown helpers ────────────────────────────────────────────────────────

const code = (value: string) => `\`${value}\``;
const block = (lang: string, body: string) =>
	`\`\`\`${lang}\n${body.trimEnd()}\n\`\`\``;
const table = (head: string[], rows: string[][]) =>
	[
		`| ${head.join(" | ")} |`,
		`| ${head.map(() => "---").join(" | ")} |`,
		...rows.map(
			(row) =>
				`| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`,
		),
	].join("\n");
const options = <T extends { value: string; label: string; hint: string }>(
	list: T[],
) => list.map((o) => `${code(o.value)} (${o.label}: ${o.hint})`).join(", ");

/** What each field type submits and how it is validated, for the reference table. */
function fieldRule(type: (typeof FIELD_TYPES)[number]): string {
	const spec = fieldSpec({
		label: "Field",
		type,
		required: true,
		options: ["A"],
	});
	switch (spec.kind) {
		case "text":
			if (!spec.format) return "non-empty string";
			if (spec.format === "email" || spec.format === "url")
				return `string, valid ${spec.format}`;
			if (spec.format === "date") return "ISO date string `YYYY-MM-DD`";
			return `string matching ${code(`/${PATTERNS[spec.format]}/`)}`;
		case "number":
			return type === "slider"
				? "number within `min`..`max` (always required)"
				: "number above 0";
		case "choice":
			return "one of `options`";
		case "multi":
			return "array of `options`, at least one when required";
		case "boolean":
			return "boolean; required means it must be on";
	}
}

const CONTROLS: Record<(typeof FIELD_TYPES)[number], string> = {
	text: "Input",
	email: "Input type=email",
	password: "Input type=password",
	tel: "Input type=tel",
	url: "Input type=url",
	textarea: "Textarea",
	otp: `InputOTP (${OTP_LENGTH} slots)`,
	number: "Input type=number",
	slider: "Slider",
	select: "Select",
	radio: "RadioGroup",
	checkboxes: "Checkbox per option",
	checkbox: "Checkbox",
	switch: "Switch",
	date: "DatePicker (Popover + Calendar)",
	time: "Input type=time",
};

/** Each compatibility rule, stated as the config that triggers it plus the code's own reason. */
function compatibilityRules(): string[] {
	const base = PRESETS.blank.config;
	const cases: {
		when: string;
		config: StudioConfig;
		option: Parameters<typeof unavailableReason>[1];
	}[] = [
		{
			when: '`navigation: "routes"` with `framework: "vite"`',
			config: { ...base, framework: "vite" },
			option: { kind: "navigation", value: "routes" },
		},
		{
			when: '`validation: "arktype"` with `form: "conform"`',
			config: { ...base, form: "conform" },
			option: { kind: "validation", value: "arktype" },
		},
		{
			when: '`validation: "none"` with `form: "conform"`',
			config: { ...base, form: "conform" },
			option: { kind: "validation", value: "none" },
		},
		{
			when: '`behavior.guard: true` with `validation: "none"`',
			config: { ...base, validation: "none" },
			option: { kind: "behavior", value: "guard" },
		},
		{
			when: '`behavior.keepMounted: true` with `navigation: "routes"`',
			config: { ...base, navigation: "routes" },
			option: { kind: "behavior", value: "keepMounted" },
		},
	];
	return cases.map(
		({ when, config, option }) =>
			`- ${when}: ${unavailableReason(config, option) ?? "allowed"}`,
	);
}

/** Route files each framework and navigation mode adds next to the flow folder. */
function routeFiles(): string {
	const rows: string[][] = [];
	for (const framework of FRAMEWORK_OPTIONS) {
		for (const navigation of NAVIGATION_OPTIONS) {
			const config: StudioConfig = {
				...PRESETS.checkout.config,
				framework: framework.value,
				navigation: navigation.value,
			};
			const reason = unavailableReason(config, {
				kind: "navigation",
				value: navigation.value,
			});
			const files = reason
				? reason
				: generateProject(normalizeConfig(config))
						.files.map((f) => f.path)
						.filter(
							(path) =>
								!path.startsWith("components/stepperize/checkout/") ||
								path.endsWith("-page.tsx"),
						)
						.map(code)
						.join(", ") || "none: render the flow component";
			rows.push([framework.label, navigation.label, files]);
		}
	}
	return table(["Framework", "Navigation", "Route files"], rows);
}

/** A flow written from scratch, as an agent would, to show the shape end to end. */
export const EXAMPLE_CONFIG: StudioConfig = normalizeConfig({
	name: "Team signup",
	framework: "nextjs",
	navigation: "search-params",
	layout: "horizontal",
	form: "react-hook-form",
	validation: "zod",
	indicator: "check",
	behavior: { linear: true, guard: true, persist: true, keepMounted: false },
	steps: [
		{
			title: "Account",
			description: "Who is signing up?",
			fields: [
				{ label: "Full name", type: "text", required: true },
				{ label: "Work email", type: "email", required: true },
				{ label: "Password", type: "password", required: true },
			],
		},
		{
			title: "Team",
			description: "Tell us about your team.",
			fields: [
				{
					label: "Plan",
					type: "radio",
					required: true,
					options: ["Starter", "Team", "Enterprise"],
				},
				{
					label: "Seats",
					type: "slider",
					required: true,
					min: 1,
					max: 50,
				},
				{
					label: "Notify me about product updates",
					type: "switch",
					required: false,
				},
			],
		},
		{
			title: "Review",
			description: "Confirm and create the team.",
			fields: [],
		},
	],
});

/** `/studio.md`: how an agent builds, shares and installs a flow. */
export function studioAgentGuide(origin = SITE_ORIGIN): string {
	const example = generateProject(EXAMPLE_CONFIG);
	const encoded = encodeConfig(EXAMPLE_CONFIG);
	const sections = [
		"# Stepper Studio",
		"",
		`> Stepper Studio (${origin}/studio) designs a multi-step React flow and generates its source on \`@stepperize/react\` and shadcn/ui. A flow is one JSON config. Encode it to get a share link and a shadcn registry item that installs the generated files with the shadcn CLI.`,
		"",
		"Use this guide to create flows for a user without the visual editor: write a config, encode it, and hand over the install command or the Studio link. The full Stepperize docs are at " +
			`${origin}/llms.txt.`,
		"",
		"## Workflow for agents",
		"",
		`1. Write a config object (reference below; JSON Schema at ${origin}/r/studio/schema.json).`,
		"2. Encode it: base64url of the UTF-8 JSON, without `=` padding.",
		`3. Install it in the user's project: ${code(`npx shadcn@latest add ${origin}/r/studio/<encoded>.json`)}. The project needs shadcn/ui set up (\`components.json\`); the CLI adds the generated files, the npm packages and the shadcn/ui components they import.`,
		`4. Or let the user see and tweak it first: ${code(`${origin}/studio?c=<encoded>`)}.`,
		`5. To read the generated code without installing, GET the registry URL: it returns a shadcn \`registry:block\` item whose \`files[].content\` holds every file, plus \`dependencies\` and \`registryDependencies\`.`,
		"",
		"An invalid config returns HTTP 400 with a JSON `error`. Out-of-range or impossible combinations are repaired, not rejected (see Compatibility).",
		"",
		"### Encoding",
		"",
		block(
			"ts",
			[
				"const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(config))))",
				'\t.replace(/\\+/g, "-")',
				'\t.replace(/\\//g, "_")',
				'\t.replace(/=+$/, "");',
			].join("\n"),
		),
		"",
		block(
			"python",
			[
				"import base64, json",
				'encoded = base64.urlsafe_b64encode(json.dumps(config).encode("utf-8")).decode().rstrip("=")',
			].join("\n"),
		),
		"",
		block(
			"bash",
			`printf '%s' "$CONFIG_JSON" | base64 | tr '+/' '-_' | tr -d '=\\n'`,
		),
		"",
		"## Config reference",
		"",
		table(
			["Key", "Values"],
			[
				[
					"`name`",
					`string, 1 to ${LIMITS.name} characters. Becomes the folder (\`kebab-case\`), the definition variable (\`camelCase\`) and the component prefix (\`PascalCase\`).`,
				],
				["`framework`", options(FRAMEWORK_OPTIONS)],
				["`navigation`", options(NAVIGATION_OPTIONS)],
				["`layout`", options(LAYOUT_OPTIONS)],
				["`indicator`", options(INDICATOR_OPTIONS)],
				["`form`", options(FORM_OPTIONS)],
				[
					"`validation`",
					`${options(VALIDATION_OPTIONS)}. Any Standard Schema library works with Stepperize.`,
				],
				[
					"`behavior`",
					`object with booleans ${BEHAVIOR_KEYS.map(code).join(", ")}: linear navigation, validate before moving forward (\`beforeStepChange\`), save a draft to localStorage, keep every step mounted (\`Stepper.Content forceMount\`).`,
				],
				[
					"`steps`",
					`${LIMITS.steps.min} to ${LIMITS.steps.max} steps: \`{ title, description, fields }\`.`,
				],
			],
		),
		"",
		"### Steps",
		"",
		`- \`title\`: 1 to ${LIMITS.label} characters. Becomes the step id in \`camelCase\` (duplicates get a numeric suffix).`,
		`- \`description\`: up to ${LIMITS.description} characters, may be empty.`,
		`- \`fields\`: up to ${LIMITS.fields} fields. A step without fields renders your own content; the last step without fields becomes a summary of every answer with Edit links.`,
		"",
		"### Fields",
		"",
		`Each field is \`{ label, type, required, options?, min?, max? }\`. \`label\` is 1 to ${LIMITS.label} characters and becomes the field name in \`camelCase\`. \`options\` (1 to ${LIMITS.options} strings, up to ${LIMITS.option} characters each) applies to choice types; \`min\`/\`max\` (integers) apply to \`slider\`. Extras on other types are dropped.`,
		"",
		table(
			["type", "Group", "shadcn/ui control", "Value when required"],
			FIELD_TYPES.map((type) => [
				code(type),
				FIELD_KINDS[type].group,
				CONTROLS[type],
				fieldRule(type),
			]),
		),
		"",
		'Optional text-like fields also accept an empty string; optional choices accept `""` or no value.',
		"",
		"## Compatibility",
		"",
		"Some combinations are unavailable. The Studio disables them, and the registry endpoint repairs a config that asks for one (routes fall back to search params, validation to Zod, impossible behaviors turn off):",
		"",
		...compatibilityRules(),
		"",
		"## Generated files",
		"",
		`Every flow lives in \`components/stepperize/<slug>/\`: the flow component, its navigation (\`<slug>-nav.tsx\`), the step switcher (\`<slug>-step-content.tsx\`), \`definition.ts\` (\`defineStepper\`), \`steps.ts\` (plain step data, safe to import from server code), \`schemas.ts\` when validated, and one component per step in \`steps/\`. Optional helpers appear when needed: \`date-picker.tsx\`, \`progress-ring.tsx\`, \`use-saved-draft.ts\`, \`use-step-param.ts\`.`,
		"",
		"The flow component is router-agnostic. In URL modes it takes `step`, `onStepChange` and `onInvalidStep`, and only the route files below import a router:",
		"",
		routeFiles(),
		"",
		"## Example",
		"",
		"A flow written from scratch:",
		"",
		block("json", JSON.stringify(EXAMPLE_CONFIG, null, 2)),
		"",
		`- Studio: ${shareUrl(EXAMPLE_CONFIG, origin)}`,
		`- Install: ${code(`npx shadcn@latest add ${registryUrl(EXAMPLE_CONFIG, origin)}`)}`,
		`- Packages: ${example.dependencies.map(code).join(", ")}`,
		`- shadcn/ui components: ${example.registryDependencies.map(code).join(", ")}`,
		`- Files: ${example.files.map((f) => code(f.path)).join(", ")}`,
		`- Usage: ${example.usage}`,
		"",
		`Encoded, the config is ${encoded.length} characters; links stay well under the ${12_000}-character limit for flows of any allowed size.`,
		"",
		"## Presets",
		"",
		"Ready-made flows the Studio starts from. Each link opens it in the Studio; each command installs it as is.",
		"",
		...PRESET_IDS.flatMap((id) => {
			const preset = PRESETS[id];
			const steps = preset.config.steps
				.map(
					(step) =>
						`${step.title}${step.fields.length ? ` (${step.fields.map((f) => `${f.label}: ${f.type}`).join(", ")})` : ""}`,
				)
				.join(" → ");
			return [
				`### ${preset.label}`,
				"",
				`${steps}.`,
				"",
				`- Studio: ${origin}/studio?preset=${id}`,
				`- Install: ${code(`npx shadcn@latest add ${registryUrl(preset.config, origin)}`)}`,
				"",
			];
		}),
		"## After installing",
		"",
		"- Every file is plain source in the user's project; edit it freely.",
		"- Send the collected data to an API in the summary step's Finish handler (or the last step's submit). `stepper.data.get(stepId)` returns each step's values.",
		"- To change the flow's shape later, regenerate from the Studio link and reinstall, or edit `steps.ts`, `schemas.ts` and the step components by hand.",
		`- Stepperize docs for the APIs used: ${origin}/llms.mdx/docs/v8/api/react/define-stepper, ${origin}/llms.mdx/docs/v8/forms/index, ${origin}/llms.mdx/docs/v8/guides/navigation.`,
	];
	return `${sections.join("\n")}\n`;
}

const labelOf = <T extends { value: string; label: string }>(
	list: T[],
	value: string,
) => list.find((option) => option.value === value)?.label ?? value;

/** A prompt to hand a coding agent: install this exact flow and wire it up. */
export function agentPrompt(
	config: StudioConfig,
	command: string,
	origin = SITE_ORIGIN,
): string {
	const project = generateProject(config);
	const { names } = project;
	return [
		`Add this Stepperize multi-step flow ("${config.name}") to my project. It was designed in Stepper Studio.`,
		"",
		"Install it with the shadcn CLI (the project needs shadcn/ui set up):",
		"",
		command,
		"",
		`It creates components/stepperize/${names.slug}/ with ${names.Flow}Flow, built on @stepperize/react and shadcn/ui, using ${labelOf(FORM_OPTIONS, config.form)} with ${labelOf(VALIDATION_OPTIONS, config.validation)} validation, for ${labelOf(FRAMEWORK_OPTIONS, config.framework)} with ${labelOf(NAVIGATION_OPTIONS, config.navigation).toLowerCase()} navigation.`,
		`Steps: ${config.steps.map((step) => step.title).join(" → ")}.`,
		`Usage: ${project.usage}`,
		"",
		"After installing, connect the final step to my API and match my app's routes and layout.",
		"",
		`Edit the flow visually: ${shareUrl(config, origin)}`,
		`Studio guide for agents: ${origin}/studio.md`,
		`Stepperize docs for LLMs: ${origin}/llms.txt`,
	].join("\n");
}
