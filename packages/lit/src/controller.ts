import { createStepper, type Flow, type Options, type Step, type Stepper } from "@stepperize/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/** A value, or a function that returns it and is read again on every update of the host. */
export type MaybeGetter<T> = T | (() => T);

/**
 * What a controller is given. Options (or nothing) give the host a flow of its
 * own; a flow is followed instead, never owned. A function is read again before
 * every render of the host, so options follow its properties and a flow can
 * arrive late or change, as one from `@lit/context` does.
 */
export type ControllerSource<S extends readonly Step[]> = MaybeGetter<Options<S> | Flow<S> | undefined>;

/**
 * Connects a host element to a flow: the host updates whenever the flow
 * changes, and the subscription ends when the host is disconnected.
 *
 * @example
 * class CheckoutSteps extends LitElement {
 *   // An arrow function: a method passed as it is would lose `this`.
 *   stepper = checkout.controller(this, () => ({ onFinish: (output) => this.placeOrder(output) }));
 *
 *   render() {
 *     return html`<h2>${this.stepper.value.current.title}</h2>`;
 *   }
 * }
 */
export class StepperController<S extends readonly Step[]> implements ReactiveController {
	readonly steps: S;
	#host: ReactiveControllerHost;
	#defaults: Options<S>;
	#source: ControllerSource<S>;
	/** The flow the host shows: its own or one it follows. */
	#flow?: Flow<S>;
	/** The flow this controller created, if any. Only this one is ever given options or destroyed. */
	#owned?: Flow<S>;
	#unsubscribe?: () => void;
	#connected = false;

	/**
	 * @param source Options for a flow the host owns, a flow to follow, or a
	 * function returning either, read again before every render.
	 */
	constructor(host: ReactiveControllerHost, steps: S, defaults: Options<S>, source?: ControllerSource<S>) {
		this.#host = host;
		this.steps = steps;
		this.#defaults = defaults;
		this.#source = source;
		host.addController(this);
	}

	/**
	 * The flow: the same object tests, servers and other elements can drive.
	 * Created the first time it is needed, which is no later than the first
	 * update, so `snapshot` and `step` can come from properties set on the
	 * element before that: a Lit template binding does, and so does anything
	 * assigned before the element is appended.
	 */
	get flow(): Flow<S> {
		return this.#flow ?? this.#resolve(false);
	}

	/** The current immutable view of the flow, plus the actions. A new object after every change. */
	get value(): Stepper<S> {
		return this.flow.get();
	}

	/**
	 * Read the source once and settle which flow the host shows. `update` is a
	 * render of the host: only then are the options of an owned flow replaced.
	 */
	#resolve(update: boolean): Flow<S> {
		const source = typeof this.#source === "function" ? this.#source() : this.#source;
		let flow: Flow<S>;
		if (isFlow<S>(source)) {
			// Given a flow to follow, the host no longer needs one of its own.
			if (this.#owned !== source) this.#owned?.destroy();
			this.#owned = undefined;
			flow = source;
		} else {
			const options = { ...this.#defaults, ...source };
			this.#owned ??= createStepper(this.steps, options);
			// Also right after creating it: `step` is only reported to `onInvalidStep` by `setOptions`.
			if (update) this.#owned.setOptions(options);
			flow = this.#owned;
		}
		if (flow !== this.#flow) {
			this.#unsubscribe?.();
			this.#unsubscribe = undefined;
			this.#flow = flow;
		}
		this.#listen();
		return flow;
	}

	#listen() {
		if (this.#connected && this.#flow && !this.#unsubscribe) {
			this.#unsubscribe = this.#flow.subscribe(() => this.#host.requestUpdate());
		}
	}

	hostConnected() {
		// An element can be moved: follow the flow again every time it is connected.
		this.#connected = true;
		// A function is read before the first render instead: it may be waiting for a flow
		// (from `@lit/context`, say) that another controller of the host is about to receive.
		if (typeof this.#source === "function") this.#listen();
		else this.#resolve(false);
		// The flow may have moved while the host was away.
		this.#host.requestUpdate();
	}

	hostDisconnected() {
		this.#connected = false;
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
	}

	/**
	 * Before every render: the source is read once, so callbacks and `step`
	 * always see the host's latest state, and a move that `step` causes is in
	 * this same render.
	 */
	hostUpdate() {
		this.#resolve(true);
	}

	/**
	 * End this controller: it stops updating the host and leaves it. A flow
	 * the host owns is destroyed too, which cancels a running move; a flow it
	 * follows is left as it is. Disconnecting does not do this, because an
	 * element can be moved and connected again.
	 */
	destroy() {
		this.hostDisconnected();
		this.#owned?.destroy();
		this.#host.removeController(this);
	}
}

const isFlow = <S extends readonly Step[]>(value: unknown): value is Flow<S> =>
	typeof value === "object" && value !== null && "subscribe" in value && "setOptions" in value;
