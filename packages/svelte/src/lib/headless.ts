import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition";

export type * from "@stepperize/core";
export type { Definition } from "./definition";
export type { MaybeGetter, ProviderProps } from "./types";

/** The flow and its functions, without the UI primitives: for your own markup. */
export function defineStepper<const S extends readonly Step[]>(steps: S, options?: Options<S>): Definition<S> {
	return createDefinition(steps, options).definition;
}
