import { batch, createEffect, createMemo, createResource, createRoot, createSignal, onMount, Suspense } from "solid-js";
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

	it("only tells a reader about the state it read", async () => {
		const ids = vi.fn();
		const { result: stepper, dispose } = host(() => {
			const stepper = flow.useStepper();
			createEffect(() => ids(stepper.current.id));
			return stepper;
		});
		await settle();
		stepper.setData("a", { draft: 1 });
		stepper.setData("a", { draft: 2 });
		await settle();
		expect(ids).toHaveBeenCalledTimes(1);
		dispose();
	});

	it("lets an effect write to the flow without depending on it", async () => {
		const [name, setName] = createSignal("Ada");
		const runs = vi.fn();
		const { result: stepper, dispose } = host(() => {
			const stepper = flow.useStepper();
			createEffect(() => {
				runs();
				// A new object every time: nothing short-circuits this write.
				stepper.setData("a", { name: name() });
			});
			return stepper;
		});
		await settle();
		expect(runs).toHaveBeenCalledTimes(1);
		setName("Grace");
		await settle();
		expect(runs).toHaveBeenCalledTimes(2);
		expect(stepper.data).toEqual({ a: { name: "Grace" } });
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

	it("calls a callback changed in the same batch as the action", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const [onChange, setOnChange] = createSignal(first);
		const [guard, setGuard] = createSignal<() => boolean>(() => true);
		const { result: stepper, dispose } = host(() => flow.useStepper(() => ({ onChange: onChange(), guard: guard() })));
		await settle();
		let moved!: Promise<unknown>;
		batch(() => {
			setOnChange(() => second);
			moved = stepper.next();
		});
		await moved;
		expect([first.mock.calls.length, second.mock.calls.length]).toEqual([0, 1]);
		batch(() => {
			setGuard(() => () => false);
			moved = stepper.next();
		});
		expect(await moved).toMatchObject({ accepted: false, reason: "guard" });
		dispose();
	});

	it("calls the latest callbacks under a Suspense that is still loading, where effects wait", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const [onChange, setOnChange] = createSignal(first);
		const [step, setStep] = createSignal<"a" | "b" | "c">("a");
		let api!: Api;
		function Loading() {
			const [never] = createResource(() => new Promise<string>(() => {}));
			api = flow.useStepper(() => ({ onChange: onChange(), step: step() }));
			return <span>{never()}</span>;
		}
		const { container } = render(() => (
			<Suspense fallback={<p>Loading</p>}>
				<Loading />
			</Suspense>
		));
		await settle();
		expect(container.textContent).toBe("Loading");
		setOnChange(() => second);
		await api.next();
		expect([first.mock.calls.length, second.mock.calls.length]).toEqual([0, 1]);
		// `step` is pushed by an effect, which Solid holds until the boundary resolves.
		setStep("c");
		await settle();
		expect(api.current.id).toBe("b");
	});

	it("cancels a running move when its owner is disposed", async () => {
		let release!: (allowed: boolean) => void;
		let signal!: AbortSignal;
		const { result: stepper, dispose } = host(() =>
			flow.useStepper({
				guard: (context) => {
					signal = context.signal;
					return new Promise<boolean>((resolve) => {
						release = resolve;
					});
				},
			}),
		);
		const moving = stepper.next();
		expect(stepper.isPending).toBe(true);
		dispose();
		// The guard's `fetch` would be aborted; one that settles anyway changes nothing.
		expect(signal.aborted).toBe(true);
		release(true);
		expect(await moving).toMatchObject({ accepted: false, reason: "cancelled" });
		expect(stepper.current.id).toBe("a");
	});

	it("uses the definition's defaults and lets an instance override them", () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }], { linear: true });
		const strict = host(() => linear.useStepper());
		expect(strict.result.canGoTo("b")).toBe(false);
		const free = host(() => linear.useStepper({ linear: false }));
		expect(free.result.canGoTo("b")).toBe(true);
		// An absent option, like an absent prop, keeps the default.
		const unset = host(() => linear.useStepper({ linear: undefined }));
		expect(unset.result.isLinear).toBe(true);
		strict.dispose();
		free.dispose();
		unset.dispose();
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

	it("nested Providers: each component reads the nearest flow of its own definition", async () => {
		const other = defineStepper([{ id: "x" }, { id: "y" }]);
		const seen: Record<string, () => string> = {};
		function Probe(props: { name: string }) {
			const stepper = flow.useStepperContext();
			seen[props.name] = () => stepper.current.id;
			return null;
		}
		function OtherProbe() {
			const stepper = other.useStepperContext();
			seen.other = () => stepper.current.id;
			return null;
		}
		render(() => (
			<flow.Provider snapshot={{ step: "b" }}>
				<Probe name="outer" />
				<other.Provider snapshot={{ step: "y" }}>
					<flow.Provider snapshot={{ step: "c" }}>
						<Probe name="inner" />
						<OtherProbe />
					</flow.Provider>
				</other.Provider>
			</flow.Provider>
		));
		expect([seen.outer(), seen.inner(), seen.other()]).toEqual(["b", "c", "y"]);
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
