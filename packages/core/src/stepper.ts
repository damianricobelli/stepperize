import { fail } from "./dev";
import type { Flow, FlowData, GuardContext, Id, Issue, Options, Result, Snapshot, Step, Stepper } from "./types";

type State<S extends readonly Step[]> = {
	index: number;
	history: readonly Id<S>[];
	data: FlowData<S>;
	complete: readonly Id<S>[];
	/** Failed checks remember the exact value they judged, so any later write makes them stale. */
	issues: Readonly<Record<string, { value: unknown; issues: ReadonlyArray<Issue> }>>;
	pending: boolean;
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
		issues: {},
		pending: false,
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

	function replace(next: Partial<Snapshot<S>> | undefined) {
		cancel();
		set(read(next));
	}

	/**
	 * Every move goes through here: optional validation, the guard, then one commit.
	 */
	async function move(
		direction: GuardContext<S>["direction"],
		target: (output: unknown) => number | null,
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
			let output: unknown = merge()[id];
			if (validate) {
				const value = output;
				let checked = steps[from].schema?.["~standard"].validate(value) ?? { value };
				if (isPromise(checked)) checked = await wait(checked);
				if (self.cancelled) return { accepted: false, reason: "cancelled" };
				if (checked.issues) {
					// Keep the rejected draft and its issues together, so the UI can show both.
					set({
						...state,
						data: merge(),
						issues: { ...state.issues, [id]: { value, issues: checked.issues } },
						pending: false,
					});
					return { accepted: false, reason: "invalid", issues: checked.issues };
				}
				output = checked.value;
			}
			const to = target(output);
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
			const { [id]: _checked, ...issues } = state.issues;
			const back = to === null ? -1 : state.history.lastIndexOf(steps[to].id);
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
				issues: validate ? issues : state.issues,
				pending: false,
			});
			if (to === null) options.onFinish?.(data);
			return { accepted: true, to: to === null ? null : steps[to].id, data };
		} finally {
			if (running === self) {
				running = undefined;
				if (state.pending) set({ ...state, pending: false }, false);
			}
		}
	}

	const actions = {
		next: (...data: [data?: unknown]) =>
			move(
				"next",
				(output) => {
					const id: I = steps[state.index].id;
					const branch = options.next?.[id];
					// A `null` entry, or a branch that returns `null`, ends the flow at this step.
					const to = branch === null ? null : branch ? branch(output as never) : steps[state.index + 1]?.id;
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
			set({ ...state, data: { ...state.data, [id]: data } });
		},
		reset: () => replace(initial),
		restore: (next: Partial<Snapshot<S>>) => replace({ ...snapshot(), ...next }),
		snapshot,
	};

	/** Follow `options.step`. When it cannot be followed, `onChange` restates where the flow really is. */
	function follow() {
		const want = options.step;
		if (want == null || want === steps[state.index].id) return;
		const restate = () => options.onChange?.(snapshot());
		if (known(want)) actions.goTo(want).then((result) => result.accepted || restate());
		else restate();
	}

	function get(): Stepper<S> {
		if (view) return view;
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
			isLast:
				options.next?.[current.id as I] === null || (index === steps.length - 1 && !options.next?.[current.id as I]),
			progress: steps.length > 1 ? index / (steps.length - 1) : 1,
			data,
			isPending: pending,
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
