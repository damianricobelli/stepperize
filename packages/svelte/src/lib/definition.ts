import { createStepper, type Flow, type Options, type Step, type Stepper } from "@stepperize/core";
import type { Component } from "svelte";
import { useFlow, useShared } from "./flow.svelte.js";
import Provider from "./Provider.svelte";
import { bind, type Scope } from "./scope.js";
import type { MaybeGetter, ProviderProps } from "./types.js";

/** What `defineStepper` returns: one typed flow, usable with or without Svelte. */
export type Definition<S extends readonly Step[]> = {
	steps: S;
	/** A flow without Svelte: tests, servers and agents drive the same state machine. */
	create: (options?: Options<S>) => Flow<S>;
	/**
	 * A flow owned by this component. Call it while the component initialises.
	 * The result is reactive: read it in markup, `$derived` or `$effect`, and do
	 * not destructure its state. Pass a function when an option depends on state.
	 */
	useStepper: (options?: MaybeGetter<Options<S> | undefined>) => Stepper<S>;
	/** The flow of the nearest `Provider` or `Stepper.Root`, as the same reactive object. */
	useStepperContext: () => Stepper<S>;
	/** Share one flow with every component below. */
	Provider: Component<ProviderProps<S>>;
};

export function createDefinition<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}) {
	const scope: Scope<S> = {
		steps,
		positions: new Map(steps.map((step, index) => [step.id as string, index])),
		defaults,
		key: Symbol("stepperize"),
	};
	const definition: Definition<S> = {
		steps,
		create: (options) => createStepper(steps, { ...defaults, ...options }),
		useStepper: (options) => useFlow(scope, options).stepper,
		useStepperContext: () => useShared(scope).stepper,
		Provider: bind(Provider, scope),
	};
	return { definition, scope };
}
