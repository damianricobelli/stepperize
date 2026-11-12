import DATE_PICKER from "@/components/studio/kit/date-picker.tsx?raw";
import type { StudioConfig } from "../config";
import { generateStep, stepComponent } from "./forms";
import { generateNav, PROGRESS_RING } from "./layouts";
import {
	generateRouteFiles,
	USE_SAVED_DRAFT,
	USE_STEP_PARAM,
	usageNote,
} from "./navigation";
import {
	cls,
	deriveNames,
	hasFields,
	kebab,
	type Names,
	source,
	str,
	USE_CLIENT,
	usesValidation,
} from "./shared";
import { generateSchemas, schemaName } from "./validation";

export type GeneratedFile = {
	/** Path from the project root, also the shadcn registry `target`. */
	path: string;
	content: string;
	type:
		| "registry:component"
		| "registry:hook"
		| "registry:lib"
		| "registry:page"
		| "registry:file";
};

export type GeneratedProject = {
	names: Names;
	files: GeneratedFile[];
	/** npm packages, versioned where it matters. */
	dependencies: string[];
	/** shadcn/ui components imported from `@/components/ui/*`. */
	registryDependencies: string[];
	usage: string;
};

export const STEPPERIZE_DEPENDENCY = "@stepperize/react@^8.0.0";

// ─── Framework-agnostic core ─────────────────────────────────────────────────

function stepsFile(config: StudioConfig, names: Names): string {
	const withSchema = usesValidation(config);
	const schemas = config.steps.flatMap((step, i) =>
		withSchema && hasFields(step) ? [schemaName(names.stepIds[i])] : [],
	);
	return source([
		schemas.length
			? `import { ${schemas.join(", ")} } from "./schemas";`
			: null,
		"",
		"// Plain data, safe to import from server code (route params, static paths).",
		`export const ${names.flow}Steps = [`,
		...config.steps.map((step, i) => {
			const parts = [
				`id: ${str(names.stepIds[i])}`,
				`title: ${str(step.title)}`,
			];
			// Always present, so `step.description` reads the same on every step.
			parts.push(`description: ${str(step.description)}`);
			if (withSchema && hasFields(step))
				parts.push(`schema: ${schemaName(names.stepIds[i])}`);
			return `\t{ ${parts.join(", ")} },`;
		}),
		"] as const;",
	]);
}

function definitionFile(config: StudioConfig, names: Names): string {
	return source([
		'import { defineStepper } from "@stepperize/react";',
		`import { ${names.flow}Steps } from "./steps";`,
		"",
		`export const ${names.flow} = defineStepper(${names.flow}Steps${config.behavior.linear ? ", { linear: true }" : ""});`,
	]);
}

function stepContentFile(config: StudioConfig, names: Names): string {
	const { flow, Flow, stepIds } = names;
	const ui = config.ui;
	const imports = stepIds.map(
		(id) => `import { ${stepComponent(id)} } from "./steps/${kebab(id)}";`,
	);
	const header = [
		`function ${Flow}StepHeader() {`,
		`\tconst step = ${flow}.useStepperContext((stepper) => stepper.current);`,
		"",
		"\treturn (",
		`\t\t<header${cls(ui, "grid gap-1")}>`,
		`\t\t\t<h2${cls(ui, "text-lg font-semibold tracking-tight")}>{step.title}</h2>`,
		`\t\t\t{step.description ? <p${cls(ui, "text-sm text-muted-foreground")}>{step.description}</p> : null}`,
		"\t\t</header>",
		"\t);",
		"}",
	];
	if (config.behavior.keepMounted) {
		return source([
			USE_CLIENT,
			"",
			`import { ${flow} } from "./definition";`,
			...imports,
			"",
			`const { Stepper } = ${flow};`,
			"",
			...header,
			"",
			"// Every panel stays mounted, so unsaved field state survives Back and Next.",
			`export function ${Flow}StepContent() {`,
			"\treturn (",
			`\t\t<div${cls(ui, "grid gap-6")}>`,
			`\t\t\t<${Flow}StepHeader />`,
			...stepIds.map((id) =>
				[
					`\t\t\t<Stepper.Content step=${str(id)} forceMount>`,
					`\t\t\t\t<${stepComponent(id)} />`,
					"\t\t\t</Stepper.Content>",
				].join("\n"),
			),
			"\t\t</div>",
			"\t);",
			"}",
		]);
	}
	return source([
		USE_CLIENT,
		"",
		'import type { ComponentType } from "react";',
		`import { ${flow} } from "./definition";`,
		...imports,
		`import type { ${flow}Steps } from "./steps";`,
		"",
		`const STEP_COMPONENTS = {`,
		...stepIds.map((id) => `\t${id}: ${stepComponent(id)},`),
		`} satisfies Record<(typeof ${flow}Steps)[number]["id"], ComponentType>;`,
		"",
		...header,
		"",
		`export function ${Flow}StepContent() {`,
		"\t// Subscribes to the step id only: typing in a field never re-renders this.",
		`\tconst id = ${flow}.useStepperContext((stepper) => stepper.id);`,
		"\tconst Step = STEP_COMPONENTS[id];",
		"",
		"\treturn (",
		`\t\t<div${cls(ui, "grid gap-6")}>`,
		`\t\t\t<${Flow}StepHeader />`,
		"\t\t\t<Step />",
		"\t\t</div>",
		"\t);",
		"}",
	]);
}

function flowFile(config: StudioConfig, names: Names): string {
	const { flow, Flow, slug } = names;
	const ui = config.ui;
	const { navigation, layout, behavior } = config;
	const controlled = navigation !== "component";
	const routed = navigation === "routes";
	const guard = behavior.guard && usesValidation(config);
	const vertical = layout === "vertical";

	const typeImports = [
		controlled ? "UseStepperOptions" : null,
		guard ? "BeforeStepChange" : null,
		behavior.persist ? "FlowData" : null,
	].filter(Boolean);
	const rootProps = [
		vertical ? 'orientation="vertical"' : null,
		controlled ? "{...props}" : null,
		behavior.persist ? "defaultData={draft.data}" : null,
		behavior.persist ? "onDataChange={draft.save}" : null,
		guard ? "beforeStepChange={validateForward}" : null,
		ui === "unstyled"
			? null
			: `className="${vertical ? "flex flex-col gap-8 sm:flex-row" : "grid gap-8"}"`,
	].filter((p): p is string => p !== null);

	const content = routed ? "{children}" : `<${Flow}StepContent />`;
	const body = vertical
		? [`<div${cls(ui, "min-w-0 flex-1")}>`, `\t${content}`, "</div>"]
		: [content];

	return source([
		USE_CLIENT,
		"",
		typeImports.length
			? `import type { ${typeImports.join(", ")} } from "@stepperize/react";`
			: null,
		routed ? 'import type { ReactNode } from "react";' : null,
		`import { ${flow} } from "./definition";`,
		`import { ${Flow}Nav } from "./${slug}-nav";`,
		routed
			? null
			: `import { ${Flow}StepContent } from "./${slug}-step-content";`,
		controlled || guard || behavior.persist
			? `import type { ${flow}Steps } from "./steps";`
			: null,
		behavior.persist
			? 'import { useSavedDraft } from "./use-saved-draft";'
			: null,
		"",
		`const { Stepper } = ${flow};`,
		"",
		behavior.persist
			? `const DRAFT_KEY = ${str(`stepperize:${slug}:v1`)};`
			: null,
		guard ? "" : null,
		guard
			? "// Going back is always allowed; moving forward needs a valid step."
			: null,
		guard
			? `const validateForward: BeforeStepChange<typeof ${flow}Steps> = async ({ fromIndex, toIndex, validate }) =>`
			: null,
		guard ? "\ttoIndex < fromIndex || (await validate()).success;" : null,
		"",
		controlled
			? `type ${Flow}FlowProps = Pick<UseStepperOptions<typeof ${flow}Steps>, "step" | "onStepChange" | "onInvalidStep">${routed ? " & {\n\tchildren: ReactNode;\n}" : ""};`
			: null,
		"",
		`export function ${Flow}Flow(${controlled ? (routed ? `{ children, ...props }: ${Flow}FlowProps` : `props: ${Flow}FlowProps`) : ""}) {`,
		behavior.persist
			? `\tconst draft = useSavedDraft<FlowData<typeof ${flow}Steps>>(DRAFT_KEY);`
			: null,
		behavior.persist ? "" : null,
		"\treturn (",
		rootProps.length > 1
			? "\t\t<Stepper.Root"
			: `\t\t<Stepper.Root${rootProps.length ? ` ${rootProps[0]}` : ""}>`,
		...(rootProps.length > 1
			? [...rootProps.map((p) => `\t\t\t${p}`), "\t\t>"]
			: []),
		`\t\t\t<${Flow}Nav />`,
		...body.map((line) => `\t\t\t${line}`),
		"\t\t</Stepper.Root>",
		"\t);",
		"}",
	]);
}

// ─── Assembly ────────────────────────────────────────────────────────────────

function dependenciesOf(
	config: StudioConfig,
	files: GeneratedFile[],
): string[] {
	const deps = new Set([STEPPERIZE_DEPENDENCY]);
	const validated = usesValidation(config);
	if (config.form === "react-hook-form") {
		deps.add("react-hook-form");
		if (validated) deps.add("@hookform/resolvers");
	}
	if (config.form === "tanstack-form") deps.add("@tanstack/react-form");
	if (config.form === "conform") {
		deps.add("@conform-to/react");
		deps.add(
			config.validation === "valibot"
				? "@conform-to/valibot"
				: "@conform-to/zod",
		);
	}
	if (validated)
		deps.add(config.validation === "zod" ? "zod@^4" : config.validation);
	if (files.some((f) => f.content.includes('from "lucide-react"')))
		deps.add("lucide-react");
	return [...deps];
}

function registryDependenciesOf(files: GeneratedFile[]): string[] {
	const found = new Set<string>();
	for (const file of files) {
		for (const match of file.content.matchAll(
			/from "@\/components\/ui\/([a-z-]+)"/g,
		))
			found.add(match[1]);
	}
	return [...found].sort();
}

export function generateProject(config: StudioConfig): GeneratedProject {
	const names = deriveNames(config);
	const base = `components/stepperize/${names.slug}`;
	const component = (name: string, content: string): GeneratedFile => ({
		path: `${base}/${name}`,
		content,
		type: "registry:component",
	});

	const files: GeneratedFile[] = [
		component(`${names.slug}-flow.tsx`, flowFile(config, names)),
	];
	files.push(component(`${names.slug}-nav.tsx`, generateNav(config, names)));
	files.push(
		component(`${names.slug}-step-content.tsx`, stepContentFile(config, names)),
	);
	files.push({
		path: `${base}/definition.ts`,
		content: definitionFile(config, names),
		type: "registry:lib",
	});
	files.push({
		path: `${base}/steps.ts`,
		content: stepsFile(config, names),
		type: "registry:lib",
	});
	if (usesValidation(config)) {
		files.push({
			path: `${base}/schemas.ts`,
			content: generateSchemas(config, names),
			type: "registry:lib",
		});
	}
	config.steps.forEach((_, i) => {
		files.push(
			component(
				`steps/${kebab(names.stepIds[i])}.tsx`,
				generateStep(config, names, i),
			),
		);
	});
	if (config.layout === "circular")
		files.push(component("progress-ring.tsx", PROGRESS_RING));
	// The same component the Studio preview renders, shipped verbatim.
	if (
		config.ui === "shadcn" &&
		config.steps.some((step) => step.fields.some((f) => f.type === "date"))
	)
		files.push(component("date-picker.tsx", DATE_PICKER));
	if (config.behavior.persist) {
		files.push({
			path: `${base}/use-saved-draft.ts`,
			content: USE_SAVED_DRAFT,
			type: "registry:hook",
		});
	}
	if (config.navigation === "search-params" && config.framework === "vite") {
		files.push({
			path: `${base}/use-step-param.ts`,
			content: USE_STEP_PARAM,
			type: "registry:hook",
		});
	}
	for (const route of generateRouteFiles(config, names)) {
		files.push({
			path: route.path,
			content: route.content,
			type: route.path.startsWith("components/")
				? "registry:component"
				: route.kind === "page"
					? "registry:page"
					: "registry:file",
		});
	}

	return {
		names,
		files,
		dependencies: dependenciesOf(config, files),
		registryDependencies: registryDependenciesOf(files),
		usage: usageNote(config, names),
	};
}

/** A shadcn registry item (`registry-item.json` schema) for the config. */
export function toRegistryItem(
	config: StudioConfig,
	project = generateProject(config),
) {
	return {
		$schema: "https://ui.shadcn.com/schema/registry-item.json",
		name: project.names.slug,
		type: "registry:block",
		title: config.name,
		description: `${config.name} flow generated by Stepperize Studio.`,
		dependencies: project.dependencies,
		registryDependencies: project.registryDependencies,
		files: project.files.map((file) => ({
			path: file.path,
			type: file.type,
			target: file.path,
			content: file.content,
		})),
	};
}
