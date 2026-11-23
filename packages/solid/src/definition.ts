import { createStepper, type Flow, fail, type Options, type Step, type Stepper } from "@stepperize/core";
import { OPTION_KEYS } from "@stepperize/core/primitives";
import {
	$PROXY,
	type Accessor,
	type Component,
	createComponent,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	getOwner,
	onCleanup,
	untrack,
	useContext,
} from "solid-js";
import type { MaybeAccessor, ProviderProps } from "./types";

/** What `defineStepper` returns: one typed flow, usable with or without Solid. */
export type Definition<S extends readonly Step[]> = {
	steps: S;
	/** A flow without Solid: tests, servers and agents drive the same state machine. */
	create: (options?: Options<S>) => Flow<S>;
	/**
	 * A flow owned by this component. The result is reactive, like props: read
	 * it in JSX, memos and effects, and do not destructure its state. Pass a
	 * function when an option depends on a signal.
	 */
	useStepper: (options?: MaybeAccessor<Options<S> | undefined>) => Stepper<S>;
	/**
	 * The flow of the nearest `Provider` or `Stepper.Root`. Pass a selector to
	 * get a memo that only changes when its result does.
	 */
	useStepperContext: {
		(): Stepper<S>;
		<T>(selector: (stepper: Stepper<S>) => T): Accessor<T>;
	};
	/** Share one flow with every component below. */
	Provider: Component<ProviderProps<S>>;
};

/** One flow as Solid sees it. */
export type Shared<S extends readonly Step[]> = {
	flow: Flow<S>;
	/** The current immutable view. A new object after every change. */
	view: Accessor<Stepper<S>>;
	/** Reads fall through to the latest view and are tracked. */
	stepper: Stepper<S>;
};

/** The options a component received as props. An absent prop does not override a default. */
export function pickOptions<S extends readonly Step[]>(props: Record<string, unknown>): Options<S> {
	const options: Record<string, unknown> = {};
	for (const key of OPTION_KEYS) if (props[key] !== undefined) options[key] = props[key];
	return options as Options<S>;
}

const ACTIONS: ReadonlySet<PropertyKey> = new Set(["next", "prev", "goTo", "setData", "validate", "reset", "restore"]);
const STATE_KEYS = [
	"current",
	"index",
	"isFirst",
	"isLinear",
	"isLast",
	"progress",
	"data",
	"output",
	"isPending",
	"isFinished",
] as const satisfies readonly (keyof Stepper<readonly Step[]>)[];

export function createDefinition<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}) {
	const FlowContext = createContext<Shared<S>>();
	/** Step id -> position, for the primitives that are handed an id. */
	const positions = new Map(steps.map((step, index) => [step.id as string, index]));
	const create = (options?: Options<S>) => createStepper(steps, { ...defaults, ...options });

	/** One flow per component instance. `snapshot` is read once; everything else stays current. */
	function useFlow(options?: MaybeAccessor<Options<S> | undefined>): Shared<S> {
		const merged = (): Options<S> => ({
			...defaults,
			...(typeof options === "function" ? options() : options),
		});
		const flow = createStepper(steps, untrack(merged));
		const [view, setView] = createSignal(flow.get());
		// Subscribed from the start, so a change made while children mount is never missed.
		flow.subscribe(() => setView(() => flow.get()));
		// Effects do not run on the server: options are applied once mounted and after every
		// later change, like every other binding. Following `step` calls back into the owner.
		createEffect(() => {
			const next = merged();
			untrack(() => flow.setOptions(next));
		});
		if (getOwner()) onCleanup(() => flow.destroy());
		const read = () => view() as Record<PropertyKey, unknown>;
		// One memo per piece of state: a reader of `current` is not told about a draft, because a
		// memo only notifies when its own value changed. The view as a whole is one signal.
		const fields: Record<PropertyKey, Accessor<unknown>> = { steps: () => steps };
		for (const key of STATE_KEYS) fields[key] = createMemo(() => view()[key]);
		const live = flow as unknown as Record<PropertyKey, unknown>;
		// The step decides which handler runs. Its data is handed over, not followed: a handler that
		// renders a form would otherwise be rendered again, and lose focus, on every draft.
		const match: Stepper<S>["match"] = (handlers) => {
			const step = fields.current() as S[number];
			const id = step.id as keyof typeof handlers;
			return handlers[id](
				step as never,
				untrack(() => flow.data[id]),
			);
		};
		const stepper = new Proxy({} as Stepper<S>, {
			get: (_, key) => {
				// Actions never change and read nothing: calling one in an effect must not make
				// that effect depend on the flow it is writing to.
				if (ACTIONS.has(key)) return live[key];
				if (key === "match") return match;
				// The other queries (`state`, `issues`, `canGoTo`, `snapshot`) close over a whole view.
				return (fields[key] ?? (() => read()[key]))();
			},
			// `$PROXY` is how `mergeProps`, `splitProps` and a spread know to stay reactive.
			has: (_, key) => key === $PROXY || key in read(),
			ownKeys: () => Reflect.ownKeys(read()),
			getOwnPropertyDescriptor: (_, key) => {
				const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
				return descriptor && { ...descriptor, configurable: true };
			},
		});
		return { flow, view, stepper };
	}

	function useShared(): Shared<S> {
		return (
			useContext(FlowContext) ??
			fail("SZ100", "Missing Provider. Wrap the tree in this flow's Provider or Stepper.Root.")
		);
	}

	const definition: Definition<S> = {
		steps,
		create,
		useStepper: (options) => useFlow(options).stepper,
		useStepperContext: <T>(selector?: (stepper: Stepper<S>) => T) => {
			const shared = useShared();
			// Views are immutable: a selector sees one of them, and the memo drops results that did not change.
			return (selector ? createMemo(() => selector(shared.view())) : shared.stepper) as never;
		},
		Provider: (props) =>
			createComponent(FlowContext.Provider, {
				value: useFlow(() => pickOptions<S>(props)),
				get children() {
					return props.children;
				},
			}),
	};
	return { definition, scope: { steps, positions, defaults, FlowContext, useFlow, useShared } };
}

export type Scope<S extends readonly Step[]> = ReturnType<typeof createDefinition<S>>["scope"];
