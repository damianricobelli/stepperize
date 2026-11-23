/**
 * Minimal vendored copy of the [Standard Schema](https://standardschema.dev) v1
 * interface, so Zod, Valibot, ArkType and any other compliant library type and
 * validate step data with no runtime dependency.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (value: unknown) => StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>;
		readonly types?: { readonly input: Input; readonly output: Output } | undefined;
	};
}

export namespace StandardSchemaV1 {
	export type Result<Output> =
		| { readonly value: Output; readonly issues?: undefined }
		| { readonly issues: ReadonlyArray<Issue> };
	export interface Issue {
		readonly message: string;
		readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
	}
}

export type Issue = StandardSchemaV1.Issue;

/** A step. Only `id` is required; add a `schema` to type and validate its data. Every other field is yours. */
export type Step = { id: string; schema?: StandardSchemaV1<any, any> };

/** Union of the step ids of a flow. */
export type Id<S extends readonly Step[]> = S[number]["id"];

/** The step with the given id. */
export type StepOf<S extends readonly Step[], I extends Id<S>> = Extract<S[number], { id: I }>;

type Types<S extends readonly Step[], I extends Id<S>> =
	StepOf<S, I> extends { schema: StandardSchemaV1<infer Input, infer Output> } ? [Input, Output] : [unknown, unknown];

/** What a step stores: its schema's input, or `unknown` without a schema. */
export type Input<S extends readonly Step[], I extends Id<S>> = Types<S, I>[0];

/** What a step's schema produces after validation, or `unknown` without a schema. */
export type Output<S extends readonly Step[], I extends Id<S>> = Types<S, I>[1];

/** The data of every step, keyed by step id. */
export type FlowData<S extends readonly Step[]> = { [I in Id<S>]?: Input<S, I> };

/** What the schema of every complete step produced, keyed by step id. */
export type FlowOutput<S extends readonly Step[]> = { [I in Id<S>]?: Output<S, I> };

/**
 * - `"current"`: the step being shown.
 * - `"complete"`: `next()` validated it and moved on, and its data has not changed since.
 * - `"pending"`: everything else.
 */
export type StepState = "pending" | "current" | "complete";

/** Everything a flow needs to resume: plain JSON when your data is. */
export type Snapshot<S extends readonly Step[]> = {
	step: Id<S>;
	/** Steps walked to get here, oldest first. `prev()` returns along it. */
	history: Id<S>[];
	data: FlowData<S>;
	complete: Id<S>[];
};

/**
 * Why a move did not happen.
 * - `"invalid"`: the step's schema rejected its data. `issues` says why.
 * - `"guard"`: your `guard` returned `false`.
 * - `"policy"`: `linear` forbids jumping to that step.
 * - `"pending"`: another move is still running.
 * - `"boundary"`: there is no previous step.
 * - `"finished"`: the flow already finished. Any move, `setData`, `reset()` or `restore()` reopens it.
 * - `"cancelled"`: `reset()`, `restore()` or `destroy()` interrupted it.
 */
export type Reason = "invalid" | "guard" | "policy" | "pending" | "boundary" | "finished" | "cancelled";

export type Result<S extends readonly Step[]> =
	/** `to` is `null` when `next()` completed the last step: the flow is finished. */
	| { accepted: true; to: Id<S> | null; data: FlowData<S> }
	| { accepted: false; reason: Reason; issues?: ReadonlyArray<Issue> };

export type GuardContext<S extends readonly Step[]> = {
	from: S[number];
	/** `null` when `next()` is finishing the flow. */
	to: S[number] | null;
	direction: "next" | "prev" | "goTo";
	/** Flow data as it will be if the move is accepted. */
	data: FlowData<S>;
	/** Aborted when the move is cancelled. Pass it to `fetch`. */
	signal: AbortSignal;
};

export type Options<S extends readonly Step[]> = {
	/** Only move forward through `next()`, which validates. Completed steps can be revisited. Default `false`. */
	linear?: boolean;
	/**
	 * Where each step leads, from its validated data. Steps without an entry go
	 * to the following one. `null` ends the flow at that step, so a flow can have
	 * more than one ending; a branch may also return `null`. The second argument
	 * is the data of every step, for branches that depend on an earlier answer.
	 *
	 * @example
	 * next: {
	 *   account: (data) => (data.type === "team" ? "team" : "payment"),
	 *   profile: (_data, flow) => (flow.account?.type === "team" ? "invite" : "done"),
	 *   rejected: null,
	 * }
	 */
	next?: { [I in Id<S>]?: ((data: Output<S, I>, flow: FlowData<S>) => Id<S> | null) | null };
	/** Runs after validation and before every move. Return `false` to cancel it. May be async. */
	// biome-ignore lint/suspicious/noConfusingVoidType: a guard that returns nothing allows the move.
	guard?: (context: GuardContext<S>) => boolean | void | Promise<boolean | void>;
	/**
	 * Called after the step, data or completion changes. Persist the snapshot to resume later.
	 * `setData` calls it too: debounce slow writes when you save drafts on every keystroke.
	 */
	onChange?: (snapshot: Snapshot<S>) => void;
	/**
	 * Called once when `next()` completes the last step. Submit here. `output` is
	 * what the schemas produced for every complete step (transforms and defaults
	 * applied); `data` is everything as it was typed. Return a promise and the
	 * flow stays pending until it settles; if it rejects, so does `next()` and
	 * the flow is not finished, so the user can try again.
	 */
	onFinish?: (output: FlowOutput<S>, data: FlowData<S>) => unknown;
	/** Where to start: any part of a saved snapshot, or just `{ step }`. */
	snapshot?: Partial<Snapshot<S>>;
	/**
	 * Follow a step that lives somewhere else, such as the URL. The flow starts
	 * there and goes there whenever the value changes, like `goTo`: `linear` and
	 * the guard still apply. When it cannot follow, `onInvalidStep` is called.
	 *
	 * @example
	 * useStepper({
	 *   step: params.step,
	 *   onChange: (snapshot) => snapshot.step !== params.step && router.push(snapshot.step),
	 *   onInvalidStep: (current) => router.replace(current),
	 * });
	 */
	step?: Id<S> | (string & {}) | null;
	/**
	 * Called when the flow cannot follow `step`: an unknown id, a step `linear`
	 * does not allow yet, or a move the guard refused. It receives the step the
	 * flow is on, so you can correct the source without adding a history entry.
	 */
	onInvalidStep?: (current: Id<S>) => void;
};

/** An immutable view of a flow at one moment, plus the actions that change it. */
export type Stepper<S extends readonly Step[]> = {
	steps: S;
	current: S[number];
	/** Position of `current` in `steps`. */
	index: number;
	/** `current` is the first of `steps`. */
	isFirst: boolean;
	/**
	 * The flow is `linear`: only `next()` moves forward. The primitives render a
	 * list of steps instead of tabs, so a binding that follows a flow owned
	 * elsewhere reads it here.
	 */
	isLinear: boolean;
	/** `next()` finishes the flow: a step whose `next` entry is `null`, or the last of `steps` without a branch. */
	isLast: boolean;
	/** Position of `current` in `steps`, from `0` (first) to `1` (last). */
	progress: number;
	/** What each step holds as it was typed: drafts included. Fill your fields from here. */
	data: FlowData<S>;
	/** What the schema of each complete step produced: transforms and defaults applied. */
	output: FlowOutput<S>;
	/** `true` while an async schema, guard or `onFinish` is running. */
	isPending: boolean;
	/** `next()` completed the last step and `onFinish` settled. `false` again as soon as the flow changes. */
	isFinished: boolean;
	state: (id: Id<S>) => StepState;
	/** Issues from the last failed validation of a step (the current one by default), until its data changes. */
	issues: (id?: Id<S>) => ReadonlyArray<Issue> | undefined;
	/** Whether `goTo(id)` is allowed right now. Does not run the guard. */
	canGoTo: (id: Id<S>) => boolean;
	/** Run the handler of the current step. Exhaustive: a missing step is a type error. */
	match: <R>(handlers: { [I in Id<S>]: (step: StepOf<S, I>, data: Input<S, I> | undefined) => R }) => R;
	/**
	 * Check a step's data (the current step by default) against its schema
	 * without moving. Resolves with the issues, or `undefined` when it is valid;
	 * `issues(id)` returns the same until the data changes.
	 */
	validate: (id?: Id<S>) => Promise<ReadonlyArray<Issue> | undefined>;
	/**
	 * Save `data` for the current step, validate it, and move on. On the last
	 * step it completes the flow and resolves with `to: null`.
	 */
	next: (data?: unknown) => Promise<Result<S>>;
	/** Go back to the step you came from. Never validates. */
	prev: () => Promise<Result<S>>;
	/** Jump to a step. Does not validate; `linear` and the guard still apply. */
	goTo: (id: Id<S>) => Promise<Result<S>>;
	/**
	 * Save a draft. A complete step whose data changes is no longer complete; in
	 * a `linear` flow neither are the steps completed after it.
	 */
	setData: <I extends Id<S>>(id: I, data: Input<S, I>) => void;
	/** Back to the initial snapshot. Cancels a running move. */
	reset: () => void;
	/** Replace the state without validation or guards: resume a draft. To follow the URL, use the `step` option. */
	restore: (snapshot: Partial<Snapshot<S>>) => void;
	snapshot: () => Snapshot<S>;
};

/** A live flow: reads always return the latest state. Works without any framework. */
export type Flow<S extends readonly Step[]> = Stepper<S> & {
	/** The current immutable view. A new object after every change. */
	get: () => Stepper<S>;
	subscribe: (listener: () => void) => () => void;
	/** Replace the options. The hooks call this on every render. */
	setOptions: (options: Options<S>) => void;
	/** Cancel a running move and drop every listener. */
	destroy: () => void;
};
