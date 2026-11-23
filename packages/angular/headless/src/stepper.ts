import {
	assertInInjectionContext,
	computed,
	DestroyRef,
	effect,
	InjectionToken,
	Injector,
	inject,
	PLATFORM_ID,
	type Provider,
	runInInjectionContext,
	type Signal,
	signal,
	untracked,
	type WritableSignal,
} from "@angular/core";
import { createStepper, type Flow, fail, type Options, type Step, type Stepper } from "@stepperize/core";

/** A value, or a function that returns it and is read again when the signals it uses change. */
export type MaybeGetter<T> = T | (() => T);

/**
 * A flow as Angular sees it: a signal of the current stepper, a new immutable
 * view after every change. Read it in templates, `computed` and `effect`.
 *
 * @example
 * stepper = checkout.injectStepper();
 * // template: {{ stepper().current.title }}
 */
export type StepperRef<S extends readonly Step[]> = Signal<Stepper<S>> & {
	/**
	 * The flow itself: the same object tests, servers and services can drive.
	 * It is created the first time the stepper or this property is read.
	 */
	readonly flow: Flow<S>;
	readonly steps: S;
};

/** What the headless `defineStepper` returns: one typed flow, usable with or without Angular. */
export type Definition<S extends readonly Step[]> = {
	steps: S;
	/** A flow without Angular: tests, servers and agents drive the same state machine. */
	create: (options?: Options<S>) => Flow<S>;
	/**
	 * A flow owned by the component, directive or service that calls it. Call
	 * it in an injection context: a field initialiser or a constructor. Pass a
	 * function when an option depends on a signal, such as a route parameter.
	 * The flow is destroyed with its owner.
	 */
	injectStepper: (options?: MaybeGetter<Options<S> | undefined>) => StepperRef<S>;
	/**
	 * Providers that share one flow with a component and everything below it.
	 * Put it in `providers` and read it with `injectStepperContext()`.
	 */
	provideStepper: (options?: MaybeGetter<Options<S> | undefined>) => Provider;
	/** The flow of the nearest `provideStepper()` or `stepperRoot` of this definition. */
	injectStepperContext: () => StepperRef<S>;
};

/**
 * Private API shared with the primary entry point, not covered by semver: what
 * `provideStepper()` and `[stepperRoot]` put in the injector tree. `ref` is set
 * when the stepper is known up front; a root's stepper is an input, read through
 * `source` when the stepper is first read.
 */
export type ɵStepperContext = {
	readonly ref?: unknown;
	readonly source: () => unknown;
	readonly parent: ɵStepperContext | null;
};
/** Private API, see `ɵStepperContext`. */
export const ɵSTEPPER_CONTEXT = new InjectionToken<ɵStepperContext>("stepperize");

/** Which definition a stepper belongs to, so a context lookup can skip the flows of others. */
const OWNER = Symbol("stepperize.owner");
type Owned = { [OWNER]?: object };

// `ngDevMode` is a global Angular defines; production builds replace it with `false`.
declare const ngDevMode: unknown;

export function defineStepper<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}): Definition<S> {
	const owner = {};

	function stamp(ref: Signal<Stepper<S>>, flow: () => Flow<S>): StepperRef<S> {
		return Object.defineProperties(ref, {
			flow: { get: flow },
			steps: { value: steps },
			[OWNER]: { value: owner },
		}) as StepperRef<S>;
	}

	function connect(options?: MaybeGetter<Options<S> | undefined>): StepperRef<S> {
		// An options function runs where `inject()` works, as the code around the call suggests it does.
		const injector = inject(Injector);
		const browser = inject(PLATFORM_ID) === "browser";
		const read = (): Options<S> => ({
			...defaults,
			...(typeof options === "function" ? runInInjectionContext(injector, options) : options),
		});
		const latest = computed(read);
		/**
		 * The options the flow is given. Callbacks are getters that read the latest options when
		 * the flow calls them, so a callback changed and used in the same tick is never stale.
		 * `linear` and `step` are values: the flow reacts to their change in `setOptions`.
		 */
		const live = (linear: boolean | undefined, step: Options<S>["step"], snapshot?: Options<S>["snapshot"]) =>
			({
				linear,
				step,
				snapshot,
				get next() {
					return untracked(latest).next;
				},
				get guard() {
					return untracked(latest).guard;
				},
				get onChange() {
					return untracked(latest).onChange;
				},
				get onFinish() {
					return untracked(latest).onFinish;
				},
				get onInvalidStep() {
					return untracked(latest).onInvalidStep;
				},
			}) satisfies Options<S>;

		let state:
			| { flow: Flow<S>; view: WritableSignal<Stepper<S>>; linear: boolean; step: Options<S>["step"] }
			| undefined;
		/** Bumped when the flow is created outside the stepper signal, which may hold an earlier failure. */
		const created = signal(0);
		let reading = false;
		function ensure() {
			if (state) return state;
			// Read where the caller reads: inside the stepper signal, a failure (an input read before it is set)
			// is tried again when the signals it read change. Only the creation itself is untracked.
			const initial = read();
			state = untracked(() => {
				const flow = createStepper(steps, live(initial.linear, initial.step, initial.snapshot));
				const view = signal(flow.get());
				flow.subscribe(() => view.set(flow.get()));
				return { flow, view, linear: !!initial.linear, step: flow.current.id };
			});
			if (!reading) untracked(() => created.update((count) => count + 1));
			return state;
		}
		function apply(linear: boolean, step: Options<S>["step"]) {
			const current = ensure();
			if (linear === current.linear && step === current.step) return;
			current.linear = linear;
			current.step = step;
			current.flow.setOptions(live(linear, step));
		}

		// Before every render, on the server too: the flow exists before the first one, and `linear`
		// changes are applied. Following `step` moves the flow and calls back into the owner, so the
		// server leaves it alone: it renders the step the flow was created on.
		effect(() => {
			const next = latest();
			const linear = !!next.linear;
			const step = browser ? next.step : untracked(() => ensure().step);
			untracked(() => apply(linear, step));
		});
		inject(DestroyRef).onDestroy(() => state?.flow.destroy());

		const ref = computed(() => {
			created();
			reading = true;
			try {
				const current = ensure();
				// Read the stepper right after changing `linear` and it already applies: `canGoTo` and
				// `isLinear` are part of the view. Changing it publishes a view, never calls back.
				const linear = !!latest().linear;
				if (linear !== current.linear) untracked(() => apply(linear, current.step));
				return current.view();
			} finally {
				reading = false;
			}
		});
		return stamp(ref, () => ensure().flow);
	}

	function injectStepper(options?: MaybeGetter<Options<S> | undefined>): StepperRef<S> {
		if (typeof ngDevMode === "undefined" || ngDevMode) assertInInjectionContext(injectStepper);
		return connect(options);
	}

	function injectStepperContext(): StepperRef<S> {
		const missing = () =>
			fail(
				"SZ100",
				"Missing provider. Add this flow's provideStepper() to the providers of a component above, or render inside a root primitive bound to one of its steppers.",
			);
		let context = inject(ɵSTEPPER_CONTEXT, { optional: true });
		// Providers are known now: the nearest of this definition is returned as it is.
		while (context?.ref) {
			if ((context.ref as Owned)[OWNER] === owner) return context.ref as StepperRef<S>;
			context = context.parent;
		}
		if (!context) return missing();
		// A root's stepper is an input, set after this runs: look it up when the stepper is read, and again
		// whenever a root is bound to another stepper.
		const from = context;
		const source = computed(() => {
			for (let at: ɵStepperContext | null = from; at; at = at.parent) {
				const ref = (at.ref ?? at.source()) as StepperRef<S> & Owned;
				if (ref[OWNER] === owner) return ref;
			}
			return missing();
		});
		return stamp(
			computed(() => source()()),
			() => untracked(source).flow,
		);
	}

	return {
		steps,
		create: (options) => createStepper(steps, { ...defaults, ...options }),
		injectStepper,
		provideStepper: (options) => ({
			provide: ɵSTEPPER_CONTEXT,
			useFactory: (): ɵStepperContext => {
				const ref = connect(options);
				return { ref, source: () => ref, parent: inject(ɵSTEPPER_CONTEXT, { skipSelf: true, optional: true }) };
			},
		}),
		injectStepperContext,
	};
}
