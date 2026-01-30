import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryRoot = path.join(__dirname, "..", "registry", "base-ui", "blocks");
const outDir = path.join(__dirname, "..", "public", "r", "base-ui");

const blocks = [
	"stepper-demo",
	"stepper-with-description",
	"stepper-with-form",
	"stepper-with-icon",
	"stepper-with-label-orientation",
	"stepper-with-scroll-tracking",
	"stepper-with-variants",
];

const meta = {
	"stepper-demo": { title: "Stepper demo", description: "Simple stepper demo", registryDependencies: ["button"] },
	"stepper-with-description": { title: "Stepper with description", description: "A stepper with a description", registryDependencies: ["button"] },
	"stepper-with-form": { title: "Stepper with form", description: "A stepper with a form using zod for validation", registryDependencies: ["button", "input", "label", "field"], dependencies: ["zod", "@stepperize/react"] },
	"stepper-with-icon": { title: "Stepper with icon", description: "A stepper with an icon", registryDependencies: ["button"] },
	"stepper-with-label-orientation": { title: "Stepper with label orientation", description: "A stepper with a label orientation", registryDependencies: ["button", "label", "radio-group"] },
	"stepper-with-scroll-tracking": { title: "Stepper with scroll tracking", description: "A stepper with scroll tracking", registryDependencies: ["button", "label", "radio-group"] },
	"stepper-with-variants": { title: "Stepper with variants", description: "A stepper with variants", registryDependencies: ["button", "label", "radio-group"] },
};

fs.mkdirSync(outDir, { recursive: true });

for (const name of blocks) {
	const pagePath = path.join(registryRoot, name, "page.tsx");
	const componentName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
	const componentPath = path.join(registryRoot, name, "components", `${name}.tsx`);
	const pageContent = fs.readFileSync(pagePath, "utf8");
	const componentContent = fs.readFileSync(componentPath, "utf8");
	const m = meta[name];
	const item = {
		$schema: "https://ui.shadcn.com/schema/registry-item.json",
		name: `base-ui/${name}`,
		title: m.title + " (Base UI)",
		description: m.description,
		dependencies: m.dependencies ?? ["@stepperize/react"],
		registryDependencies: m.registryDependencies,
		files: [
			{
				path: `registry/base-ui/blocks/${name}/page.tsx`,
				content: pageContent,
				type: "registry:page",
				target: `app/${name}/page.tsx`,
			},
			{
				path: `registry/base-ui/blocks/${name}/components/${name}.tsx`,
				content: componentContent,
				type: "registry:component",
			},
		],
		type: "registry:component",
	};
	fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(item, null, 2));
	console.log(`Wrote base-ui/${name}.json`);
}
