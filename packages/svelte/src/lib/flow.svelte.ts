import { createStepper, type Flow, fail, type Options, type Step, type Stepper } from "@stepperize/core";
import { getContext, setContext, untrack } from "svelte";
import { createSubscriber } from "svelte/reactivity";
import type { Scope } from "./scope";
import type { MaybeGetter } from "./types";

/** One flow as Svelte sees it. */
export type Shared<S extends readonly Step[] = readonly Step[]> = {
	flow: Flow<S>;
	/** The current immutable view. Reading it in an effect or a `$derived` follows the flow. */
	view: () => Stepper<S>;
	/** Reads fall through to the latest view and are tracked. */
	stepper: Stepper<S>;
};

/** One flow per component instance. `snapshot` is read once; everything else stays current. */
export function useFlow<S extends readonly Step[]>(
	scope: Scope<S>,
	options?: MaybeGetter<Options<S> | undefined>,
): Shared<S> {
	const merged = (): Options<S> => ({
		...scope.defaults,
		...(typeof options === "function" ? options() : options),
	});
	const flow = createStepper(scope.steps, untrack(merged));
	const subscribe = createSubscriber((update) => flow.subscribe(update));
	const view = () => {
		subscribe();
		return flow.get();
	};
	// Effects do not run on the server: options are applied once mounted and after every
	// later change, like every other binding. Following `step` calls back into the owner.
	$effect(() => {
		const next = merged();
		untrack(() => flow.setOptions(next));
	});
	$effect(() => () => flow.destroy());
	const read = () => view() as Record<PropertyKey, unknown>;
	const stepper = new Proxy({} as Stepper<S>, {
		get: (_, key) => read()[key],
		has: (_, key) => key in read(),
		ownKeys: () => Reflect.ownKeys(read()),
		getOwnPropertyDescriptor: (_, key) => {
			const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
			return descriptor && { ...descriptor, configurable: true };
		},
	});
	return { flow, view, stepper };
}

export const share = <S extends readonly Step[]>(scope: Scope<S>, shared: Shared<S>) => setContext(scope.key, shared);

export function useShared<S extends readonly Step[]>(scope: Scope<S>): Shared<S> {
	return (
		(getContext(scope.key) as Shared<S> | undefined) ??
		fail("SZ100", "Missing Provider. Wrap the tree in this flow's Provider or Stepper.Root.")
	);
}

/** The options a component received as props. An absent prop does not override a default. */
export function defined<T extends Record<string, unknown>>(options: T): T {
	const result: Record<string, unknown> = {};
	for (const key in options) if (options[key] !== undefined) result[key] = options[key];
	return result as T;
}
