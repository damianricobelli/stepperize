import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-svelte";
import { defineStepper } from "../lib/headless";
import { type Api, flow as shared } from "./fixtures/flow";
import Owner from "./fixtures/Owner.svelte";
import Scenario from "./fixtures/Scenario.svelte";

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
