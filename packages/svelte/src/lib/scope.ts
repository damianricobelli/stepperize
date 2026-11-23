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

type Bound = { scope?: Scope<any>; extra?: unknown };
let current: Bound | undefined;

/**
 * Components are plain modules, but each definition needs its own typed set.
 * A bound component is the same component, told which definition it belongs
 * to while it initialises.
 */
export function bind<Props extends Record<string, any>>(
	component: Component<any>,
	scope?: Scope<any>,
	extra?: unknown,
): Component<Props> {
	const implementation = component as unknown as (...args: unknown[]) => unknown;
	return ((...args: unknown[]) => {
		const previous = current;
		current = { scope, extra };
		try {
			return implementation(...args);
		} finally {
			current = previous;
		}
	}) as unknown as Component<Props>;
}

const bound = () => current ?? fail("SZ100", "Use the components that `defineStepper` returns.");

/** Call while the component initialises. */
export const useScope = <S extends readonly Step[] = readonly Step[]>() => bound().scope as Scope<S>;
export const useExtra = <T>() => bound().extra as T;
