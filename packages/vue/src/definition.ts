import { createStepper, type Flow, fail, type Options, type Step, type Stepper, warn } from "@stepperize/core";
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
	onActivated,
	onDeactivated,
	onMounted,
	onScopeDispose,
	type PropType,
	provide,
	type ShallowRef,
	shallowRef,
	toValue,
	watch,
} from "vue";
import type { ProviderSlots, StepperComponent } from "./types";

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
	 *
	 * It is not a watch source: `watch(stepper, ...)` never fires. Watch a
	 * getter of what you need, `watch(() => stepper.current.id, ...)`, or use
	 * `onChange` to see every change.
	 */
	useStepper: (options?: MaybeRefOrGetter<Options<S> | undefined>) => Readonly<Stepper<S>>;
	/**
	 * The flow of the nearest `Provider` or `Stepper.Root`. Pass a selector to
	 * get a `computed` that only changes when its result does.
	 */
	useStepperContext: {
		(): Readonly<Stepper<S>>;
		<T>(selector: (stepper: Readonly<Stepper<S>>) => T): ComputedRef<T>;
	};
	/** Share one flow with every component below. It renders no element: `$el` is a placeholder node. */
	Provider: StepperComponent<ProviderProps<S>, ProviderSlots, Text | Comment>;
};

/** One flow as Vue sees it. */
export type Shared<S extends readonly Step[]> = {
	flow: Flow<S>;
	/** The current immutable view. A new object after every change. */
	view: ShallowRef<Stepper<S>>;
	/** Reads fall through to the latest view and are tracked, so templates and computeds follow the flow. */
	stepper: Readonly<Stepper<S>>;
};

/** Every flow option as a prop. `@change`, `@finish` and `@invalid-step` reach the `on*` ones. */
export const optionProps = {
	linear: { type: Boolean, default: undefined },
	next: Object,
	guard: Function,
	// A wrapper that merges its own listener with the caller's hands over an array.
	onChange: [Function, Array],
	onFinish: [Function, Array],
	snapshot: Object,
	step: String as PropType<string | null>,
	onInvalidStep: [Function, Array],
} satisfies Record<(typeof OPTION_KEYS)[number], unknown>;

/** The options a component received as props. An absent prop does not override a default. */
export function pickOptions<S extends readonly Step[]>(props: Record<string, unknown>): Options<S> {
	const options: Record<string, unknown> = {};
	for (const key of OPTION_KEYS) {
		const value = props[key];
		if (value === undefined) continue;
		options[key] = Array.isArray(value)
			? (...args: unknown[]) => {
					let result: unknown;
					for (const listener of value as ((...args: unknown[]) => unknown)[]) result = listener(...args);
					return result;
				}
			: value;
	}
	return options as Options<S>;
}

const ACTIONS: ReadonlySet<PropertyKey> = new Set(["next", "prev", "goTo", "setData", "validate", "reset", "restore"]);
/** State that keeps its identity until it changes. The queries are new functions for every view. */
const STATE: ReadonlySet<PropertyKey> = new Set([
	"steps",
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
]);

export function createDefinition<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}) {
	const FlowKey: InjectionKey<Shared<S>> = Symbol("stepperize");
	/** Step id -> position, for the primitives that are handed an id. */
	const positions = new Map(steps.map((step, index) => [step.id as string, index]));
	const create = (options?: Options<S>) => createStepper(steps, { ...defaults, ...options });

	/** One flow per component instance. `snapshot` is read once; everything else stays current. */
	function useFlow(options?: MaybeRefOrGetter<Options<S> | undefined>): Shared<S> {
		const merged = () => ({ ...defaults, ...toValue(options) });
		// Cached until something it reads changes, so a getter that loads a snapshot is not run again.
		const current = computed(merged);
		const flow = createStepper(steps, current.value);
		const view = shallowRef(flow.get());
		// Subscribed from the start, so a change made by a child's `onMounted` is never missed.
		flow.subscribe(() => {
			view.value = flow.get();
		});
		// Options are applied once the component is mounted and after every later change, never
		// during server rendering: following `step` calls back into the owner.
		// The callbacks are read when the flow calls them, so one changed a moment ago is never stale.
		// `linear` and `step` are what the flow compares, so those are values.
		const lazy = (now: Options<S>): Options<S> => ({
			linear: now.linear,
			step: now.step,
			snapshot: now.snapshot,
			get next() {
				return current.value.next;
			},
			get guard() {
				return current.value.guard;
			},
			get onChange() {
				return current.value.onChange;
			},
			get onFinish() {
				return current.value.onFinish;
			},
			get onInvalidStep() {
				return current.value.onInvalidStep;
			},
		});
		const apply = (now: Options<S> = current.value) => flow.setOptions(lazy(now));
		const browser = typeof window !== "undefined";
		const instance = getCurrentInstance();
		// A kept-alive owner that is not on screen stops following `step`: the route it would follow
		// now belongs to another page, and its `onInvalidStep` would rewrite that page's URL.
		let paused = false;
		/** Options that changed since they were applied: the next flush or action applies them. */
		let pending: Options<S> | undefined;
		const flush = () => {
			if (!pending || paused) return;
			const now = pending;
			pending = undefined;
			apply(now);
		};
		if (instance) {
			onMounted(() => apply());
			onDeactivated(() => {
				paused = true;
			});
			onActivated(() => {
				if (!paused) return;
				paused = false;
				pending = undefined;
				apply();
			});
		} else if (browser) apply();
		if (browser) {
			// Noted at once, so an action called in the same tick as the change sees it.
			watch(
				current,
				(now) => {
					pending = now;
				},
				{ flush: "sync" },
			);
			// Before the owner renders, so a `step` that changed is followed in the same render.
			watch(current, flush);
		}
		if (getCurrentScope()) onScopeDispose(() => flow.destroy());
		else if (process.env.NODE_ENV !== "production") {
			warn(
				"SZ104",
				"useStepper() ran without a component instance or an effect scope (after an `await` in an async setup?), so its flow is never destroyed. Call it before the first `await`, or inside an effectScope() that you stop.",
			);
		}
		const read = () => view.value as Record<PropertyKey, unknown>;
		// One computed per piece of state, as `useRoute()` does: a reader of `current` is not
		// rendered again for a draft, because a computed only notifies when its value changed.
		const fields = new Map<PropertyKey, ComputedRef<unknown>>();
		const live = flow as unknown as Record<PropertyKey, (...args: unknown[]) => unknown>;
		// Actions keep their identity and read nothing, so calling one inside an effect tracks nothing.
		const actions = new Map<PropertyKey, (...args: unknown[]) => unknown>();
		const refuse = () => false;
		const stepper = new Proxy({} as Stepper<S>, {
			get: (_, key) => {
				// Never wrapped by `reactive()`, `ref()` or a store: it would hand deep proxies of the data back.
				if (key === "__v_skip") return true;
				if (ACTIONS.has(key)) {
					let action = actions.get(key);
					if (!action) {
						const run = live[key];
						action = (...args) => {
							flush();
							return run(...args);
						};
						actions.set(key, action);
					}
					return action;
				}
				if (!STATE.has(key)) return read()[key];
				let field = fields.get(key);
				if (!field) {
					field = computed(() => read()[key]);
					fields.set(key, field);
				}
				return field.value;
			},
			// It is a view: an assignment would define the property on the target and make every
			// later read throw.
			set: refuse,
			defineProperty: refuse,
			deleteProperty: refuse,
			has: (_, key) => key in read(),
			ownKeys: () => Reflect.ownKeys(read()),
			getOwnPropertyDescriptor: (_, key) => {
				// `markRaw()` sees the flag as its own and does not try to define it.
				if (key === "__v_skip") return { value: true, configurable: true };
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
		// The public type adds the generic step ids, the listeners and `v-slots`, which runtime props cannot express.
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
