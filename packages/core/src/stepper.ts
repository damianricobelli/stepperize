import { fail } from "./dev";
import type {
	Flow,
	FlowData,
	FlowOutput,
	GuardContext,
	Id,
	Issue,
	Options,
	Result,
	Snapshot,
	Step,
	Stepper,
} from "./types";

type State<S extends readonly Step[]> = {
	index: number;
	history: readonly Id<S>[];
	data: FlowData<S>;
	/** In the order they were completed, which `linear` relies on. */
	complete: readonly Id<S>[];
	/** What the schema produced for complete steps. Steps restored from a snapshot have none until the flow finishes. */
	output: FlowOutput<S>;
	/** Failed checks remember the exact value they judged, so any later write makes them stale. */
	issues: Readonly<Record<string, { value: unknown; issues: ReadonlyArray<Issue> }>>;
	pending: boolean;
	finished: boolean;
};

const isPromise = <T>(value: T | Promise<T>): value is Promise<T> =>
	typeof (value as { then?: unknown } | undefined)?.then === "function";

/** Step id -> position. Checked and built once per step list, however many flows are created from it. */
const indexes = new WeakMap<readonly Step[], Map<string, number>>();
function index(steps: readonly Step[]) {
	let positions = indexes.get(steps);
	if (!positions) {
		if (!steps.length) fail("SZ103", "A flow needs at least one step.");
		positions = new Map();
		for (const step of steps) {
			if (positions.has(step.id)) fail("SZ103", `Duplicate step id "${step.id}".`);
			positions.set(step.id, positions.size);
		}
		indexes.set(steps, positions);
	}
	return positions;
}

/** A running move. The `AbortController` only exists when a guard was handed its signal. */
type Move = { cancelled?: boolean; controller?: AbortController };

/**
 * Create a flow. This is the whole state machine: the React hooks, tests and
 * agents all drive this same object.
 *
 * @example
 * const flow = createStepper([{ id: "cart" }, { id: "payment" }]);
 * await flow.next({ items: 2 });
 * flow.current.id; // "payment"
 */
export function createStepper<const S extends readonly Step[]>(steps: S, options: Options<S> = {}): Flow<S> {
	type I = Id<S>;
	const positions = index(steps);
	const position = (id: string) => positions.get(id) ?? fail("SZ102", `Step "${id}" not found.`);
	const known = (id: unknown): id is I => positions.has(id as string);

	/** Saved snapshots can outlive the flow that wrote them: drop what no longer exists. */
	const read = (snapshot: Partial<Snapshot<S>> = {}): State<S> => ({
		index: positions.get(snapshot.step as string) ?? 0,
		history: (snapshot.history ?? []).filter(known),
		data: { ...snapshot.data },
		complete: (snapshot.complete ?? []).filter(known),
		output: {},
		issues: {},
		pending: false,
		finished: false,
	});

	const initial = options.snapshot;
	const listeners = new Set<() => void>();
	let state = read(initial);

	/** `linear`: completed steps can be revisited; everything else is reached through `next()`. */
	const allowed = (id: I, at = state) => !options.linear || steps[at.index].id === id || at.complete.includes(id);

	// `step` wins over the snapshot when the policy allows it: a deep link cannot skip validation.
	if (known(options.step) && allowed(options.step)) state = { ...state, index: position(options.step) };
	/** The last `options.step` acted upon, so a stale value re-rendered by its owner is not followed twice. */
	let followed: Options<S>["step"] = steps[state.index].id;
	let view: Stepper<S> | undefined;
	/** The running move, if any. Cancelling it is how `reset`, `restore` and `destroy` interrupt. */
	let running: Move | undefined;
	function cancel() {
		if (running) {
			running.cancelled = true;
			running.controller?.abort();
			running = undefined;
		}
	}

	const snapshot = (): Snapshot<S> => ({
		step: steps[state.index].id,
		history: [...state.history],
		data: state.data,
		complete: [...state.complete],
	});

	/** Publish a new state. `changed` is false for `pending` and `issues`, which are not worth persisting. */
	function set(next: State<S>, changed = true) {
		state = next;
		view = undefined;
		for (const listener of listeners) listener();
		if (changed) options.onChange?.(snapshot());
	}

	function replace(next: Partial<Snapshot<S>> | undefined, from?: State<S>) {
		cancel();
		const fresh = read(next);
		// `restore` keeps what was already validated, as long as the data is the same.
		if (from) {
			for (const id of fresh.complete) {
				if (id in from.output && Object.is(fresh.data[id], from.data[id])) fresh.output[id] = from.output[id];
			}
		}
		set(fresh);
	}

	/** The recorded issues without one step's. Most moves have nothing to clear and keep the same object. */
	function cleared(id: I) {
		if (!(id in state.issues)) return state.issues;
		const { [id]: _checked, ...rest } = state.issues;
		return rest;
	}

	/** Remember what a standalone check found. Valid with nothing recorded is no change to publish. */
	function record(id: I, value: unknown, issues?: ReadonlyArray<Issue>) {
		if (issues) set({ ...state, issues: { ...state.issues, [id]: { value, issues } } }, false);
		else if (id in state.issues) set({ ...state, issues: cleared(id) }, false);
		return issues;
	}

	const check = (id: I, value: unknown) => steps[position(id)].schema?.["~standard"].validate(value) ?? { value };

	/**
	 * A step whose data changed is no longer complete. In a linear flow neither
	 * are the steps completed after it: they are reached through `next()` again.
	 */
	function stale(id: I): State<S> {
		const at = state.complete.indexOf(id);
		if (at === -1) return state;
		const complete = options.linear ? state.complete.slice(0, at) : state.complete.filter((done) => done !== id);
		const output: FlowOutput<S> = {};
		for (const done of complete) if (done in state.output) output[done] = state.output[done];
		return { ...state, complete, output };
	}

	/**
	 * Every move goes through here: optional validation, the guard, then one commit.
	 */
	async function move(
		direction: GuardContext<S>["direction"],
		target: (output: unknown, data: FlowData<S>) => number | null,
		validate = false,
		...write: [value?: unknown]
	): Promise<Result<S>> {
		if (running) return { accepted: false, reason: "pending" };
		const self: Move = {};
		running = self;
		const from = state.index;
		const id: I = steps[from].id;
		const merge = (): FlowData<S> => (write.length ? { ...state.data, [id]: write[0] } : state.data);
		/**
		 * Only a real promise is awaited and makes the flow pending: synchronous
		 * schemas and guards never flicker, and cost no extra microtasks.
		 */
		const wait = <T>(value: T | Promise<T>) => {
			if (!state.pending) set({ ...state, pending: true }, false);
			return value;
		};
		try {
			const value = merge()[id];
			let output: unknown = value;
			const outputs: FlowOutput<S> = {};
			/** Keep the rejected draft and its issues together, so the UI can show both. */
			const reject = (step: I, judged: unknown, issues: ReadonlyArray<Issue>): Result<S> => {
				set({
					...stale(step),
					data: merge(),
					issues: { ...state.issues, [step]: { value: judged, issues } },
					pending: false,
				});
				return { accepted: false, reason: "invalid", issues };
			};
			if (validate) {
				let checked = check(id, value);
				if (isPromise(checked)) checked = await wait(checked);
				if (self.cancelled) return { accepted: false, reason: "cancelled" };
				if (checked.issues) return reject(id, value, checked.issues);
				output = checked.value;
			}
			const to = target(output, merge());
			if (validate && to === null) {
				// Steps completed in an earlier session came back without their output: validate them once more.
				for (const done of state.complete) {
					if (done === id || done in state.output) continue;
					let checked = check(done, state.data[done]);
					if (isPromise(checked)) checked = await wait(checked);
					if (self.cancelled) return { accepted: false, reason: "cancelled" };
					if (checked.issues) return reject(done, state.data[done], checked.issues);
					outputs[done] = checked.value as never;
				}
			}
			if (options.guard) {
				self.controller = new AbortController();
				let allowed = options.guard({
					from: steps[from],
					to: to === null ? null : steps[to],
					direction,
					data: merge(),
					signal: self.controller.signal,
				});
				if (isPromise(allowed)) allowed = await wait(allowed);
				if (self.cancelled) return { accepted: false, reason: "cancelled" };
				if (allowed === false) return { accepted: false, reason: "guard" };
			}

			const data = merge();
			const back = to === null ? -1 : state.history.lastIndexOf(steps[to].id);
			const all = validate ? { ...state.output, ...outputs, [id]: output } : state.output;
			set({
				index: to ?? from,
				// Returning to a visited step rewinds the trail. Moving anywhere else extends it,
				// except `prev()` without a trail (a flow resumed mid-way), which leaves it empty.
				history:
					back !== -1
						? state.history.slice(0, back)
						: to === null || direction === "prev"
							? state.history
							: [...state.history, id],
				data,
				complete: validate && !state.complete.includes(id) ? [...state.complete, id] : state.complete,
				output: all,
				issues: validate ? cleared(id) : state.issues,
				pending: false,
				finished: false,
			});
			if (to === null) {
				const done = options.onFinish?.(all, data);
				if (isPromise(done)) await wait(done);
				if (self.cancelled) return { accepted: false, reason: "cancelled" };
				set({ ...state, pending: false, finished: true }, false);
			}
			return { accepted: true, to: to === null ? null : steps[to].id, data };
		} catch (error) {
			// A guard that passes `signal` to `fetch` rejects with `AbortError` when the move is
			// cancelled. That is the cancellation, not a failure of the caller's.
			if (self.cancelled) return { accepted: false, reason: "cancelled" };
			throw error;
		} finally {
			if (running === self) {
				running = undefined;
				if (state.pending) set({ ...state, pending: false }, false);
			}
		}
	}

	const actions = {
		next: (...data: [data?: unknown]): Promise<Result<S>> =>
			state.finished
				? Promise.resolve({ accepted: false, reason: "finished" })
				: move(
						"next",
						(output, all) => {
							const id: I = steps[state.index].id;
							const branch = options.next?.[id];
							// A `null` entry, or a branch that returns `null`, ends the flow at this step.
							const to = branch === null ? null : branch ? branch(output as never, all) : steps[state.index + 1]?.id;
							return to == null ? null : position(to);
						},
						true,
						...data,
					),
		// Not `async`: returning `move()` from an async function would cost extra microtasks per move.
		prev: (): Promise<Result<S>> => {
			const to = state.history.at(-1) ?? steps[state.index - 1]?.id;
			return to === undefined
				? Promise.resolve({ accepted: false, reason: "boundary" })
				: move("prev", () => position(to));
		},
		goTo: (id: I): Promise<Result<S>> => {
			const to = position(id);
			if (to === state.index) return Promise.resolve({ accepted: true, to: id, data: state.data });
			return allowed(id) ? move("goTo", () => to) : Promise.resolve({ accepted: false, reason: "policy" });
		},
		setData: (id: I, data: unknown) => {
			position(id);
			if (Object.is(state.data[id], data)) return;
			set({ ...stale(id), data: { ...state.data, [id]: data }, finished: false });
		},
		validate: (id: I = steps[state.index].id): Promise<ReadonlyArray<Issue> | undefined> => {
			const value = state.data[id];
			const checked = check(id, value);
			// A synchronous schema records its issues before `validate()` returns.
			return isPromise(checked)
				? checked.then((result) => record(id, value, result.issues))
				: Promise.resolve(record(id, value, checked.issues));
		},
		reset: () => replace(initial),
		restore: (next: Partial<Snapshot<S>>) => replace({ ...snapshot(), ...next }, state),
		snapshot,
	};

	/** Follow `options.step`. When it cannot be followed, `onInvalidStep` says where the flow really is. */
	function follow() {
		const want = options.step;
		if (want == null || want === steps[state.index].id) return;
		const restate = () => options.onInvalidStep?.(steps[state.index].id);
		if (known(want)) actions.goTo(want).then((result) => result.accepted || restate());
		else restate();
	}

	// Every subscriber reads the view on every change: keep the hot path a one-liner the engine can inline.
	const get = (): Stepper<S> => view ?? build();
	function build(): Stepper<S> {
		// Each view closes over the state it was built from, so a retained view never changes.
		const at = state;
		const { index, data, complete, issues, pending } = at;
		const current = steps[index];
		view = {
			...actions,
			steps,
			current,
			index,
			isFirst: !index,
			isLinear: !!options.linear,
			isLast:
				options.next?.[current.id as I] === null || (index === steps.length - 1 && !options.next?.[current.id as I]),
			progress: steps.length > 1 ? index / (steps.length - 1) : 1,
			data,
			output: at.output,
			isPending: pending,
			isFinished: at.finished,
			state: (id) => (id === current.id ? "current" : complete.includes(id) ? "complete" : "pending"),
			issues: (id = current.id) => {
				const entry = issues[id];
				return entry && Object.is(entry.value, data[id]) ? entry.issues : undefined;
			},
			canGoTo: (id) => !pending && positions.has(id) && allowed(id, at),
			match: (handlers) => handlers[current.id as I](current as never, data[current.id as I]),
		};
		return view;
	}

	const store = {
		get,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setOptions(next: Options<S>) {
			const policy = options.linear;
			options = next;
			// `canGoTo` depends on the policy: rebuild the view when it changes.
			if (next.linear !== policy) set(state, false);
			if (next.step !== followed) {
				followed = next.step;
				follow();
			}
		},
		destroy() {
			cancel();
			listeners.clear();
		},
	};
	// Reads fall through to the latest view, so `flow.current` is always up to date.
	return new Proxy(store, {
		get: (target, key) => (key in target ? target[key as keyof typeof target] : get()[key as keyof Stepper<S>]),
	}) as Flow<S>;
}
