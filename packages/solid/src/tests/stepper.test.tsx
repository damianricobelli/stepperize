import { createEffect, createMemo, createRoot, createSignal, onMount } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineStepper } from "../headless";
import { cleanup, render, settle } from "./render";

afterEach(cleanup);

const flow = defineStepper([
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
]);
type Api = ReturnType<typeof flow.useStepper>;

/** Run `useStepper` the way a component does: under an owner that can be disposed. */
function host<T>(setup: () => T) {
	return createRoot((dispose) => ({ result: setup(), dispose }));
}

describe("useStepper", () => {
	it("owns a flow and stays reactive through every change", async () => {
		const ids: string[] = [];
		const { result: stepper, dispose } = host(() => {
			const stepper = flow.useStepper();
			createEffect(() => ids.push(stepper.current.id));
			return stepper;
		});
		await settle();
		const first = stepper.snapshot();
		await stepper.next("draft");
		await settle();
		expect(ids).toEqual(["a", "b"]);
		expect(stepper.data).toEqual({ a: "draft" });
		expect(first.step).toBe("a");
		// Enumerable like the view it stands for.
		expect(Object.keys(stepper)).toContain("current");
		expect("next" in stepper).toBe(true);
		dispose();
	});

	it("renders in JSX and updates the DOM", async () => {
		let api!: Api;
		function Owner() {
			api = flow.useStepper();
			return <output>{api.current.title}</output>;
		}
		const { container } = render(() => <Owner />);
		expect(container.querySelector("output")?.textContent).toBe("A");
		await api.next();
		expect(container.querySelector("output")?.textContent).toBe("B");
	});

	it("starts from a snapshot and always calls the latest callbacks", async () => {
		const seen: string[] = [];
		const [tag, setTag] = createSignal("one");
		const { result: stepper, dispose } = host(() =>
			flow.useStepper(() => {
				const current = tag();
				return { snapshot: { step: "b" }, onChange: (snapshot) => seen.push(`${current}:${snapshot.step}`) };
			}),
		);
		expect(stepper.current.id).toBe("b");
		await settle();
		setTag("two");
		await settle();
		await stepper.next();
		expect(seen).toEqual(["two:c"]);
		dispose();
	});

	it("shows a change made while its children mount", async () => {
		function Child(props: { write: () => void }) {
			onMount(() => props.write());
			return null;
		}
		function Owner() {
			const stepper = flow.useStepper();
			return (
				<output>
					{String(stepper.data.a)}
					<Child write={() => stepper.setData("a", "early")} />
				</output>
			);
		}
		const { container } = render(() => <Owner />);
		await settle();
		expect(container.querySelector("output")?.textContent).toBe("early");
	});

	it("follows an option that shapes the view", async () => {
		const [linear, setLinear] = createSignal(true);
		const { result, dispose } = host(() => {
			const stepper = flow.useStepper(() => ({ linear: linear() }));
			return { stepper, reachable: createMemo(() => stepper.canGoTo("c")) };
		});
		expect(result.reachable()).toBe(false);
		await settle();
		setLinear(false);
		await settle();
		expect(result.reachable()).toBe(true);
		dispose();
	});

	it("stops updating once disposed", async () => {
		const changes = vi.fn();
		const { result: stepper, dispose } = host(() => {
			const stepper = flow.useStepper();
			createEffect(() => changes(stepper.current.id));
			return stepper;
		});
		await settle();
		changes.mockClear();
		const next = stepper.next;
		dispose();
		await next();
		await settle();
		expect(changes).not.toHaveBeenCalled();
	});

	it("uses the definition's defaults and lets an instance override them", () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }], { linear: true });
		const strict = host(() => linear.useStepper());
		expect(strict.result.canGoTo("b")).toBe(false);
		const free = host(() => linear.useStepper({ linear: false }));
		expect(free.result.canGoTo("b")).toBe(true);
		strict.dispose();
		free.dispose();
	});
});

describe("Provider and useStepperContext", () => {
	it("shares one flow, and a selector only changes when its result does", async () => {
		const changes = { step: 0, data: 0 };
		let api!: Api;
		function Step() {
			const id = flow.useStepperContext((s) => s.current.id);
			createEffect(() => {
				id();
				changes.step++;
			});
			return <output>{id()}</output>;
		}
		function Data() {
			api = flow.useStepperContext();
			createEffect(() => {
				void api.data;
				changes.data++;
			});
			return null;
		}
		const { container } = render(() => (
			<flow.Provider>
				<Step />
				<Data />
			</flow.Provider>
		));
		await settle();
		const before = { ...changes };
		api.setData("a", 1);
		await settle();
		expect(changes).toEqual({ step: before.step, data: before.data + 1 });
		await api.next();
		await settle();
		expect(changes.step).toBe(before.step + 1);
		expect(container.querySelector("output")?.textContent).toBe("b");
	});

	it("accepts a selector that builds a new object, and takes the options as props", async () => {
		const onChange = vi.fn();
		let selected!: () => { id: string; last: boolean };
		let api!: Api;
		function Probe() {
			selected = flow.useStepperContext((s) => ({ id: s.current.id, last: s.isLast }));
			api = flow.useStepperContext();
			return null;
		}
		render(() => (
			<flow.Provider snapshot={{ step: "c" }} onChange={onChange}>
				<Probe />
			</flow.Provider>
		));
		expect(selected()).toEqual({ id: "c", last: true });
		await settle();
		await api.prev();
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ step: "b" }));
	});

	it("throws a coded error outside its own Provider", () => {
		const other = defineStepper([{ id: "x" }]);
		function Probe() {
			flow.useStepperContext();
			return null;
		}
		expect(() =>
			render(() => (
				<other.Provider>
					<Probe />
				</other.Provider>
			)),
		).toThrow(/SZ100/);
	});
});

describe("step", () => {
	it("keeps the flow and a URL in sync in both directions", async () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { linear: true });
		const [param, setParam] = createSignal("c");
		const { result: api, dispose } = host(() =>
			linear.useStepper(() => ({
				step: param(),
				onChange: (snapshot) => {
					if (snapshot.step !== param()) setParam(snapshot.step);
				},
				onInvalidStep: (current) => {
					setParam(current);
				},
			})),
		);
		// A deep link to a step that is not reachable yet is corrected.
		await settle();
		expect([api.current.id, param()]).toEqual(["a", "a"]);
		// The flow moves: the URL follows.
		await api.next();
		await settle();
		expect([api.current.id, param()]).toEqual(["b", "b"]);
		// The URL moves (the back button): the flow follows.
		setParam("a");
		await settle();
		expect([api.current.id, param()]).toEqual(["a", "a"]);
		// A hand-edited URL is corrected too.
		setParam("nope");
		await settle();
		expect([api.current.id, param()]).toEqual(["a", "a"]);
		dispose();
	});
});

describe("create", () => {
	it("returns the same state machine without Solid", async () => {
		const standalone = flow.create({ snapshot: { step: "c" } });
		expect(standalone.current.id).toBe("c");
		expect(await standalone.next()).toMatchObject({ accepted: true, to: null });
	});
});
