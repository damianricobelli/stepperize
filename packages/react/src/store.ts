import {
	type FlowData,
	type Get,
	type GoToOptions,
	getStepStatuses,
	matchStep,
	type NavigationFailureReason,
	type NavigationResult,
	type ResetOptions,
	type Step,
	type StepChangeContext,
	type StepDirection,
	type StepMap,
	type Stepper,
	type StepperData,
	validateStep,
} from "@stepperize/core";
import type { DefineStepperOptions, UseStepperOptions } from "./types";

type StoreState<Steps extends readonly Step[]> = {
	id: Get.Id<Steps>;
	data: FlowData<Steps>;
	completed: Get.Id<Steps>[];
	pending: boolean;
	linear: boolean;
};
// Weak keys retain metadata for old/concurrent snapshots without retaining unmounted flows.
const snapshotStates = new WeakMap<object, unknown>();
const reject = (reason: NavigationFailureReason): { accepted: false; reason: NavigationFailureReason } => ({
	accepted: false,
	reason,
});
function sameState<Steps extends readonly Step[]>(a: StoreState<Steps>, b: StoreState<Steps>) {
	return (
		a.id === b.id &&
		a.data === b.data &&
		a.completed === b.completed &&
		a.pending === b.pending &&
		a.linear === b.linear
	);
}

export type StepperStore<Steps extends readonly Step[]> = {
	getSnapshot: () => Stepper<Steps>;
	getServerSnapshot: () => Stepper<Steps>;
	subscribe: (listener: () => void) => () => void;
	configure: (options: UseStepperOptions<Steps>) => void;
	stageOptions: (options: UseStepperOptions<Steps>) => void;
	project: (snapshot: Stepper<Steps>, options: UseStepperOptions<Steps>, previous?: Stepper<Steps>) => Stepper<Steps>;
	activate: () => void;
	dispose: () => void;
};

/** One owner, one store. Actions read current state; reads belong to immutable snapshots. */
export function createStepperStore<Steps extends readonly Step[]>(
	steps: Steps,
	defaults: DefineStepperOptions<Steps>,
	initialOptions: UseStepperOptions<Steps>,
	map: StepMap<Steps>,
): StepperStore<Steps> {
	type Id = Get.Id<Steps>;
	type State = StoreState<Steps>;
	const initial = {
		id: (map.get(initialOptions.defaultStep ?? defaults.defaultStep ?? steps[0].id)?.id ?? steps[0].id) as Id,
		data: { ...(initialOptions.defaultData ?? defaults.defaultData) } as FlowData<Steps>,
		completed: [...(initialOptions.defaultCompleted ?? defaults.defaultCompleted ?? [])],
	};
	let config = initialOptions;
	let committedOptions = config;
	let configured = false;
	const internal = { ...initial };
	let state: State;
	let snapshot: Stepper<Steps>;
	let requestedData: FlowData<Steps>;
	let requestedCompleted: Id[];
	let alive = true;
	let busy = false;
	type Transition = { cancelled: boolean; controller?: AbortController; cancel?: () => void };
	let pending: Transition | undefined;
	let lastInvalid: unknown;
	let hasInvalid = false;
	const listeners = new Set<() => void>();
	const releaseGate = () => {
		if (!pending) busy = false;
	};

	const resolveState = (isPending = state?.pending ?? false): State => ({
		id: config.step === undefined ? internal.id : ((map.get(config.step as Id)?.id as Id | undefined) ?? initial.id),
		data: config.data ?? internal.data,
		completed: config.completed ?? internal.completed,
		pending: isPending,
		linear: config.linear ?? defaults.linear ?? false,
	});
	const notify = () => {
		for (const listener of listeners) listener();
	};
	const eligible = (id: Id) => {
		const index = map.indexOf(id);
		return index !== -1 && !state.pending && (!state.linear || index <= map.indexOf(state.id) + 1);
	};

	function publish(next: State) {
		if (state && sameState(next, state)) return;
		state = next;
		snapshot = projectedSource === snapshot && sameState(next, projectedState) ? projectedSnapshot : makeSnapshot();
		notify();
	}

	function cancelPending(publishChange = true) {
		if (!pending) return;
		const transition = pending;
		pending = undefined;
		busy = false;
		transition.cancelled = true;
		transition.controller?.abort();
		transition.cancel?.();
		if (publishChange) publish(resolveState(false));
	}

	/** Update local pieces together, then request controlled changes through their callbacks. */
	function commit(change: typeof internal) {
		const dataChanged = change.data !== requestedData;
		const completedChanged = change.completed !== requestedCompleted;
		if (config.step === undefined) internal.id = change.id;
		requestedData = change.data;
		requestedCompleted = change.completed;
		if (config.data === undefined) internal.data = change.data;
		if (config.completed === undefined) internal.completed = change.completed;
		publish(resolveState(false));
		if (dataChanged) config.onDataChange?.(requestedData);
		if (completedChanged) config.onCompletedChange?.(requestedCompleted);
	}

	function writeData(next: FlowData<Steps>) {
		if (!alive || next === requestedData) return;
		cancelPending();
		requestedData = next;
		if (config.data === undefined) {
			internal.data = next;
			publish({ id: state.id, data: next, completed: state.completed, pending: false, linear: state.linear });
		}
		config.onDataChange?.(requestedData);
	}
	function writeCompleted(next: Id[]) {
		if (!alive || next === requestedCompleted) return;
		cancelPending();
		requestedCompleted = next;
		if (config.completed === undefined) {
			internal.completed = next;
			publish({ id: state.id, data: state.data, completed: next, pending: false, linear: state.linear });
		}
		config.onCompletedChange?.(requestedCompleted);
	}

	async function go(
		to: number,
		direction: StepDirection,
		options: GoToOptions = {},
		reset?: ResetOptions,
	): Promise<NavigationResult<Id>> {
		if (!alive) return reject("cancelled");
		if (busy) return reject("pending");
		if (to < 0 || to >= steps.length) return reject(direction === "goto" ? "invalid-step" : "boundary");
		const fromId = state.id;
		const fromIndex = map.indexOf(fromId);
		const toId = steps[to].id as Id;
		if (direction !== "reset" && !options.bypassPolicy && !eligible(toId)) return reject("policy");
		const hasData = "data" in options;
		const nextData = reset && !reset.keepData ? initial.data : requestedData;
		const data = hasData ? { ...nextData, [fromId]: options.data } : nextData;
		const previousCompleted = reset && !reset.keepCompleted ? initial.completed : requestedCompleted;
		const completed =
			options.complete && !previousCompleted.includes(fromId) ? [...previousCompleted, fromId] : previousCompleted;
		if (toId === fromId && data === requestedData && completed === requestedCompleted) return reject("same-step");

		const transition: Transition = { cancelled: false };
		pending = transition;
		busy = true;
		const createContext = (statusIndex: number) =>
			({
				from: steps[fromIndex],
				to: steps[to],
				fromIndex,
				toIndex: to,
				direction,
				data,
				get signal() {
					if (!transition.controller) {
						transition.controller = new AbortController();
						if (transition.cancelled) transition.controller.abort();
					}
					return transition.controller.signal;
				},
				validate: (target?: Id | Step) => {
					const id = (typeof target === "object" ? target.id : (target ?? fromId)) as Id;
					return validateStep(steps, id, data[id]);
				},
				get statuses() {
					return getStepStatuses(steps, statusIndex);
				},
			}) as StepChangeContext<Steps>;
		let asynchronous = false;
		try {
			const decision = config.beforeStepChange?.(createContext(fromIndex));
			let allowed = decision;
			if (decision && typeof (decision as PromiseLike<unknown>).then === "function") {
				asynchronous = true;
				// A guard can cancel itself synchronously before returning its promise.
				// Observe that obsolete promise so a later rejection cannot escape the caller.
				if (transition.cancelled) {
					void Promise.resolve(decision).catch(() => {});
					return reject("cancelled");
				}
				const settled = new Promise<boolean | undefined>((resolve, reject) => {
					transition.cancel = () => resolve(false);
					Promise.resolve(decision).then(resolve, reject);
				});
				publish(resolveState(true));
				allowed = await settled;
				transition.cancel = undefined;
			}
			if (transition.cancelled || !alive) return reject("cancelled");
			if (allowed === false) return reject("guard");
			pending = undefined;
			commit({ id: toId, data, completed });
			config.onStepChange?.(toId, createContext(to));
			return { accepted: true, from: fromId, to: toId };
		} finally {
			// Hold the gate through synchronous sibling calls, but allow a subsequent awaited call.
			// An obsolete transition must never unlock a newer one.
			if (!pending || pending === transition) {
				if (pending === transition) pending = undefined;
				if (state.pending) publish(resolveState(false));
				if (asynchronous) releaseGate();
				else queueMicrotask(releaseGate);
			}
		}
	}

	const actions = {
		next: (options?: GoToOptions) => {
			syncOptions();
			return go(map.indexOf(state.id) + 1, "next", options);
		},
		prev: (options?: GoToOptions) => {
			syncOptions();
			return go(map.indexOf(state.id) - 1, "prev", options);
		},
		goTo: (id: Id, options?: GoToOptions) => {
			syncOptions();
			return go(map.indexOf(id), "goto", options);
		},
		reset: (options: ResetOptions = {}) => {
			syncOptions();
			return go(map.indexOf(initial.id), "reset", {}, options);
		},
		setComplete: (target?: Id, value = true) => {
			syncOptions();
			const id = target ?? state.id;
			if (!map.has(id)) throw new Error(`Step "${id}" not found.`);
			const has = requestedCompleted.includes(id);
			if (value && !has) writeCompleted([...requestedCompleted, id]);
			else if (!value && has) writeCompleted(requestedCompleted.filter((entry) => entry !== id));
		},
	};
	const dataActions = {
		set: (...args: [unknown] | [Id, unknown]) => {
			syncOptions();
			const id = args.length === 1 ? state.id : args[0];
			if (!map.has(id)) throw new Error(`Step "${id}" not found.`);
			const data = { ...requestedData };
			data[id] = args[args.length - 1];
			writeData(data);
		},
		update: ((id, update) => {
			syncOptions();
			if (!map.has(id)) throw new Error(`Step "${id}" not found.`);
			writeData({ ...requestedData, [id]: update(requestedData[id]) });
		}) as StepperData<Steps>["update"],
		clear: (id?: Id) => {
			syncOptions();
			if (id === undefined) return writeData({});
			if (!Object.hasOwn(requestedData, id)) return;
			const data = { ...requestedData };
			delete data[id];
			writeData(data);
		},
		reset: () => {
			syncOptions();
			writeData(initial.data);
		},
	};

	function makeSnapshot(view = state): Stepper<Steps> {
		const { id, data, completed, pending: isPending, linear } = view;
		const index = map.indexOf(id);
		const previous = snapshot;
		const sameStep = previous?.id === id;
		let complete: Set<Id> | undefined;
		const value: Stepper<Steps> = {
			steps,
			id,
			current: steps[index],
			index,
			count: steps.length,
			completed,
			progress: steps.length <= 1 ? 1 : index / (steps.length - 1),
			isFirst: index === 0,
			isLast: index === steps.length - 1,
			canPrev: index > 0 && !isPending,
			canNext: index < steps.length - 1 && !isPending,
			isPending,
			next: actions.next,
			prev: actions.prev,
			goTo: actions.goTo,
			reset: actions.reset,
			setComplete: actions.setComplete,
			data: {
				set: dataActions.set,
				update: dataActions.update,
				clear: dataActions.clear,
				reset: dataActions.reset,
				get: ((target: Id = id) => data[target]) as StepperData<Steps>["get"],
				all: () => data,
			},
			status: sameStep
				? previous.status
				: (target) => {
						const position = map.indexOf(target);
						return position === index ? "active" : position >= 0 && position < index ? "previous" : "upcoming";
					},
			isComplete:
				sameStep && previous.completed === completed
					? previous.isComplete
					: (target = id) => {
							complete ??= new Set(completed);
							return complete.has(target);
						},
			is: sameStep ? previous.is : (target) => target === id,
			canGoTo: (target) => {
				const position = map.indexOf(target);
				return position >= 0 && !isPending && (!linear || position <= index + 1);
			},
			match: (handlers) => matchStep(steps, id, handlers, data),
			validate: ((target: Id = id) => validateStep(steps, target, data[target])) as Stepper<Steps>["validate"],
		};
		snapshotStates.set(value, view);
		return value;
	}
	function configure(next: UseStepperOptions<Steps>) {
		if (configured && config === next) return;
		configured = true;
		const changed =
			next.step !== config.step ||
			next.data !== config.data ||
			next.completed !== config.completed ||
			next.linear !== config.linear;
		config = next;
		if (changed) {
			cancelPending();
			publish(resolveState());
		}
		requestedData = state.data;
		requestedCompleted = state.completed;
		if (next.step !== undefined && !map.has(next.step as string)) {
			if (!hasInvalid || !Object.is(lastInvalid, next.step)) {
				hasInvalid = true;
				lastInvalid = next.step;
				next.onInvalidStep?.(next.step);
			}
		} else hasInvalid = false;
	}
	function syncOptions() {
		configure(committedOptions);
	}

	state = resolveState(false);
	requestedData = state.data;
	requestedCompleted = state.completed;
	snapshot = makeSnapshot();
	const serverSnapshot = snapshot;
	let projectedSource: Stepper<Steps> | undefined;
	let projectedState: State;
	let projectedSnapshot: Stepper<Steps>;
	return {
		getSnapshot: () => snapshot,
		getServerSnapshot: () => serverSnapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		configure,
		activate() {
			alive = true;
		},
		stageOptions(next) {
			committedOptions = next;
		},
		project(source, options, cached) {
			const previous = (snapshotStates.get(source) as State | undefined) ?? state;
			const id =
				options.step === undefined ? previous.id : ((map.get(options.step as Id)?.id as Id | undefined) ?? initial.id);
			const data = options.data ?? previous.data;
			const completed = options.completed ?? previous.completed;
			const linear = options.linear ?? defaults.linear ?? false;
			if (
				id === previous.id &&
				data === previous.data &&
				completed === previous.completed &&
				linear === previous.linear
			)
				return source;
			const next = { id, data, completed, linear, pending: previous.pending };
			// The reader retains a snapshot for these same render options.
			if (
				cached &&
				cached.id === id &&
				cached.data.all() === data &&
				cached.completed === completed &&
				cached.isPending === previous.pending
			)
				return cached;
			if (projectedSource === source && sameState(next, projectedState)) return projectedSnapshot;
			projectedSource = source;
			projectedState = next;
			projectedSnapshot = makeSnapshot(next);
			return projectedSnapshot;
		},
		dispose() {
			alive = false;
			listeners.clear();
			cancelPending(false);
		},
	};
}
