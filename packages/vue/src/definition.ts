import { createStepper, type Flow, fail, type Options, type Step, type Stepper } from "@stepperize/core";
import { OPTION_KEYS } from "@stepperize/core/primitives";
import {
	type ComputedRef,
	computed,
	defineComponent,
	getCurrentInstance,
	getCurrentScope,
	type InjectionKey,
	inject,
	type MaybeRefOrGetter,
	onMounted,
	onScopeDispose,
	type PropType,
	provide,
	type ShallowRef,
	shallowRef,
	toValue,
	watch,
} from "vue";
import type { Component } from "./types";

export type ProviderProps<S extends readonly Step[]> = Options<S>;

/** What `defineStepper` returns: one typed flow, usable with or without Vue. */
export type Definition<S extends readonly Step[]> = {
	steps: S;
	/** A flow without Vue: tests, servers and agents drive the same state machine. */
	create: (options?: Options<S>) => Flow<S>;
	/**
	 * A flow owned by this component. The result is reactive: read it in the
	 * template or in a `computed`, and do not destructure its state. Pass a
	 * getter or a ref when an option depends on reactive state.
	 */
	useStepper: (options?: MaybeRefOrGetter<Options<S> | undefined>) => Stepper<S>;
	/**
	 * The flow of the nearest `Provider` or `Stepper.Root`. Pass a selector to
	 * get a `computed` that only changes when its result does.
	 */
	useStepperContext: {
		(): Stepper<S>;
		<T>(selector: (stepper: Stepper<S>) => T): ComputedRef<T>;
	};
	/** Share one flow with every component below. */
	Provider: Component<ProviderProps<S>>;
};

/** One flow as Vue sees it. */
export type Shared<S extends readonly Step[]> = {
	flow: Flow<S>;
	/** The current immutable view. A new object after every change. */
	view: ShallowRef<Stepper<S>>;
	/** Reads fall through to the latest view and are tracked, so templates and computeds follow the flow. */
	stepper: Stepper<S>;
};

/** Every flow option as a prop. `@change`, `@finish` and `@invalid-step` reach the `on*` ones. */
export const optionProps = {
	linear: { type: Boolean, default: undefined },
	next: Object,
	guard: Function,
	onChange: Function,
	onFinish: Function,
	snapshot: Object,
	step: String as PropType<string | null>,
	onInvalidStep: Function,
} satisfies Record<(typeof OPTION_KEYS)[number], unknown>;

/** The options a component received as props. An absent prop does not override a default. */
export function pickOptions<S extends readonly Step[]>(props: Record<string, unknown>): Options<S> {
	const options: Record<string, unknown> = {};
	for (const key of OPTION_KEYS) if (props[key] !== undefined) options[key] = props[key];
	return options as Options<S>;
}

export function createDefinition<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}) {
	const FlowKey: InjectionKey<Shared<S>> = Symbol("stepperize");
	/** Step id -> position, for the primitives that are handed an id. */
	const positions = new Map(steps.map((step, index) => [step.id as string, index]));
	const create = (options?: Options<S>) => createStepper(steps, { ...defaults, ...options });

	/** One flow per component instance. `snapshot` is read once; everything else stays current. */
	function useFlow(options?: MaybeRefOrGetter<Options<S> | undefined>): Shared<S> {
		const merged = () => ({ ...defaults, ...toValue(options) });
		const flow = createStepper(steps, merged());
		const view = shallowRef(flow.get());
		// Subscribed from the start, so a change made by a child's `onMounted` is never missed.
		flow.subscribe(() => {
			view.value = flow.get();
		});
		// Options are applied once the component is mounted and after every later change, never
		// during server rendering: following `step` calls back into the owner.
		const apply = () => flow.setOptions(merged());
		if (getCurrentInstance()) onMounted(apply);
		else if (typeof window !== "undefined") apply();
		watch(merged, apply, { flush: "post" });
		if (getCurrentScope()) onScopeDispose(() => flow.destroy());
		const read = () => view.value as Record<PropertyKey, unknown>;
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

	function useShared(): Shared<S> {
		return (
			inject(FlowKey, null) ?? fail("SZ100", "Missing Provider. Wrap the tree in this flow's Provider or Stepper.Root.")
		);
	}

	const definition: Definition<S> = {
		steps,
		create,
		useStepper: (options) => useFlow(options).stepper,
		useStepperContext: <T>(selector?: (stepper: Stepper<S>) => T) => {
			const shared = useShared();
			// Views are immutable: a selector sees one of them, and `computed` drops results that did not change.
			return (selector ? computed(() => selector(shared.view.value)) : shared.stepper) as never;
		},
		Provider: defineComponent({
			name: "StepperProvider",
			inheritAttrs: false,
			props: optionProps,
			setup(props, { slots }) {
				provide(
					FlowKey,
					useFlow(() => pickOptions<S>(props)),
				);
				return () => slots.default?.();
			},
		}) as never,
	};
	return { definition, scope: { steps, positions, defaults, FlowKey, useFlow, useShared } };
}

export type Scope<S extends readonly Step[]> = ReturnType<typeof createDefinition<S>>["scope"];
