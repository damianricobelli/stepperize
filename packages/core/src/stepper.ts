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
	if (!steps.length) fail("SZ103", "A flow needs at least one step.");
	const positions = new Map<string, number>();
	for (const step of steps) {
		if (positions.has(step.id)) fail("SZ103", `Duplicate step id "${step.id}".`);
		positions.set(step.id, positions.size);
	}
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
	let view: Stepper<S> | undefined;
	/** The running move, if any. Aborting it is how `reset`, `restore` and `destroy` cancel. */
	let running: AbortController | undefined;

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
		running?.abort();
		running = undefined;
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
		const controller = new AbortController();
		running = controller;
		const from = state.index;
		const id: I = steps[from].id;
		const merge = (): FlowData<S> => (write.length ? { ...state.data, [id]: write[0] } : state.data);
		/** Only a real promise makes the flow pending: synchronous schemas and guards never flicker. */
		const wait = <T>(value: T | Promise<T>) => {
			if (isPromise(value) && !state.pending) set({ ...state, pending: true }, false);
			return value;
		};
		try {
			let output: unknown = merge()[id];
			if (validate) {
				const value = output;
				const checked = await wait(steps[from].schema?.["~standard"].validate(value) ?? { value });
				if (controller.signal.aborted) return { accepted: false, reason: "cancelled" };
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
			const allowed = await wait(
				options.guard?.({
					from: steps[from],
					to: to === null ? null : steps[to],
					direction,
					data: merge(),
					signal: controller.signal,
				}),
			);
			if (controller.signal.aborted) return { accepted: false, reason: "cancelled" };
			if (allowed === false) return { accepted: false, reason: "guard" };

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
			if (running === controller) {
				running = undefined;
				if (state.pending) set({ ...state, pending: false }, false);
			}
		}
	}

	/** `linear`: completed steps can be revisited; everything else is reached through `next()`. */
	const allowed = (id: I, at = state) => !options.linear || steps[at.index].id === id || at.complete.includes(id);

	const actions = {
		next: (...data: [data?: unknown]) =>
			move(
				"next",
				(output) => {
					const id: I = steps[state.index].id;
					const branch = options.next?.[id];
					const to = branch ? branch(output as never) : steps[state.index + 1]?.id;
					return to === undefined ? null : position(to);
				},
				true,
				...data,
			),
		prev: async (): Promise<Result<S>> => {
			const to = state.history.at(-1) ?? steps[state.index - 1]?.id;
			return to === undefined ? { accepted: false, reason: "boundary" } : move("prev", () => position(to));
		},
		goTo: async (id: I): Promise<Result<S>> => {
			const to = position(id);
			if (to === state.index) return { accepted: true, to: id, data: state.data };
			return allowed(id) ? move("goTo", () => to) : { accepted: false, reason: "policy" };
		},
		setData: (id: I, data: unknown) => {
			position(id);
			set({ ...state, data: { ...state.data, [id]: data } });
		},
		reset: () => replace(initial),
		restore: (next: Partial<Snapshot<S>>) => replace({ ...snapshot(), ...next }),
		snapshot,
	};

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
		},
		destroy() {
			running?.abort();
			running = undefined;
			listeners.clear();
		},
	};
	// Reads fall through to the latest view, so `flow.current` is always up to date.
	return new Proxy(store, {
		get: (target, key) => (key in target ? target[key as keyof typeof target] : get()[key as keyof Stepper<S>]),
	}) as Flow<S>;
}
