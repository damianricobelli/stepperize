import { ControlledDemo } from "./controlled-demo";
import controlledSource from "./controlled-demo.tsx?raw";
import { ExampleFrame } from "./example-frame";
import { Signup } from "./first-stepper-demo";
import firstStepperSource from "./first-stepper-demo.tsx?raw";
import { IdsDemo } from "./ids-demo";
import idsSource from "./ids-demo.tsx?raw";
import { Checkout } from "./intro-demo";
import introSource from "./intro-demo.tsx?raw";
import { LifecycleViz } from "./lifecycle-viz";
import lifecycleSource from "./lifecycle-viz.tsx?raw";
import { OwnershipDemo } from "./ownership-demo";
import ownershipSource from "./ownership-demo.tsx?raw";
import { PolicyDemo } from "./policy-demo";
import policySource from "./policy-demo.tsx?raw";
import { PrimitivesDemo } from "./primitives-demo";
import primitivesSource from "./primitives-demo.tsx?raw";
import { ResetDemo } from "./reset-demo";
import resetSource from "./reset-demo.tsx?raw";
import { SelectorsDemo } from "./selectors-demo";
import selectorsSource from "./selectors-demo.tsx?raw";

const examples = {
	intro: {
		Component: Checkout,
		source: introSource,
		file: "intro-demo.tsx",
		title: "The snippet above, running",
		description: "Same definition, same match(), plus a little styling.",
	},
	"first-stepper": {
		Component: Signup,
		source: firstStepperSource,
		file: "first-stepper-demo.tsx",
		title: "Your first stepper",
		description:
			"The complete example. Inputs here are uncontrolled, so a value resets when you leave its step.",
	},
	ids: {
		Component: IdsDemo,
		source: idsSource,
		file: "ids-demo.tsx",
		title: "Ids become a type",
		description:
			"Edit the steps, then try an id. The check uses the real parseStep.",
	},
	primitives: {
		Component: PrimitivesDemo,
		source: primitivesSource,
		file: "primitives-demo.tsx",
		title: "Primitives and their attributes",
		description:
			"Every style here comes from data-status and data-complete. Toggle linear to see disabled triggers.",
	},
	lifecycle: {
		Component: LifecycleViz,
		source: lifecycleSource,
		file: "lifecycle-viz.tsx",
		title: "One transition, start to finish",
		description:
			"Stage data, run an async guard, then commit or discard it as one move.",
	},
	reset: {
		Component: ResetDemo,
		source: resetSource,
		file: "reset-demo.tsx",
		title: "What reset restores",
		description: "Compare the state before and after each reset option.",
	},
	controlled: {
		Component: ControlledDemo,
		source: controlledSource,
		file: "controlled-demo.tsx",
		title: "Controlled step",
		description:
			"Stepperize requests a move; the owner decides whether to apply it.",
	},
	selectors: {
		Component: SelectorsDemo,
		source: selectorsSource,
		file: "selectors-demo.tsx",
		title: "Focused subscriptions",
		description:
			"Each card selects one value and only lights up when that value changes.",
	},
	policy: {
		Component: PolicyDemo,
		source: policySource,
		file: "policy-demo.tsx",
		title: "Linear policy vs guard",
		description: "bypassPolicy skips the policy check, never the guard.",
	},
	ownership: {
		Component: OwnershipDemo,
		source: ownershipSource,
		file: "ownership-demo.tsx",
		title: "Who owns the flow",
		description:
			"Local hooks are independent; components under one Provider share a flow.",
	},
};

/** A live example in the docs frame; the Code tab shows the exact running file. */
export function InteractiveExample({ name }: { name: keyof typeof examples }) {
	const { Component, source, file, title, description } = examples[name];
	return (
		<ExampleFrame
			title={title}
			description={description}
			source={source}
			file={file}
		>
			<Component />
		</ExampleFrame>
	);
}
