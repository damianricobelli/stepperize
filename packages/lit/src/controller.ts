import { createStepper, type Flow, type Options, type Step, type Stepper } from "@stepperize/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/** A value, or a function that returns it and is read again on every update of the host. */
export type MaybeGetter<T> = T | (() => T);

export type ControllerOptions<S extends readonly Step[]> = MaybeGetter<Options<S> | undefined>;

/**
 * Connects a host element to a flow: the host updates whenever the flow
 * changes, and the subscription ends when the host is disconnected.
 *
 * @example
 * class CheckoutSteps extends LitElement {
 *   stepper = checkout.controller(this, { onFinish: placeOrder });
 *
 *   render() {
 *     return html`<h2>${this.stepper.value.current.title}</h2>`;
 *   }
 * }
 */
export class StepperController<S extends readonly Step[]> implements ReactiveController {
	#flow?: Flow<S>;
	readonly steps: S;
	protected readonly host: ReactiveControllerHost;
	protected readonly defaults: Options<S>;
	#options: ControllerOptions<S>;
	#owned: boolean;
	#unsubscribe?: () => void;

	/**
	 * @param source The options of a flow this controller creates and owns, or an
	 * existing flow to follow (one that another element or a module owns).
	 */
	constructor(host: ReactiveControllerHost, steps: S, defaults: Options<S>, source?: ControllerOptions<S> | Flow<S>) {
		this.host = host;
		this.steps = steps;
		this.defaults = defaults;
		this.#owned = !isFlow<S>(source);
		this.#options = isFlow<S>(source) ? undefined : source;
		if (isFlow<S>(source)) this.#flow = source;
		host.addController(this);
	}

	/**
	 * The flow: the same object tests, servers and other elements can drive.
	 * Created the first time it is needed, which is no later than when the host
	 * is connected, so `snapshot` and `step` can come from properties set on
	 * the element before that: a Lit template binding does, and so does anything
	 * assigned before the element is appended.
	 */
	get flow(): Flow<S> {
		this.#flow ??= createStepper(this.steps, this.options);
		return this.#flow;
	}

	/** The options as they are right now, over the definition's defaults. */
	protected get options(): Options<S> {
		const own = typeof this.#options === "function" ? this.#options() : this.#options;
		return { ...this.defaults, ...own };
	}

	/** The current immutable view of the flow, plus the actions. A new object after every change. */
	get value(): Stepper<S> {
		return this.flow.get();
	}

	hostConnected() {
		// An element can be moved: follow the flow again every time it is connected.
		this.#unsubscribe ??= this.flow.subscribe(() => this.host.requestUpdate());
		// The flow may have moved while the host was away.
		this.host.requestUpdate();
	}

	hostDisconnected() {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
	}

	/** Options are read again after every update, so callbacks and `step` always see the host's latest state. */
	hostUpdated() {
		if (this.#owned) this.flow.setOptions(this.options);
	}
}

const isFlow = <S extends readonly Step[]>(value: unknown): value is Flow<S> =>
	typeof value === "object" && value !== null && "subscribe" in value && "setOptions" in value;
