import { createStepper, type Flow, fail, type Options, type Step, type Stepper } from "@stepperize/core";
import React from "react";

/** Layout effects warn on the server; a passive effect is equivalent there. */
export const useCommitEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export type ProviderProps<S extends readonly Step[]> = Options<S> & { children?: React.ReactNode };

/** What `defineStepper` returns: one typed flow, usable with or without React. */
export type Definition<S extends readonly Step[]> = {
	steps: S;
	/** A flow without React: tests, servers and agents drive the same state machine. */
	create: (options?: Options<S>) => Flow<S>;
	/** A flow owned by this component. Re-renders on every change. */
	useStepper: (options?: Options<S>) => Stepper<S>;
	/**
	 * The flow of the nearest `Provider` or `Stepper.Root`. Pass a selector to
	 * re-render only when its result changes. A selector that builds a new object
	 * or array re-renders on every change; select primitives to skip renders.
	 */
	useStepperContext: {
		(): Stepper<S>;
		<T>(selector: (stepper: Stepper<S>) => T): T;
	};
	/** Share one flow with every component below. */
	Provider: (props: ProviderProps<S>) => React.ReactElement;
};

export function createDefinition<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}) {
	const FlowContext = React.createContext<Flow<S> | null>(null);
	/** Step id -> position, for the primitives that are handed an id. */
	const positions = new Map(steps.map((step, index) => [step.id as string, index]));
	const create = (options?: Options<S>) => createStepper(steps, { ...defaults, ...options });

	/** One flow per component instance. `snapshot` is read once; everything else stays current. */
	function useFlow(options: Options<S> = {}) {
		const [flow] = React.useState(() => create(options));
		useCommitEffect(() => flow.setOptions({ ...defaults, ...options }));
		React.useEffect(() => () => flow.destroy(), [flow]);
		return flow;
	}

	function useShared() {
		return (
			React.useContext(FlowContext) ??
			fail("SZ100", "Missing Provider. Wrap the tree in this flow's Provider or Stepper.Root.")
		);
	}

	function useSelect<T>(flow: Flow<S>, selector: (stepper: Stepper<S>) => T): T {
		const get = React.useMemo(() => {
			// `flow` is a proxy: read its method once, not once per notification.
			const read = flow.get;
			// The whole view needs no selecting: the store already returns the same one until it changes.
			if (selector === identity) return read as () => T;
			// Views are immutable, so one result per view is enough. This also keeps selectors
			// that build an object or array from looping: the same view returns the same result.
			let seen: Stepper<S> | undefined;
			let result: T;
			return () => {
				const view = read();
				if (view !== seen) {
					seen = view;
					result = selector(view);
				}
				return result;
			};
		}, [flow, selector]);
		return React.useSyncExternalStore(flow.subscribe, get, get);
	}

	const identity = (stepper: Stepper<S>) => stepper;
	const definition: Definition<S> = {
		steps,
		create,
		useStepper: (options) => {
			// This component owns the flow and is its only reader, so there is nothing to tear:
			// plain state is cheaper than `useSyncExternalStore` and lets updates join a transition.
			const flow = useFlow(options);
			const [view, setView] = React.useState(flow.get);
			useCommitEffect(() => {
				// Catch what changed between the first render and this subscription.
				if (flow.get() !== view) setView(flow.get);
				return flow.subscribe(() => setView(flow.get));
			}, [flow]);
			return view;
		},
		useStepperContext: <T>(selector: (stepper: Stepper<S>) => T = identity as never) =>
			useSelect(useShared(), selector),
		Provider: ({ children, ...options }) =>
			React.createElement(FlowContext.Provider, { value: useFlow(options) }, children),
	};
	return { definition, scope: { steps, positions, defaults, FlowContext, useFlow, useShared, useSelect } };
}

export type Scope<S extends readonly Step[]> = ReturnType<typeof createDefinition<S>>["scope"];
