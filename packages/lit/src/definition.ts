import { createStepper, type Flow, type Options, type Step } from "@stepperize/core";
import type { ReactiveControllerHost } from "lit";
import type { ControllerSource, StepperController } from "./controller";

/** What the headless `defineStepper` returns: one typed flow, usable with or without Lit. */
export type Definition<S extends readonly Step[], Controller = StepperController<S>> = {
	steps: S;
	/** A flow without Lit: tests, servers and agents drive the same state machine. */
	create: (options?: Options<S>) => Flow<S>;
	/**
	 * A controller for a host element. Pass options (or a function returning
	 * them, read again before every render) to give the host its own flow, or
	 * a flow (or a function returning it) to follow one that lives elsewhere.
	 */
	controller: (host: ReactiveControllerHost, source?: ControllerSource<S>) => Controller;
};

export function createDefinition<const S extends readonly Step[], Controller>(
	steps: S,
	defaults: Options<S>,
	make: (host: ReactiveControllerHost, source?: ControllerSource<S>) => Controller,
): Definition<S, Controller> {
	return {
		steps,
		create: (options) => createStepper(steps, { ...defaults, ...options }),
		controller: make,
	};
}
