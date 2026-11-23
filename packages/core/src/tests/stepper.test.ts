import { describe, expect, it, vi } from "vitest";
import { createStepper } from "../stepper";
import type { StandardSchemaV1 } from "../types";

/** A tiny Standard Schema: `check` returns an error message, or nothing when valid. */
function schema<T>(check: (value: T) => string | undefined, async = false): StandardSchemaV1<T, T> {
	return {
		"~standard": {
			version: 1,
			vendor: "test",
			validate: (value) => {
				const message = check(value as T);
				const result = message ? { issues: [{ message }] } : { value: value as T };
				return async ? Promise.resolve(result) : result;
			},
		},
	};
}

const account = schema<{ type: "personal" | "team" }>((value) => (value?.type ? undefined : "Pick a type"));
const steps = [
	{ id: "account", title: "Account", schema: account },
	{ id: "team", title: "Team" },
	{ id: "payment", title: "Payment" },
] as const;

describe("moving", () => {
	it("walks forward and back, completing each step it leaves through next()", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }, { id: "c" }]);
		expect(flow.current.id).toBe("a");
		expect(await flow.next()).toEqual({ accepted: true, to: "b", data: {} });
		expect([flow.index, flow.state("a"), flow.state("b"), flow.state("c")]).toEqual([
			1,
			"complete",
			"current",
			"pending",
		]);
		expect(await flow.prev()).toMatchObject({ accepted: true, to: "a" });
		expect(flow.state("a")).toBe("current");
		expect(await flow.prev()).toEqual({ accepted: false, reason: "boundary" });
	});

	it("finishes on the last step with to: null and the full data", async () => {
		const onFinish = vi.fn();
		const flow = createStepper([{ id: "a" }, { id: "b" }], { snapshot: { step: "b", data: { a: 1 } }, onFinish });
		expect(await flow.next(2)).toEqual({ accepted: true, to: null, data: { a: 1, b: 2 } });
		// Output first: only what `next()` validated. Then everything as it was typed.
		expect(onFinish).toHaveBeenCalledWith({ b: 2 }, { a: 1, b: 2 });
		expect(flow.current.id).toBe("b");
		expect(flow.snapshot().complete).toEqual(["b"]);
	});

	it("rejects a second move while one is running", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { guard: async () => true });
		const [first, second] = await Promise.all([flow.next(), flow.next()]);
		expect(first.accepted).toBe(true);
		expect(second).toEqual({ accepted: false, reason: "pending" });
		expect(flow.current.id).toBe("b");
	});

	it("settles a synchronous move before the next statement runs", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { guard: () => true });
		const moving = flow.next();
		expect(flow.current.id).toBe("b");
		expect(await moving).toMatchObject({ accepted: true, to: "b" });
	});

	it("throws a coded error for unknown ids and invalid step lists", () => {
		expect(() => createStepper([])).toThrow(/SZ103/);
		expect(() => createStepper([{ id: "a" }, { id: "a" }])).toThrow(/SZ103.*Duplicate/);
		const flow = createStepper([{ id: "a" }]);
		expect(() => flow.setData("zzz" as "a", 1)).toThrow(/SZ102/);
	});
});

describe("validation", () => {
	it("blocks next(), keeps the draft and exposes the issues until the data changes", async () => {
		const flow = createStepper(steps);
		const draft = {} as { type: "team" };
		expect(await flow.next(draft)).toEqual({
			accepted: false,
			reason: "invalid",
			issues: [{ message: "Pick a type" }],
		});
		expect(flow.current.id).toBe("account");
		expect(flow.data.account).toBe(draft);
		expect(flow.issues()).toEqual([{ message: "Pick a type" }]);
		expect(flow.issues("team")).toBeUndefined();
		flow.setData("account", { type: "team" });
		expect(flow.issues()).toBeUndefined();
		expect(await flow.next()).toMatchObject({ accepted: true, to: "team" });
	});

	it("is pending only while an async schema runs, and never validates on prev or goTo", async () => {
		const flow = createStepper([
			{ id: "a", schema: schema<number>((n) => (n > 0 ? undefined : "Positive"), true) },
			{ id: "b" },
		]);
		const seen: boolean[] = [];
		flow.subscribe(() => seen.push(flow.isPending));
		expect(await flow.goTo("b")).toMatchObject({ accepted: true });
		expect(seen).toEqual([false]);
		await flow.prev();
		const moving = flow.next(1);
		expect(flow.isPending).toBe(true);
		expect(flow.canGoTo("b")).toBe(false);
		expect(await moving).toMatchObject({ accepted: true, to: "b" });
		expect(flow.isPending).toBe(false);
	});
});

describe("branching", () => {
	const options = {
		next: { account: (data: { type: "personal" | "team" }) => (data.type === "team" ? "team" : "payment") },
	} as const;

	it("follows the next map, and prev() returns along the path taken", async () => {
		const flow = createStepper(steps, options);
		await flow.next({ type: "personal" });
		expect(flow.current.id).toBe("payment");
		expect(flow.state("team")).toBe("pending");
		expect(flow.snapshot().history).toEqual(["account"]);
		await flow.prev();
		expect(flow.current.id).toBe("account");
		await flow.next({ type: "team" });
		expect(flow.current.id).toBe("team");
	});

	it("gives a branch the data of every step, including the one being saved", async () => {
		const flow = createStepper(steps, {
			next: { team: (_data, all) => (all.account?.type === "team" && all.team === "skip" ? "account" : "payment") },
		});
		await flow.next({ type: "team" });
		expect(await flow.next("skip")).toMatchObject({ accepted: true, to: "account" });
	});

	it("ends at any step whose entry is null, or when a branch returns null", async () => {
		const onFinish = vi.fn();
		const flow = createStepper(steps, {
			next: { account: (data) => (data.type === "team" ? "team" : null), team: null },
			onFinish,
		});
		expect(flow.isLast).toBe(false);
		expect(await flow.next({ type: "team" })).toMatchObject({ accepted: true, to: "team" });
		expect(flow.isLast).toBe(true);
		expect(await flow.next()).toMatchObject({ accepted: true, to: null });
		flow.reset();
		expect(await flow.next({ type: "personal" })).toMatchObject({ accepted: true, to: null });
		expect(onFinish).toHaveBeenCalledTimes(2);
	});

	it("goes back by order when a resumed flow has no history, without inventing one", async () => {
		const flow = createStepper(steps, { snapshot: { step: "payment" } });
		await flow.prev();
		expect(flow.current.id).toBe("team");
		await flow.prev();
		expect(flow.current.id).toBe("account");
		expect(flow.snapshot().history).toEqual([]);
	});
});

describe("guard and policy", () => {
	it("cancels a move when the guard returns false and passes the data it would commit", async () => {
		const guard = vi.fn((_context: unknown) => false);
		const flow = createStepper([{ id: "a" }, { id: "b" }], { guard });
		expect(await flow.next("draft")).toEqual({ accepted: false, reason: "guard" });
		expect(flow.data).toEqual({});
		expect(guard.mock.calls[0][0]).toMatchObject({
			from: { id: "a" },
			to: { id: "b" },
			direction: "next",
			data: { a: "draft" },
		});
	});

	it("aborts the signal and resolves as cancelled when reset() interrupts an async guard", async () => {
		let signal!: AbortSignal;
		let release!: (value: boolean) => void;
		const flow = createStepper([{ id: "a" }, { id: "b" }], {
			guard: (context) => {
				signal = context.signal;
				return new Promise<boolean>((resolve) => {
					release = resolve;
				});
			},
		});
		const moving = flow.next();
		await Promise.resolve();
		expect(flow.isPending).toBe(true);
		flow.reset();
		expect(signal.aborted).toBe(true);
		expect(flow.isPending).toBe(false);
		release(true);
		expect(await moving).toEqual({ accepted: false, reason: "cancelled" });
		expect(flow.current.id).toBe("a");
	});

	it("resolves as cancelled when the guard rejects because its signal was aborted", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }], {
			// What `fetch(url, { signal })` does: reject with an AbortError when the signal aborts.
			guard: ({ signal }) =>
				new Promise<boolean>((_resolve, reject) => {
					signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
				}),
		});
		const moving = flow.next();
		await Promise.resolve();
		flow.reset();
		expect(await moving).toEqual({ accepted: false, reason: "cancelled" });
	});

	it("still rejects when a guard fails on its own", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }], {
			guard: () => Promise.reject(new Error("offline")),
		});
		await expect(flow.next()).rejects.toThrow("offline");
		expect(flow.isPending).toBe(false);
	});

	it("linear only moves forward through next(); completed steps can be revisited", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { linear: true });
		expect(flow.isLinear).toBe(true);
		flow.setOptions({});
		expect(flow.isLinear).toBe(false);
		flow.setOptions({ linear: true });
		expect([flow.canGoTo("a"), flow.canGoTo("b"), flow.canGoTo("c")]).toEqual([true, false, false]);
		expect(await flow.goTo("b")).toEqual({ accepted: false, reason: "policy" });
		await flow.next();
		await flow.next();
		expect(await flow.goTo("a")).toMatchObject({ accepted: true, to: "a" });
		expect([flow.canGoTo("b"), flow.canGoTo("c")]).toEqual([true, false]);
	});
});

describe("snapshots", () => {
	it("round-trips through JSON and drops ids that no longer exist", async () => {
		const flow = createStepper(steps);
		await flow.next({ type: "team" });
		const saved = JSON.parse(JSON.stringify(flow.snapshot()));
		expect(saved).toEqual({
			step: "team",
			history: ["account"],
			data: { account: { type: "team" } },
			complete: ["account"],
		});
		const resumed = createStepper(steps, { snapshot: { ...saved, step: "gone", complete: ["account", "gone"] } });
		expect(resumed.current.id).toBe("account");
		expect(resumed.snapshot().complete).toEqual(["account"]);
	});

	it("calls onChange for step, data and completion, but not for pending or issues", async () => {
		const onChange = vi.fn();
		const flow = createStepper(steps, { onChange });
		flow.setData("team", "x");
		expect(onChange).toHaveBeenCalledTimes(1);
		await flow.next({ type: "team" });
		expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ step: "team", complete: ["account"] }));
		flow.restore({ step: "payment" });
		expect(flow.current.id).toBe("payment");
		expect(flow.data.team).toBe("x");
		flow.reset();
		expect(flow.snapshot()).toEqual({ step: "account", history: [], data: {}, complete: [] });
	});
});

describe("views", () => {
	it("are immutable: a retained view keeps reading the state it was built from", async () => {
		const flow = createStepper([{ id: "a" }, { id: "b" }]);
		const before = flow.get();
		expect(flow.get()).toBe(before);
		await flow.next("draft");
		expect(before.current.id).toBe("a");
		expect(before.data).toEqual({});
		expect(flow.get()).not.toBe(before);
		expect(flow.get().match({ a: () => "first", b: (step, data) => `${step.id}:${String(data)}` })).toBe("b:undefined");
	});

	it("derive isFirst, isLast and progress, and a branch means the flow does not end here", async () => {
		const flow = createStepper(steps);
		expect([flow.isFirst, flow.isLast, flow.progress]).toEqual([true, false, 0]);
		await flow.goTo("team");
		expect([flow.isFirst, flow.isLast, flow.progress]).toEqual([false, false, 0.5]);
		await flow.goTo("payment");
		expect([flow.isFirst, flow.isLast, flow.progress]).toEqual([false, true, 1]);
		const loop = createStepper(steps, { snapshot: { step: "payment" }, next: { payment: () => "account" } });
		expect(loop.isLast).toBe(false);
		expect(createStepper([{ id: "only" }]).progress).toBe(1);
	});

	it("stops notifying after destroy()", () => {
		const flow = createStepper([{ id: "a" }]);
		const listener = vi.fn();
		flow.subscribe(listener);
		flow.destroy();
		flow.setData("a", 1);
		expect(listener).not.toHaveBeenCalled();
	});
});

describe("following an outside step", () => {
	const flush = () => new Promise((resolve) => setTimeout(resolve));

	it("starts there, and goes there when the value changes", async () => {
		const flow = createStepper(steps, { step: "team" });
		expect(flow.current.id).toBe("team");
		flow.setOptions({ step: "payment" });
		await flush();
		expect(flow.current.id).toBe("payment");
		expect(flow.snapshot().history).toEqual(["team"]);
	});

	it("ignores a stale value its owner renders again after the flow moved on", async () => {
		const flow = createStepper(steps, { step: "account" });
		await flow.next({ type: "team" });
		flow.setOptions({ step: "account" });
		await flush();
		expect(flow.current.id).toBe("team");
	});

	it("reports the real step through onInvalidStep when it cannot follow", async () => {
		const seen: string[] = [];
		const changes: string[] = [];
		const onInvalidStep = (current: string) => seen.push(current);
		const onChange = (snapshot: { step: string }) => changes.push(snapshot.step);
		// A deep link cannot skip validation in a linear flow.
		const flow = createStepper(steps, { linear: true, step: "payment", onInvalidStep, onChange });
		expect(flow.current.id).toBe("account");
		flow.setOptions({ linear: true, step: "payment", onInvalidStep, onChange });
		await flush();
		expect(seen).toEqual(["account"]);
		// Unknown ids, and moves the guard refuses.
		flow.setOptions({ linear: true, step: "nope", onInvalidStep, onChange });
		flow.setOptions({ step: "team", guard: () => false, onInvalidStep, onChange });
		await flush();
		expect(flow.current.id).toBe("account");
		expect(seen).toEqual(["account", "account", "account"]);
		// Nothing changed, so `onChange` stayed quiet.
		expect(changes).toEqual([]);
	});
});

/** Trims on the way out, so input and output differ. */
const name: StandardSchemaV1<string, { name: string }> = {
	"~standard": {
		version: 1,
		vendor: "test",
		validate: (value) =>
			typeof value === "string" && value.trim()
				? { value: { name: value.trim() } }
				: { issues: [{ message: "Required" }] },
	},
};
const form = [{ id: "name", schema: name }, { id: "plan" }, { id: "review" }] as const;

describe("validating without moving", () => {
	it("reports the issues of the current step and stays put", async () => {
		const onChange = vi.fn();
		const flow = createStepper(form, { onChange });
		expect(await flow.validate()).toEqual([{ message: "Required" }]);
		expect(flow.issues()).toEqual([{ message: "Required" }]);
		expect([flow.current.id, flow.state("name")]).toEqual(["name", "current"]);
		flow.setData("name", " Ada ");
		expect(await flow.validate()).toBeUndefined();
		expect(flow.issues()).toBeUndefined();
		// Checking is not completing: only `next()` does that.
		expect(flow.snapshot().complete).toEqual([]);
		// Issues are not worth persisting.
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("checks any step by id, and steps without a schema are always valid", async () => {
		const flow = createStepper(form, { snapshot: { step: "review" } });
		expect(await flow.validate("plan")).toBeUndefined();
		expect(await flow.validate("name")).toEqual([{ message: "Required" }]);
		expect(flow.issues("name")).toEqual([{ message: "Required" }]);
	});
});

describe("output", () => {
	it("keeps what each schema produced, apart from the data as it was typed", async () => {
		const onFinish = vi.fn();
		const flow = createStepper(form, { onFinish });
		await flow.next(" Ada ");
		expect(flow.data.name).toBe(" Ada ");
		expect(flow.output).toEqual({ name: { name: "Ada" } });
		await flow.next("pro");
		await flow.next();
		expect(onFinish).toHaveBeenCalledWith(
			{ name: { name: "Ada" }, plan: "pro", review: undefined },
			{ name: " Ada ", plan: "pro" },
		);
	});

	it("validates restored steps again when the flow finishes", async () => {
		const onFinish = vi.fn();
		const saved = { step: "review", data: { name: " Ada " }, complete: ["name", "plan"] } as const;
		const flow = createStepper(form, { snapshot: { ...saved, complete: [...saved.complete] }, onFinish });
		expect(flow.output).toEqual({});
		expect(await flow.next()).toMatchObject({ accepted: true, to: null });
		expect(onFinish.mock.calls[0][0]).toEqual({ name: { name: "Ada" }, plan: undefined, review: undefined });

		// A draft saved under an older schema can fail: the flow does not finish, and says where.
		const stale = createStepper(form, {
			snapshot: { step: "review", data: { name: " " }, complete: ["name"] },
			onFinish,
		});
		expect(await stale.next()).toMatchObject({ accepted: false, reason: "invalid" });
		expect(stale.issues("name")).toEqual([{ message: "Required" }]);
		expect(stale.state("name")).toBe("pending");
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("survives restore() while the data is the same", async () => {
		const flow = createStepper(form);
		await flow.next("Ada");
		flow.restore({ step: "review" });
		expect(flow.output).toEqual({ name: { name: "Ada" } });
		flow.restore({ data: { name: "Bob" } });
		expect(flow.output).toEqual({});
	});
});

describe("editing a complete step", () => {
	it("is no longer complete, and loses its output", async () => {
		const flow = createStepper(form);
		await flow.next("Ada");
		await flow.next("pro");
		await flow.goTo("name");
		flow.setData("name", "Ada");
		expect(flow.snapshot().complete).toEqual(["name", "plan"]);
		flow.setData("name", "");
		expect(flow.snapshot().complete).toEqual(["plan"]);
		expect(flow.output).toEqual({ plan: "pro" });
		expect(await flow.next()).toMatchObject({ accepted: false, reason: "invalid" });
		expect(await flow.next("Bob")).toMatchObject({ accepted: true, to: "plan" });
		expect(flow.snapshot().complete).toEqual(["plan", "name"]);
	});

	it("also drops the steps completed after it in a linear flow, so none is skipped", async () => {
		const flow = createStepper(form, { linear: true });
		await flow.next("Ada");
		await flow.next("pro");
		await flow.goTo("name");
		expect(flow.canGoTo("plan")).toBe(true);
		flow.setData("name", "Bob");
		expect(flow.snapshot().complete).toEqual([]);
		expect(await flow.goTo("plan")).toEqual({ accepted: false, reason: "policy" });
		// The data is still there: walking forward validates it again.
		let result = await flow.next();
		while (result.accepted && result.to !== "review") result = await flow.next();
		expect(flow.current.id).toBe("review");
		expect(flow.snapshot().complete).toEqual(["name", "plan"]);
	});

	it("drops completion when next(data) is rejected", async () => {
		const flow = createStepper(form);
		await flow.next("Ada");
		await flow.goTo("name");
		expect(await flow.next("")).toMatchObject({ accepted: false, reason: "invalid" });
		expect(flow.snapshot().complete).toEqual([]);
	});
});

describe("finishing", () => {
	it("finishes once: next() is refused until the flow changes", async () => {
		const onFinish = vi.fn();
		const flow = createStepper([{ id: "a" }, { id: "b" }], { snapshot: { step: "b" }, onFinish });
		expect(flow.isFinished).toBe(false);
		await flow.next();
		expect(flow.isFinished).toBe(true);
		expect(await flow.next()).toEqual({ accepted: false, reason: "finished" });
		expect(onFinish).toHaveBeenCalledTimes(1);
		flow.setData("b", 1);
		expect(flow.isFinished).toBe(false);
		await flow.next();
		await flow.prev();
		expect(flow.isFinished).toBe(false);
		flow.restore({ step: "b" });
		await flow.next();
		flow.reset();
		expect(flow.isFinished).toBe(false);
		expect(onFinish).toHaveBeenCalledTimes(3);
	});

	it("stays pending while onFinish runs, and does not finish when it rejects", async () => {
		let settle: (error?: Error) => void = () => {};
		const onFinish = vi.fn(
			() => new Promise<void>((resolve, reject) => (settle = (error) => (error ? reject(error) : resolve()))),
		);
		const flow = createStepper([{ id: "a" }], { onFinish });
		const failed = flow.next();
		expect([flow.isPending, flow.isFinished]).toEqual([true, false]);
		expect(await flow.next()).toEqual({ accepted: false, reason: "pending" });
		settle(new Error("offline"));
		await expect(failed).rejects.toThrow("offline");
		expect([flow.isPending, flow.isFinished]).toEqual([false, false]);
		const retried = flow.next();
		settle();
		expect(await retried).toMatchObject({ accepted: true, to: null });
		expect([flow.isPending, flow.isFinished]).toEqual([false, true]);
	});

	it("is cancelled by reset() while onFinish runs", async () => {
		const flow = createStepper([{ id: "a" }], { onFinish: () => new Promise((resolve) => setTimeout(resolve)) });
		const finishing = flow.next();
		flow.reset();
		expect(await finishing).toEqual({ accepted: false, reason: "cancelled" });
		expect(flow.isFinished).toBe(false);
	});
});
