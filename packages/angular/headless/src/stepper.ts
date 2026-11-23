import {
	afterRenderEffect,
	assertInInjectionContext,
	computed,
	DestroyRef,
	InjectionToken,
	Injector,
	inject,
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
	/** Whether the flow is linear right now. The primitives render a list of steps instead of tabs. */
	readonly linear: Signal<boolean>;
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
	/** The flow provided by the nearest `provideStepper()` of this definition. */
	injectStepperContext: () => StepperRef<S>;
};

export function defineStepper<const S extends readonly Step[]>(steps: S, defaults: Options<S> = {}): Definition<S> {
	const token = new InjectionToken<StepperRef<S>>("stepperize");

	function connect(options?: MaybeGetter<Options<S> | undefined>): StepperRef<S> {
		// The options function is read again later (the first render, every change of a signal it
		// reads): run it where `inject()` works, as the code around the call suggests it does.
		const injector = inject(Injector);
		const merged = (): Options<S> => ({
			...defaults,
			...(typeof options === "function" ? runInInjectionContext(injector, options) : options),
		});
		// Created the first time the stepper is read, which is when the template first renders:
		// by then inputs are set, so `snapshot` and `step` can come from them.
		let state: { flow: Flow<S>; view: WritableSignal<Stepper<S>> } | undefined;
		const ensure = () => {
			state ??= untracked(() => {
				const flow = createStepper(steps, merged());
				const view = signal(flow.get());
				flow.subscribe(() => view.set(flow.get()));
				return { flow, view };
			});
			return state;
		};
		// After a render, and only in the browser: options are applied once the view exists and after
		// every later change, never while rendering on the server. Following `step` calls back into the owner.
		afterRenderEffect(() => {
			const next = merged();
			untracked(() => ensure().flow.setOptions(next));
		});
		inject(DestroyRef).onDestroy(() => state?.flow.destroy());
		const ref = computed(() => ensure().view());
		return Object.defineProperties(ref, {
			flow: { get: () => ensure().flow },
			steps: { value: steps },
			linear: { value: computed(() => !!merged().linear) },
		}) as StepperRef<S>;
	}

	return {
		steps,
		create: (options) => createStepper(steps, { ...defaults, ...options }),
		injectStepper(options) {
			assertInInjectionContext(this?.injectStepper ?? connect);
			return connect(options);
		},
		provideStepper: (options) => ({ provide: token, useFactory: () => connect(options) }),
		injectStepperContext: () =>
			inject(token, { optional: true }) ??
			fail("SZ100", "Missing provider. Add this flow's provideStepper() to the providers of a component above."),
	};
}
