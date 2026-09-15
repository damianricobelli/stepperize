import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { ControlledDemo } from "./controlled-demo";
import controlledSource from "./controlled-demo.tsx?raw";
import { LifecycleViz } from "./lifecycle-viz";
import lifecycleSource from "./lifecycle-viz.tsx?raw";
import { OwnershipDemo } from "./ownership-demo";
import ownershipSource from "./ownership-demo.tsx?raw";
import { PolicyDemo } from "./policy-demo";
import policySource from "./policy-demo.tsx?raw";
import { ResetDemo } from "./reset-demo";
import resetSource from "./reset-demo.tsx?raw";
import { SelectorsDemo } from "./selectors-demo";
import selectorsSource from "./selectors-demo.tsx?raw";

const examples = {
	lifecycle: {
		Component: LifecycleViz,
		source: lifecycleSource,
		file: "lifecycle-viz.tsx",
	},
	reset: { Component: ResetDemo, source: resetSource, file: "reset-demo.tsx" },
	controlled: {
		Component: ControlledDemo,
		source: controlledSource,
		file: "controlled-demo.tsx",
	},
	selectors: {
		Component: SelectorsDemo,
		source: selectorsSource,
		file: "selectors-demo.tsx",
	},
	policy: {
		Component: PolicyDemo,
		source: policySource,
		file: "policy-demo.tsx",
	},
	ownership: {
		Component: OwnershipDemo,
		source: ownershipSource,
		file: "ownership-demo.tsx",
	},
};

/** The copyable source is the exact file running in the preview. */
export function InteractiveExample({ name }: { name: keyof typeof examples }) {
	const { Component, source, file } = examples[name];
	return (
		<div className="my-6 min-w-0">
			<Component />
			<details className="not-prose rounded-xl border p-4">
				<summary className="cursor-pointer text-sm font-medium">
					View complete source
				</summary>
				<p className="mt-3 text-sm text-muted-foreground">
					Requires React and @stepperize/react v8. Tailwind CSS supplies the
					optional styling. This is the same source used by the live demo.
				</p>
				<CodeBlock
					title={file}
					viewportProps={{ className: "max-h-[32rem] overflow-auto" }}
				>
					<Pre>
						<code>{source}</code>
					</Pre>
				</CodeBlock>
			</details>
		</div>
	);
}
