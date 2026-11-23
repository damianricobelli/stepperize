import { fail, type Options, type Step } from "@stepperize/core";
import type { Component } from "svelte";

/** What a definition's components need to know about it. */
export type Scope<S extends readonly Step[] = readonly Step[]> = {
	steps: S;
	/** Step id -> position, for the primitives that are handed an id. */
	positions: Map<string, number>;
	defaults: Options<S>;
	/** Context key of this definition's flow. */
	key: symbol;
};

type Bound = { scope?: Scope; extra?: unknown };
let current: Bound | undefined;

/**
 * Components are plain modules, but each definition needs its own typed set.
 * A bound component is the same component, told which definition it belongs
 * to while it initialises.
 *
 * Why a module variable and not context: the context of a component only
 * exists once its own code runs, and the definition is what that code needs
 * first. The variable is set for exactly one synchronous call, restored in
 * `finally` (a bound component rendered by another one gets its own and puts
 * the outer one back), and read by `useScope()` at the top of the component's
 * script, before it renders anything or awaits. Nothing reads it later.
 *
 * The type is the component's own: what its `$props()` declares. The public
 * types in `primitives/index.ts` are checked against it.
 */
export function bind<
	Props extends Record<string, any>,
	Exports extends Record<string, any>,
	Bindings extends keyof Props | "",
>(
	component: Component<Props, Exports, Bindings>,
	scope?: Scope<any>,
	extra?: unknown,
): Component<Props, Exports, Bindings> {
	return (internals, props) => {
		const previous = current;
		current = { scope, extra };
		try {
			return component(internals, props);
		} finally {
			current = previous;
		}
	};
}

const bound = () => current ?? fail("SZ100", "Use the components that `defineStepper` returns.");

/** Call while the component initialises. */
export const useScope = <S extends readonly Step[] = readonly Step[]>() => bound().scope as Scope<S>;
export const useExtra = <T>() => bound().extra as T;
