import { createStepper, type Flow, fail, type Options, type Step, type Stepper } from "@stepperize/core";
import { getContext, setContext, untrack } from "svelte";
import { createSubscriber } from "svelte/reactivity";
import type { Scope } from "./scope.js";
import type { MaybeGetter } from "./types.js";

/** One flow as Svelte sees it. */
export type Shared<S extends readonly Step[] = readonly Step[]> = {
	flow: Flow<S>;
	/** The current immutable view. Reading it in an effect or a `$derived` follows the flow. */
	view: () => Stepper<S>;
	/** Reads fall through to the latest view and are tracked. */
	stepper: Stepper<S>;
};

const ACTION_KEYS = ["next", "prev", "goTo", "setData", "validate", "reset", "restore"] as const;
type Action = (typeof ACTION_KEYS)[number];
const ACTIONS: ReadonlySet<PropertyKey> = new Set(ACTION_KEYS);
type Query = "state" | "issues" | "canGoTo" | "match" | "snapshot";
type StateKey = Exclude<keyof Stepper<readonly Step[]>, Action | Query>;

/**
 * The reactive face of a flow. It creates no effect, so it works wherever
 * `$derived` does: a component, a class, or a `.svelte.ts` module. The flow is
 * only subscribed to while an effect reads it (`createSubscriber`), and the
 * subscription ends with the last such effect.
 */
function reactive<S extends readonly Step[]>(flow: Flow<S>): Omit<Shared<S>, "flow"> {
	const subscribe = createSubscriber((update) => flow.subscribe(update));
	const view = () => {
		subscribe();
		return flow.get();
	};
	const read = () => view() as Record<PropertyKey, unknown>;
	// One derived per piece of state: a reader of `current` is not told about a draft, because
	// a derived only notifies when its own value changed. The view as a whole is one signal.
	const current = $derived(view().current);
	const index = $derived(view().index);
	const isFirst = $derived(view().isFirst);
	const isLinear = $derived(view().isLinear);
	const isLast = $derived(view().isLast);
	const progress = $derived(view().progress);
	const data = $derived(view().data);
	const output = $derived(view().output);
	const isPending = $derived(view().isPending);
	const isFinished = $derived(view().isFinished);
	const steps = untrack(() => flow.steps);
	const state: { [K in StateKey]: () => Stepper<S>[K] } = {
		steps: () => steps,
		current: () => current,
		index: () => index,
		isFirst: () => isFirst,
		isLinear: () => isLinear,
		isLast: () => isLast,
		progress: () => progress,
		data: () => data,
		output: () => output,
		isPending: () => isPending,
		isFinished: () => isFinished,
	};
	const live = flow as unknown as Record<PropertyKey, unknown>;
	const stepper = new Proxy({} as Stepper<S>, {
		get: (_, key) => {
			// Actions never change and read nothing: calling one in an effect must not make
			// that effect depend on the flow it is writing to.
			if (ACTIONS.has(key)) return live[key];
			// Outside an effect (an event handler, a plain function) nothing would be told about
			// a change: read the latest view directly, without creating a subscription.
			if (!$effect.tracking()) return untrack(read)[key];
			const field = state[key as StateKey];
			// The queries (`state`, `issues`, `canGoTo`, `match`, `snapshot`) close over a whole view.
			return field ? field() : read()[key];
		},
		has: (_, key) => key in read(),
		ownKeys: () => Reflect.ownKeys(read()),
		getOwnPropertyDescriptor: (_, key) => {
			const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
			return descriptor && { ...descriptor, configurable: true };
		},
	});
	return { view, stepper };
}

/**
 * Follow a flow you created yourself, such as `definition.create()` in a
 * `.svelte.ts` module: the result is the same reactive stepper as
 * `useStepper()`, for markup, `$derived` and `$effect` anywhere. It creates no
 * effect, so it needs no component. The flow stays yours: its options are the
 * ones you gave `create()`, and `flow.destroy()` is yours to call.
 *
 * @example
 * // checkout.svelte.ts
 * export const flow = checkout.create({ linear: true });
 * export const stepper = fromFlow(flow);
 */
export function fromFlow<S extends readonly Step[]>(flow: Flow<S>): Stepper<S> {
	return reactive(flow).stepper;
}

/** `$effect` throws Svelte's `effect_orphan` (dev and production builds alike) when no component or root owns it. */
const isOrphan = (error: unknown) => error instanceof Error && error.message.includes("effect_orphan");

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
	// Effects do not run on the server: options are applied once mounted and after every
	// later change, like every other binding. Following `step` calls back into the owner,
	// so the first time waits for the mount. Later changes are applied before the effects
	// of the components below run, or a child's effect would still see the old callbacks.
	let mounted = false;
	try {
		$effect.pre(() => {
			const next = merged();
			if (mounted) untrack(() => flow.setOptions(next));
		});
	} catch (error) {
		if (!isOrphan(error)) throw error;
		// Nothing owns the flow, so nothing would destroy it. Say what to do instead.
		fail(
			"SZ100",
			"useStepper() owns its flow, so it must be called while a component initialises (or inside `$effect.root`). In a `.svelte.ts` module or outside a component, use `fromFlow(definition.create())`.",
		);
	}
	$effect(() => {
		mounted = true;
		untrack(() => flow.setOptions(merged()));
		return () => flow.destroy();
	});
	return { flow, ...reactive(flow) };
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
