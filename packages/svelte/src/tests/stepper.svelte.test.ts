import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-svelte";
import { defineStepper, fromFlow } from "../lib/headless";
import Controlled from "./fixtures/Controlled.svelte";
import { type Api, flow as shared } from "./fixtures/flow";
import ModuleReader from "./fixtures/ModuleReader.svelte";
import { listeners, flow as moduleFlow, stepper as moduleStepper, read } from "./fixtures/module.svelte";
import Owner from "./fixtures/Owner.svelte";
import Scenario from "./fixtures/Scenario.svelte";
import Timing from "./fixtures/Timing.svelte";

afterEach(cleanup);

const flow = defineStepper([
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
]);

/** Run `useStepper` the way a component does: inside an effect root that can be destroyed. */
function host<T>(setup: () => T) {
	let result!: T;
	const destroy = $effect.root(() => {
		result = setup();
	});
	flushSync();
	return { result, destroy };
}

describe("useStepper", () => {
	it("owns a flow and stays reactive through every change", async () => {
		const ids: string[] = [];
		const { result: stepper, destroy } = host(() => {
			const stepper = flow.useStepper();
			$effect(() => {
				ids.push(stepper.current.id);
			});
			return stepper;
		});
		const first = stepper.snapshot();
		await stepper.next("draft");
		flushSync();
		expect(ids).toEqual(["a", "b"]);
		expect(stepper.data).toEqual({ a: "draft" });
		expect(first.step).toBe("a");
		// Enumerable like the view it stands for.
		expect(Object.keys(stepper)).toContain("current");
		expect("next" in stepper).toBe(true);
		destroy();
	});

	it("only tells a reader about the state it read", () => {
		const ids = vi.fn();
		const { result: stepper, destroy } = host(() => {
			const stepper = flow.useStepper();
			$effect(() => ids(stepper.current.id));
			return stepper;
		});
		stepper.setData("a", { draft: 1 });
		flushSync();
		stepper.setData("a", { draft: 2 });
		flushSync();
		expect(ids).toHaveBeenCalledTimes(1);
		destroy();
	});

	it("lets an effect write to the flow without depending on it", () => {
		let name = $state("Ada");
		const runs = vi.fn();
		const { result: stepper, destroy } = host(() => {
			const stepper = flow.useStepper();
			$effect(() => {
				runs();
				// A new object every time: nothing short-circuits this write.
				stepper.setData("a", { name });
			});
			return stepper;
		});
		expect(runs).toHaveBeenCalledTimes(1);
		name = "Grace";
		flushSync();
		expect(runs).toHaveBeenCalledTimes(2);
		expect(stepper.data).toEqual({ a: { name: "Grace" } });
		destroy();
	});

	it("renders in markup and updates the DOM", async () => {
		let api!: Api;
		const screen = await render(Owner, { props: { ready: (stepper: Api) => (api = stepper) } });
		const output = screen.container.querySelector("output");
		expect(output?.textContent).toBe("First undefined");
		await api.next();
		await tick();
		expect(output?.textContent).toBe("Second undefined");
	});

	it("starts from a snapshot and always calls the latest callbacks", async () => {
		const seen: string[] = [];
		let tag = $state("one");
		const { result: stepper, destroy } = host(() =>
			flow.useStepper(() => {
				const current = tag;
				return { snapshot: { step: "b" }, onChange: (snapshot) => seen.push(`${current}:${snapshot.step}`) };
			}),
		);
		expect(stepper.current.id).toBe("b");
		tag = "two";
		flushSync();
		await stepper.next();
		expect(seen).toEqual(["two:c"]);
		destroy();
	});

	it("shows a change made before the owner's effects ran", async () => {
		const screen = await render(Owner, { props: { early: true } });
		await tick();
		expect(screen.container.querySelector("output")?.textContent).toBe("First early");
	});

	it("follows an option that shapes the view", () => {
		let linear = $state(true);
		const { result: stepper, destroy } = host(() => flow.useStepper(() => ({ linear })));
		expect(stepper.canGoTo("c")).toBe(false);
		linear = false;
		flushSync();
		expect(stepper.canGoTo("c")).toBe(true);
		destroy();
	});

	it("stops updating once destroyed", async () => {
		const changes = vi.fn();
		const { result: stepper, destroy } = host(() => {
			const stepper = flow.useStepper();
			$effect(() => changes(stepper.current.id));
			return stepper;
		});
		changes.mockClear();
		const next = stepper.next;
		destroy();
		await next();
		flushSync();
		expect(changes).not.toHaveBeenCalled();
	});

	it("applies new options before the effects of the components below run", async () => {
		const seen = vi.fn();
		const { rerender } = await render(Timing, { props: { tag: "one", seen } });
		// The child's effect moves the flow in the same flush the options changed in.
		await rerender({ tag: "two" });
		flushSync();
		expect(seen.mock.calls).toEqual([["two:second"]]);
	});

	it("destroys its flow when the component unmounts", async () => {
		let api!: Api;
		let release!: (allowed: boolean) => void;
		let signal!: AbortSignal;
		const onChange = vi.fn();
		const guard = (context: { signal: AbortSignal }) =>
			new Promise<boolean>((resolve) => {
				signal = context.signal;
				release = resolve;
			});
		const { unmount } = await render(Owner, {
			props: { options: { guard, onChange }, ready: (stepper: Api) => (api = stepper) },
		});
		const move = api.next();
		expect(api.isPending).toBe(true);
		unmount();
		// The running move is cancelled: its guard is told, and its late answer changes nothing.
		expect(signal.aborted).toBe(true);
		release(true);
		expect(await move).toMatchObject({ accepted: false, reason: "cancelled" });
		expect(onChange).not.toHaveBeenCalled();
	});

	it("throws a coded error that points to fromFlow when nothing owns the flow", () => {
		expect(() => flow.useStepper()).toThrow(/SZ104.*fromFlow/);
	});

	it("uses the definition's defaults and lets an instance override them", () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }], { linear: true });
		const strict = host(() => linear.useStepper());
		expect(strict.result.canGoTo("b")).toBe(false);
		const free = host(() => linear.useStepper({ linear: false }));
		expect(free.result.canGoTo("b")).toBe(true);
		strict.destroy();
		free.destroy();
	});
});

describe("Provider and useStepperContext", () => {
	it("shares one flow, and readers only update for what they read", async () => {
		let api!: Api;
		const seen = vi.fn();
		const { container } = await render(Scenario, {
			props: { name: "provider", ready: (stepper: Api) => (api = stepper), seen },
		});
		await tick();
		expect(seen.mock.calls).toEqual([["first"]]);
		api.setData("first", 1);
		flushSync();
		expect(api.data).toEqual({ first: 1 });
		await api.next();
		flushSync();
		expect(seen.mock.calls.map((call) => call[0])).toContain("second");
		expect(container.querySelector("output")?.textContent).toBe("second");
	});

	it("takes the flow options as props", async () => {
		const onChange = vi.fn();
		let api!: Api;
		await render(Scenario, {
			props: {
				name: "provider",
				options: { snapshot: { step: "third" }, onChange },
				ready: (stepper: Api) => (api = stepper),
			},
		});
		expect([api.current.id, api.isLast]).toEqual(["third", true]);
		await api.prev();
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ step: "second" }));
	});

	it("throws a coded error outside its own Provider", async () => {
		await expect(render(Scenario, { props: { name: "other-provider" } })).rejects.toThrow(/SZ100/);
		expect(shared.steps.length).toBe(3);
	});
});

describe("fromFlow", () => {
	it("follows a flow created outside any component, read in markup and in effects", async () => {
		moduleFlow.reset();
		const seen = vi.fn();
		const first = await render(ModuleReader, { props: { seen } });
		const second = await render(ModuleReader);
		const outputs = () => [first, second].map((screen) => screen.container.querySelector("output")?.textContent);
		expect(outputs()).toEqual(["first First 0", "first First 0"]);
		// One subscription for every reader, made by the effects that read it.
		expect(listeners.count).toBe(1);
		await moduleStepper.next();
		flushSync();
		expect(outputs()).toEqual(["second Second 1", "second Second 1"]);
		// Outside an effect a read is the latest state, with no subscription behind it.
		expect([moduleStepper.current.id, read()]).toEqual(["second", "Second"]);
		// Only told about what it read: a draft does not change `current`.
		moduleStepper.setData("second", "draft");
		flushSync();
		expect(seen.mock.calls.map((call) => call[0])).toEqual(["first", "second"]);
		first.unmount();
		second.unmount();
		await tick();
		await Promise.resolve();
		// The last reader is gone: so is the subscription.
		expect(listeners.count).toBe(0);
		await moduleStepper.prev();
		expect(moduleStepper.current.id).toBe("first");
	});

	it("needs no effect root, and keeps actions untracked", () => {
		const standalone = flow.create();
		const stepper = fromFlow(standalone);
		expect(stepper.current.id).toBe("a");
		const runs = vi.fn();
		const destroy = $effect.root(() => {
			$effect(() => {
				runs(stepper.isLast);
				// Writing from an effect does not make it depend on the flow.
				stepper.setData("a", { at: Date.now() });
			});
		});
		flushSync();
		standalone.setData("a", "elsewhere");
		flushSync();
		expect(runs).toHaveBeenCalledTimes(1);
		void standalone.goTo("c");
		flushSync();
		expect(runs.mock.calls).toEqual([[false], [true]]);
		destroy();
		standalone.destroy();
	});
});

describe("Provider and Root options as props", () => {
	it("a Provider follows step and linear, and reports a step it cannot follow", async () => {
		let api!: Api;
		const onInvalidStep = vi.fn();
		const { rerender } = await render(Controlled, {
			props: { provider: true, step: "second", onInvalidStep, ready: (stepper: Api) => (api = stepper) },
		});
		await tick();
		expect(api.current.id).toBe("second");
		await rerender({ step: "third" });
		await tick();
		expect(api.current.id).toBe("third");
		await rerender({ step: "nope" });
		await tick();
		expect(onInvalidStep).toHaveBeenCalledWith("third");
		await rerender({ step: "first" });
		await tick();
		expect(api.current.id).toBe("first");
		// `linear` changes what can be reached, without a new flow.
		await rerender({ linear: true });
		expect([api.isLinear, api.canGoTo("third")]).toEqual([true, false]);
		// Under `linear`, a step that was never completed cannot be followed.
		await rerender({ step: "third" });
		await tick();
		expect(api.current.id).toBe("first");
		expect(onInvalidStep).toHaveBeenLastCalledWith("first");
		await rerender({ linear: false });
		expect([api.isLinear, api.canGoTo("third")]).toEqual([false, true]);
	});
});

describe("step", () => {
	it("keeps the flow and a URL in sync in both directions", async () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { linear: true });
		let param = $state("c");
		const { result: api, destroy } = host(() =>
			linear.useStepper(() => ({
				step: param,
				onChange: (snapshot) => {
					if (snapshot.step !== param) param = snapshot.step;
				},
				onInvalidStep: (current) => {
					param = current;
				},
			})),
		);
		const settle = async () => {
			flushSync();
			await Promise.resolve();
			await tick();
			flushSync();
		};
		// A deep link to a step that is not reachable yet is corrected.
		await settle();
		expect([api.current.id, param]).toEqual(["a", "a"]);
		// The flow moves: the URL follows.
		await api.next();
		await settle();
		expect([api.current.id, param]).toEqual(["b", "b"]);
		// The URL moves (the back button): the flow follows.
		param = "a";
		await settle();
		expect([api.current.id, param]).toEqual(["a", "a"]);
		// A hand-edited URL is corrected too.
		param = "nope";
		await settle();
		expect([api.current.id, param]).toEqual(["a", "a"]);
		destroy();
	});
});

describe("create", () => {
	it("returns the same state machine without Svelte", async () => {
		const standalone = flow.create({ snapshot: { step: "c" } });
		expect(standalone.current.id).toBe("c");
		expect(await standalone.next()).toMatchObject({ accepted: true, to: null });
	});
});
