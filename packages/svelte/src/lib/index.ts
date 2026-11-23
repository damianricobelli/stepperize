import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition.js";
import { createPrimitives, type Primitives } from "./primitives/index.js";

// Named one by one: a bundled `export type *` is published as `export *`, which
// would declare `createStepper` and others that this entry does not have.
export type {
	Code,
	Flow,
	FlowData,
	FlowOutput,
	GuardContext,
	Id,
	Input,
	Issue,
	Options,
	Output,
	Reason,
	Result,
	Snapshot,
	StandardSchemaV1,
	Step,
	StepOf,
	Stepper,
	StepState,
} from "@stepperize/core";
export type { Definition } from "./definition.js";
export { fromFlow } from "./flow.svelte.js";
export type { Primitives } from "./primitives/index.js";
export type * from "./types.js";

/** Define a typed flow: a reactive stepper, a Provider and accessible, unstyled UI primitives. */
export function defineStepper<const S extends readonly Step[]>(
	steps: S,
	options?: Options<S>,
): Definition<S> & { Stepper: Primitives<S> } {
	const { definition, scope } = createDefinition(steps, options);
	return { ...definition, Stepper: createPrimitives(scope) };
}
