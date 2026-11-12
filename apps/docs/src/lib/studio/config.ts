/**
 * Stepper Studio configuration model.
 *
 * Generated code is built on shadcn/ui: the flow installs with the shadcn CLI,
 * so the project it lands in already has the components it imports.
 *
 * One serializable object describes a whole flow. The generator, the live
 * preview, the share link and the dynamic registry endpoint all read the same
 * shape, so what you see in the Studio is what `shadcn add` installs.
 */

/** shadcn/ui ships each component on one of three primitive libraries. */
export const BASES = ["radix", "base", "aria"] as const;
export const FRAMEWORKS = [
	"nextjs",
	"tanstack-start",
	"react-router",
	"vite",
] as const;
export const NAVIGATIONS = ["component", "search-params", "routes"] as const;
export const LAYOUTS = [
	"horizontal",
	"vertical",
	"progress",
	"segmented",
	"circular",
	"breadcrumb",
] as const;
export const FORMS = [
	"react-hook-form",
	"tanstack-form",
	"conform",
	"native",
] as const;
export const VALIDATIONS = ["zod", "valibot", "arktype", "none"] as const;
export const INDICATORS = ["number", "check", "dot"] as const;
export const FIELD_TYPES = [
	"text",
	"email",
	"password",
	"tel",
	"url",
	"textarea",
	"number",
	"slider",
	"select",
	"radio",
	"checkboxes",
	"checkbox",
	"switch",
	"date",
	"time",
	"otp",
] as const;

export type Base = (typeof BASES)[number];
export type Framework = (typeof FRAMEWORKS)[number];
export type Navigation = (typeof NAVIGATIONS)[number];
export type Layout = (typeof LAYOUTS)[number];
export type FormLibrary = (typeof FORMS)[number];
export type Validation = (typeof VALIDATIONS)[number];
export type Indicator = (typeof INDICATORS)[number];
export type FieldType = (typeof FIELD_TYPES)[number];

export type StudioField = {
	label: string;
	type: FieldType;
	required: boolean;
	/** Choices for `select`, `radio` and `checkboxes`. */
	options?: string[];
	/** Bounds for `slider`. */
	min?: number;
	max?: number;
};

export type StudioStep = {
	title: string;
	description: string;
	fields: StudioField[];
};

export type StudioBehavior = {
	/** `linear: true` on the definition. */
	linear: boolean;
	/** `beforeStepChange` runs `validate()` before moving forward. */
	guard: boolean;
	/** Restore flow data from localStorage. */
	persist: boolean;
	/** `Stepper.Content forceMount` so local field state survives navigation. */
	keepMounted: boolean;
};

export const BEHAVIOR_KEYS = [
	"linear",
	"guard",
	"persist",
	"keepMounted",
] as const satisfies readonly (keyof StudioBehavior)[];

export type StudioConfig = {
	name: string;
	/** The primitives under the project's shadcn/ui components. */
	base: Base;
	framework: Framework;
	navigation: Navigation;
	layout: Layout;
	form: FormLibrary;
	validation: Validation;
	indicator: Indicator;
	behavior: StudioBehavior;
	steps: StudioStep[];
};

/** Hard limits. The registry endpoint decodes untrusted input against them. */
export const LIMITS = {
	name: 40,
	label: 60,
	description: 120,
	option: 40,
	steps: { min: 2, max: 8 },
	fields: 8,
	options: 8,
	/** Slider bounds stay small integers so generated code reads naturally. */
	range: { min: -100_000, max: 100_000 },
} as const;

// ─── Option catalogs (labels live next to the values they describe) ───────────

type Option<Value extends string> = {
	value: Value;
	label: string;
	hint: string;
};

export const BASE_OPTIONS: Option<Base>[] = [
	{ value: "radix", label: "Radix UI", hint: "radix-ui" },
	{ value: "base", label: "Base UI", hint: "@base-ui/react" },
	{ value: "aria", label: "React Aria", hint: "react-aria-components" },
];

export const FRAMEWORK_OPTIONS: Option<Framework>[] = [
	{ value: "nextjs", label: "Next.js", hint: "App Router" },
	{ value: "tanstack-start", label: "TanStack Start", hint: "File routes" },
	{ value: "react-router", label: "React Router", hint: "Framework mode" },
	{ value: "vite", label: "Vite", hint: "No router" },
];

export const NAVIGATION_OPTIONS: Option<Navigation>[] = [
	{
		value: "component",
		label: "Component",
		hint: "Drop it anywhere. State lives in memory.",
	},
	{
		value: "search-params",
		label: "Search params",
		hint: "One page. The step lives in ?step=.",
	},
	{
		value: "routes",
		label: "Routes",
		hint: "One URL per step. A layout keeps the data.",
	},
];

export const LAYOUT_OPTIONS: Option<Layout>[] = [
	{ value: "horizontal", label: "Horizontal", hint: "Numbered steps in a row" },
	{ value: "vertical", label: "Vertical", hint: "A rail beside the content" },
	{ value: "progress", label: "Progress", hint: "One bar, no step list" },
	{ value: "segmented", label: "Segmented", hint: "Tabs for short flows" },
	{ value: "circular", label: "Circular", hint: "A ring with the count" },
	{ value: "breadcrumb", label: "Breadcrumb", hint: "A trail with chevrons" },
];

export const FORM_OPTIONS: Option<FormLibrary>[] = [
	{
		value: "react-hook-form",
		label: "React Hook Form",
		hint: "react-hook-form",
	},
	{
		value: "tanstack-form",
		label: "TanStack Form",
		hint: "@tanstack/react-form",
	},
	{ value: "conform", label: "Conform", hint: "@conform-to/react" },
	{ value: "native", label: "Native form", hint: "FormData + validate()" },
];

export const VALIDATION_OPTIONS: Option<Validation>[] = [
	{ value: "zod", label: "Zod", hint: "zod" },
	{ value: "valibot", label: "Valibot", hint: "valibot" },
	{ value: "arktype", label: "ArkType", hint: "arktype" },
	{ value: "none", label: "None", hint: "Untyped data" },
];

export const INDICATOR_OPTIONS: Option<Indicator>[] = [
	{
		value: "number",
		label: "Number",
		hint: "Every marker shows its step number, done or not.",
	},
	{
		value: "check",
		label: "Check",
		hint: "Numbers until a step is complete, then a check. You see it after moving past a step.",
	},
	{
		value: "dot",
		label: "Dot",
		hint: "A dot instead of a number. Color alone tells done, current and next apart.",
	},
];

// ─── Compatibility ────────────────────────────────────────────────────────────

/**
 * Why an option is unavailable under the current config, or `undefined`.
 * The panel disables options with a reason; `normalizeConfig` repairs configs
 * that arrive in an impossible state (old share links, hand-edited URLs).
 */
export function unavailableReason(
	config: StudioConfig,
	option:
		| { kind: "navigation"; value: Navigation }
		| { kind: "validation"; value: Validation }
		| { kind: "behavior"; value: keyof StudioBehavior },
): string | undefined {
	if (
		option.kind === "navigation" &&
		option.value === "routes" &&
		config.framework === "vite"
	) {
		return "Plain Vite has no router. Use search params or a component.";
	}
	if (
		option.kind === "validation" &&
		option.value === "arktype" &&
		config.form === "conform"
	) {
		return "Conform has no ArkType adapter.";
	}
	if (
		option.kind === "validation" &&
		option.value === "none" &&
		config.form === "conform"
	) {
		return "Conform parses submissions with a schema.";
	}
	if (
		option.kind === "behavior" &&
		option.value === "guard" &&
		config.validation === "none"
	) {
		return "Needs a validation library.";
	}
	if (
		option.kind === "behavior" &&
		option.value === "keepMounted" &&
		config.navigation === "routes"
	) {
		return "Each step is its own route.";
	}
	return undefined;
}

/** Field types that need a list of choices. */
export const CHOICE_TYPES: ReadonlySet<FieldType> = new Set([
	"select",
	"radio",
	"checkboxes",
]);

export const DEFAULT_OPTIONS = ["Option A", "Option B", "Option C"];
export const DEFAULT_RANGE = { min: 0, max: 100 } as const;

/**
 * Keeps only the extras a field type reads, with sane values: choices for
 * choice fields, an increasing range for sliders. Called on every edit and on
 * every decoded link, so the generator never sees a half-configured field.
 */
export function normalizeField(field: StudioField): StudioField {
	const base = {
		label: field.label,
		type: field.type,
		required: field.required,
	};
	if (CHOICE_TYPES.has(field.type)) {
		return {
			...base,
			options: field.options?.length ? field.options : DEFAULT_OPTIONS,
		};
	}
	if (field.type === "slider") {
		const min = Number.isFinite(field.min)
			? Math.trunc(field.min as number)
			: DEFAULT_RANGE.min;
		const max = Number.isFinite(field.max)
			? Math.trunc(field.max as number)
			: DEFAULT_RANGE.max;
		return max > min ? { ...base, min, max } : { ...base, min, max: min + 1 };
	}
	return base;
}

export function normalizeConfig(config: StudioConfig): StudioConfig {
	let next: StudioConfig = {
		...config,
		steps: config.steps.map((step) => ({
			...step,
			fields: step.fields.map(normalizeField),
		})),
	};
	if (unavailableReason(next, { kind: "navigation", value: next.navigation })) {
		next = { ...next, navigation: "search-params" };
	}
	if (unavailableReason(next, { kind: "validation", value: next.validation })) {
		next = { ...next, validation: "zod" };
	}
	const behavior = { ...next.behavior };
	for (const key of Object.keys(behavior) as (keyof StudioBehavior)[]) {
		if (
			behavior[key] &&
			unavailableReason(next, { kind: "behavior", value: key })
		)
			behavior[key] = false;
	}
	return { ...next, behavior };
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const field = (
	label: string,
	type: FieldType = "text",
	required = true,
	extra: Pick<StudioField, "options" | "min" | "max"> = {},
): StudioField => normalizeField({ label, type, required, ...extra });

const BASE: Omit<StudioConfig, "name" | "steps"> = {
	base: "radix",
	framework: "nextjs",
	navigation: "search-params",
	layout: "horizontal",
	form: "react-hook-form",
	validation: "zod",
	indicator: "check",
	behavior: { linear: true, guard: true, persist: false, keepMounted: false },
};

export const PRESETS = {
	checkout: {
		label: "Checkout",
		block: "validated-checkout",
		config: {
			...BASE,
			name: "Checkout",
			steps: [
				{
					title: "Shipping",
					description: "Where should we send your order?",
					fields: [
						field("Full name"),
						field("Email", "email"),
						field("Address"),
						field("Country", "select", true, {
							options: ["Argentina", "Spain", "Mexico", "United States"],
						}),
						field("Delivery", "radio", true, {
							options: ["Standard", "Express"],
						}),
					],
				},
				{
					title: "Payment",
					description: "Cards are charged when the order ships.",
					fields: [
						field("Cardholder"),
						field("Card number"),
						field("Save card for next time", "switch", false),
					],
				},
				{
					title: "Review",
					description: "Check everything before you place the order.",
					fields: [],
				},
			],
		},
	},
	onboarding: {
		label: "Onboarding",
		block: "user-onboarding",
		config: {
			...BASE,
			name: "Onboarding",
			layout: "vertical",
			steps: [
				{
					title: "Profile",
					description: "Tell your teammates who you are.",
					fields: [
						field("Name"),
						field("Role", "select", true, {
							options: ["Engineering", "Design", "Product", "Other"],
						}),
					],
				},
				{
					title: "Workspace",
					description: "This is where your team will work.",
					fields: [
						field("Workspace name"),
						field("Team size", "slider", true, { min: 1, max: 50 }),
						field("Use cases", "checkboxes", true, {
							options: ["Planning", "Design", "Engineering", "Support"],
						}),
					],
				},
				{
					title: "Invite",
					description: "Bring a teammate along. You can skip this.",
					fields: [
						field("Teammate email", "email", false),
						field("Message", "textarea", false),
					],
				},
				{
					title: "Done",
					description: "Review your answers and enter the workspace.",
					fields: [],
				},
			],
		},
	},
	kyc: {
		label: "Identity check",
		block: "kyc-verification",
		config: {
			...BASE,
			name: "Identity check",
			navigation: "routes",
			layout: "progress",
			steps: [
				{
					title: "Personal",
					description: "As it appears on your ID.",
					fields: [
						field("Legal name"),
						field("Date of birth", "date"),
						field("Phone", "tel"),
					],
				},
				{
					title: "Document",
					description: "We accept passports and national IDs.",
					fields: [
						field("Document type", "radio", true, {
							options: ["Passport", "National ID", "Driver license"],
						}),
						field("Document number"),
					],
				},
				{
					title: "Verify",
					description: "Enter the code we sent to your phone.",
					fields: [
						field("Verification code", "otp"),
						field("I confirm the data above is correct", "checkbox"),
					],
				},
				{
					title: "Submit",
					description: "Verification usually takes under 2 minutes.",
					fields: [],
				},
			],
		},
	},
	blank: {
		label: "Blank",
		block: undefined,
		config: {
			...BASE,
			name: "My flow",
			navigation: "component",
			steps: [
				{ title: "First step", description: "", fields: [field("Name")] },
				{ title: "Second step", description: "", fields: [] },
				{ title: "Third step", description: "", fields: [] },
			],
		},
	},
} satisfies Record<
	string,
	{ label: string; block: string | undefined; config: StudioConfig }
>;

export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
export const DEFAULT_CONFIG: StudioConfig = PRESETS.checkout.config;

/** The preset a Blocks gallery item opens in the Studio, if any. */
export function presetForBlock(blockId: string): PresetId | undefined {
	return PRESET_IDS.find((id) => PRESETS[id].block === blockId);
}
