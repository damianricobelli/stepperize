import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition";

export type * from "@stepperize/core";
export type { Definition } from "./definition";
export type { MaybeAccessor, ProviderProps } from "./types";

/** The flow and its primitives-free API: for your own markup. */
export function defineStepper<const S extends readonly Step[]>(steps: S, options?: Options<S>): Definition<S> {
	return createDefinition(steps, options).definition;
}
