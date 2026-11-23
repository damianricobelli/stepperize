import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-vue";
import {
	computed,
	createApp,
	defineComponent,
	effectScope,
	h,
	KeepAlive,
	markRaw,
	nextTick,
	onMounted,
	onUpdated,
	reactive,
	readonly,
	ref,
	Suspense,
	shallowRef,
	toRaw,
	toRef,
	toRefs,
	watch,
} from "vue";
import { defineStepper } from "../headless";

afterEach(cleanup);

const flow = defineStepper([
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
]);
type Api = ReturnType<typeof flow.useStepper>;

/** Run a composable inside a mounted component. */
async function mount<T>(setup: () => T) {
	let result!: T;
	const rendered = await render(
		defineComponent({
			setup() {
				result = setup();
				return () => null;
			},
		}),
	);
	return { result, ...rendered };
}

describe("useStepper", () => {
	it("owns a flow and stays reactive through every change", async () => {
		const { result: stepper } = await mount(() => flow.useStepper());
		const id = computed(() => stepper.current.id);
		const first = stepper.snapshot();
		await stepper.next("draft");
		expect(id.value).toBe("b");
		expect(stepper.data).toEqual({ a: "draft" });
		expect(first.step).toBe("a");
		// Enumerable like the view it stands for.
		expect(Object.keys(stepper)).toContain("current");
		expect("next" in stepper).toBe(true);
	});

	it("only tells a reader about the state it read", async () => {
		const { result: stepper } = await mount(() => flow.useStepper());
		const runs = vi.fn();
		const id = computed(() => {
			runs();
			return stepper.current.id;
		});
		expect(id.value).toBe("a");
		stepper.setData("a", { draft: 1 });
		stepper.setData("a", { draft: 2 });
		await nextTick();
		expect(id.value).toBe("a");
		expect(runs).toHaveBeenCalledTimes(1);
	});

	it("calls the callback of this moment, not of the last flush", async () => {
		const tag = ref("one");
		const seen: string[] = [];
		const { result: stepper } = await mount(() =>
			flow.useStepper(() => ({ onChange: (snapshot) => seen.push(`${tag.value}:${snapshot.step}`) })),
		);
		tag.value = "two";
		await stepper.next();
		expect(seen).toEqual(["two:b"]);
	});

	it("refuses an assignment instead of breaking later reads", async () => {
		const { result: stepper } = await mount(() => flow.useStepper());
		expect(Reflect.set(stepper, "index", 2)).toBe(false);
		expect(Reflect.deleteProperty(stepper, "current")).toBe(false);
		// Modules are strict: a plain assignment throws, and the stepper is unchanged.
		expect(() => {
			(stepper as { index: number }).index = 2;
		}).toThrow(TypeError);
		expect(stepper.index).toBe(0);
		expect(stepper.current.id).toBe("a");
	});

	it("is not wrapped by reactive(), ref() or a store, so data keeps its identity and the flow its state", async () => {
		const { result: stepper } = await mount(() => flow.useStepper());
		// A setup store (Pinia's shape): the stepper next to its own state, all made reactive.
		const store = reactive({ stepper, count: ref(0) });
		const draft = { name: "Ada" };
		store.stepper.setData("a", draft);
		expect(store.stepper).toBe(stepper);
		expect(toRaw(store).stepper).toBe(stepper);
		expect(store.stepper.data.a).toBe(draft);
		expect(ref(stepper).value).toBe(stepper);
		expect(shallowRef(stepper).value).toBe(stepper);
		expect(readonly({ stepper }).stepper).toBe(stepper);
		expect(markRaw(stepper)).toBe(stepper);
		const late = reactive({ stepper: null as typeof stepper | null });
		late.stepper = stepper;
		expect(late.stepper).toBe(stepper);
		// Completion survives the wrapping: the store's stepper is the flow's.
		const id = computed(() => store.stepper.current.id);
		await store.stepper.next(draft);
		expect([id.value, store.stepper.state("a"), stepper.state("a")]).toEqual(["b", "complete", "complete"]);
		expect(store.stepper.data.a).toBe(draft);
	});

	it("is not a watch source: Vue warns and the callback never runs; a getter is followed", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const whole = vi.fn();
		const index = vi.fn();
		const { result: stepper } = await mount(() => {
			const stepper = flow.useStepper();
			watch(stepper, whole, { flush: "sync" });
			watch(() => stepper.index, index, { flush: "sync" });
			return stepper;
		});
		expect(warn.mock.calls.some((call) => String(call[0]).includes("Invalid watch source"))).toBe(true);
		await stepper.next();
		expect(whole).not.toHaveBeenCalled();
		expect(index).toHaveBeenCalledWith(1, 0, expect.anything());
		warn.mockRestore();
	});

	it("toRef and toRefs give refs that follow the flow", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { result: stepper } = await mount(() => flow.useStepper());
		const { index, current } = toRefs(stepper);
		const last = toRef(() => stepper.isLast);
		const isFirst = toRef(stepper, "isFirst");
		await stepper.goTo("c");
		expect([index.value, current.value.id, last.value, isFirst.value]).toEqual([2, "c", true, false]);
		warn.mockRestore();
	});

	it("sees an option changed in the same tick as an action", async () => {
		const linear = ref(true);
		const { result: stepper } = await mount(() => flow.useStepper(() => ({ linear: linear.value })));
		expect(stepper.canGoTo("c")).toBe(false);
		linear.value = false;
		expect(await stepper.goTo("c")).toMatchObject({ accepted: true });
		// And a step that changed is followed before the action runs.
		const step = ref<string>("c");
		const followed = await mount(() => flow.useStepper(() => ({ step: step.value })));
		await nextTick();
		step.value = "a";
		await followed.result.next();
		expect(followed.result.current.id).toBe("b");
	});

	it("renders a reader once per step change", async () => {
		let renders = 0;
		let api!: Api;
		await render(
			defineComponent({
				setup() {
					api = flow.useStepper();
					onUpdated(() => renders++);
					return () => (
						<output>
							{api.current.title} {api.index}
						</output>
					);
				},
			}),
		);
		await api.next();
		await nextTick();
		expect(renders).toBe(1);
		api.setData("b", "draft");
		await nextTick();
		expect(renders).toBe(1);
		await api.goTo("a");
		await nextTick();
		expect(renders).toBe(2);
	});

	it("renders the flow in a template and updates the DOM", async () => {
		let api!: Api;
		const screen = await render(
			defineComponent({
				setup() {
					api = flow.useStepper();
					return () => <output>{api.current.title}</output>;
				},
			}),
		);
		await expect.element(screen.getByRole("status")).toHaveTextContent("A");
		await api.next();
		await expect.element(screen.getByRole("status")).toHaveTextContent("B");
	});

	it("starts from a snapshot and always calls the latest callbacks", async () => {
		const seen: string[] = [];
		const tag = ref("one");
		const { result: stepper } = await mount(() =>
			flow.useStepper(() => {
				const current = tag.value;
				return { snapshot: { step: "b" }, onChange: (snapshot) => seen.push(`${current}:${snapshot.step}`) };
			}),
		);
		expect(stepper.current.id).toBe("b");
		tag.value = "two";
		await nextTick();
		await stepper.next();
		expect(seen).toEqual(["two:c"]);
	});

	it("shows a change made before the owner mounted", async () => {
		const Child = defineComponent({
			props: { write: { type: Function, required: true } },
			setup(props) {
				// A child mounts before its parent.
				onMounted(() => props.write());
				return () => null;
			},
		});
		const screen = await render(
			defineComponent({
				setup() {
					const stepper = flow.useStepper();
					return () => (
						<output>
							{String(stepper.data.a)}
							<Child write={() => stepper.setData("a", "early")} />
						</output>
					);
				},
			}),
		);
		await expect.element(screen.getByRole("status")).toHaveTextContent("early");
	});

	it("follows an option that shapes the view", async () => {
		const linear = ref(true);
		const { result: stepper } = await mount(() => flow.useStepper(() => ({ linear: linear.value })));
		const reachable = computed(() => stepper.canGoTo("c"));
		expect(reachable.value).toBe(false);
		linear.value = false;
		await nextTick();
		expect(reachable.value).toBe(true);
	});

	it("stops updating once unmounted", async () => {
		const changes = vi.fn();
		const { result: stepper, unmount } = await mount(() => {
			const stepper = flow.useStepper();
			watch(() => stepper.current.id, changes, { flush: "sync" });
			return stepper;
		});
		const next = stepper.next;
		await unmount();
		await next();
		expect(changes).not.toHaveBeenCalled();
	});

	it("uses the definition's defaults and lets an instance override them", async () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }], { linear: true });
		const strict = await mount(() => linear.useStepper());
		expect(strict.result.canGoTo("b")).toBe(false);
		const free = await mount(() => linear.useStepper({ linear: false }));
		expect(free.result.canGoTo("b")).toBe(true);
	});

	it("works in an effect scope outside a component and is destroyed with it", async () => {
		const scope = effectScope();
		const stepper = scope.run(() => flow.useStepper({ snapshot: { step: "b" } })) as Api;
		const id = computed(() => stepper.current.id);
		expect(id.value).toBe("b");
		await stepper.next();
		expect(id.value).toBe("c");
		const prev = stepper.prev;
		scope.stop();
		await prev();
		expect(id.value).toBe("c");
	});
});

describe("ownership", () => {
	const ownerless = (message: unknown) => String(message).includes("without a component instance or an effect scope");

	it("warns when nothing owns the flow: after an `await` in a hand-written async setup", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const Async = defineComponent({
			async setup() {
				// Fine before the await.
				flow.useStepper();
				await Promise.resolve();
				const late = flow.useStepper();
				return () => <output>{late.current.id}</output>;
			},
		});
		// Mounted with `createApp`: Vue Test Utils' wrapper never resolves a Suspense it did not create.
		const container = document.body.appendChild(document.createElement("div"));
		const app = createApp(() => h(Suspense, null, { default: () => h(Async) }));
		app.mount(container);
		await expect.poll(() => container.textContent).toBe("a");
		expect(warn.mock.calls.filter((call) => ownerless(call[0]))).toHaveLength(1);
		app.unmount();
		container.remove();
		warn.mockRestore();
	});

	it("does not warn in a component or an effect scope", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await mount(() => flow.useStepper());
		const scope = effectScope();
		scope.run(() => flow.useStepper());
		scope.stop();
		expect(warn.mock.calls.some((call) => ownerless(call[0]))).toBe(false);
		warn.mockRestore();
	});

	it("under KeepAlive, stops following `step` while deactivated and catches up when activated", async () => {
		const step = ref("b");
		const onInvalidStep = vi.fn();
		let api!: Api;
		const Page = defineComponent({
			name: "CheckoutPage",
			setup() {
				api = flow.useStepper(() => ({ step: step.value, onInvalidStep }));
				return () => <output>{api.current.id}</output>;
			},
		});
		const shown = ref(true);
		await render(() => h(KeepAlive, null, shown.value ? h(Page) : h("p", "elsewhere")));
		await nextTick();
		expect(api.current.id).toBe("b");
		shown.value = false;
		await nextTick();
		// Another page's route: the kept-alive flow neither follows it nor corrects it.
		step.value = "nope";
		await nextTick();
		step.value = "c";
		await nextTick();
		expect(api.current.id).toBe("b");
		expect(onInvalidStep).not.toHaveBeenCalled();
		shown.value = true;
		await nextTick();
		await nextTick();
		expect(api.current.id).toBe("c");
	});
});

describe("Provider and useStepperContext", () => {
	it("shares one flow, and a selector only changes when its result does", async () => {
		const changes = { step: 0, data: 0 };
		let api!: Api;
		const Step = defineComponent({
			setup() {
				const id = flow.useStepperContext((s) => s.current.id);
				watch(id, () => changes.step++, { flush: "sync" });
				return () => <output>{id.value}</output>;
			},
		});
		const Data = defineComponent({
			setup() {
				api = flow.useStepperContext();
				watch(
					() => api.data,
					() => changes.data++,
					{ flush: "sync" },
				);
				return () => null;
			},
		});
		const { container } = await render(() => (
			<flow.Provider>
				<Step />
				<Data />
			</flow.Provider>
		));
		api.setData("a", 1);
		expect(changes).toEqual({ step: 0, data: 1 });
		await api.next();
		await nextTick();
		expect(changes.step).toBe(1);
		expect(container.querySelector("output")?.textContent).toBe("b");
	});

	it("accepts a selector that builds a new object", async () => {
		let api!: { id: string; last: boolean };
		const Probe = defineComponent({
			setup() {
				api = flow.useStepperContext((s) => ({ id: s.current.id, last: s.isLast })).value;
				return () => null;
			},
		});
		await render(() => (
			<flow.Provider snapshot={{ step: "c" }}>
				<Probe />
			</flow.Provider>
		));
		expect(api).toEqual({ id: "c", last: true });
	});

	it("takes its callbacks as listeners", async () => {
		const onChange = vi.fn();
		let api!: Api;
		const Probe = defineComponent({
			setup() {
				api = flow.useStepperContext();
				return () => null;
			},
		});
		await render(() => (
			<flow.Provider onChange={onChange}>
				<Probe />
			</flow.Provider>
		));
		await api.next();
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ step: "b" }));
	});

	it("merges listeners handed over as an array", async () => {
		const first = vi.fn();
		const second = vi.fn();
		let api!: Api;
		const Probe = defineComponent({
			setup() {
				api = flow.useStepperContext();
				return () => null;
			},
		});
		await render(() => h(flow.Provider, { onChange: [first, second] } as never, () => h(Probe)));
		await api.next();
		expect([first.mock.calls.length, second.mock.calls.length]).toEqual([1, 1]);
	});

	it("nested Providers: each composable reads the nearest Provider of its own definition", async () => {
		const other = defineStepper([{ id: "x" }, { id: "y" }]);
		const seen: string[] = [];
		const Probe = defineComponent({
			props: { name: { type: String, required: true } },
			setup(props) {
				const mine = flow.useStepperContext();
				const theirs = other.useStepperContext();
				return () => {
					seen.push(`${props.name}:${mine.current.id}${theirs.current.id}`);
					return null;
				};
			},
		});
		await render(() => (
			<flow.Provider snapshot={{ step: "b" }}>
				<other.Provider snapshot={{ step: "y" }}>
					<Probe name="outer" />
					<flow.Provider snapshot={{ step: "c" }}>
						<Probe name="inner" />
					</flow.Provider>
				</other.Provider>
			</flow.Provider>
		));
		expect(seen).toEqual(["outer:by", "inner:cy"]);
	});

	it("throws a coded error outside its own Provider", async () => {
		const other = defineStepper([{ id: "x" }]);
		const Probe = defineComponent({
			setup() {
				flow.useStepperContext();
				return () => null;
			},
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(
			render(() => (
				<other.Provider>
					<Probe />
				</other.Provider>
			)),
		).rejects.toThrow(/SZ100/);
		warn.mockRestore();
	});
});

describe("step", () => {
	it("keeps the flow and a URL in sync in both directions", async () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { linear: true });
		const param = ref("c");
		const { result: api } = await mount(() =>
			linear.useStepper(() => ({
				step: param.value,
				onChange: (snapshot) => {
					if (snapshot.step !== param.value) param.value = snapshot.step;
				},
				onInvalidStep: (current) => {
					param.value = current;
				},
			})),
		);
		const settle = async () => {
			await nextTick();
			await Promise.resolve();
			await nextTick();
		};
		// A deep link to a step that is not reachable yet is corrected.
		await settle();
		expect([api.current.id, param.value]).toEqual(["a", "a"]);
		// The flow moves: the URL follows.
		await api.next();
		await settle();
		expect([api.current.id, param.value]).toEqual(["b", "b"]);
		// The URL moves (the back button): the flow follows.
		param.value = "a";
		await settle();
		expect([api.current.id, param.value]).toEqual(["a", "a"]);
		// A hand-edited URL is corrected too.
		param.value = "nope";
		await settle();
		expect([api.current.id, param.value]).toEqual(["a", "a"]);
	});
});

describe("create", () => {
	it("returns the same state machine without Vue", async () => {
		const standalone = flow.create({ snapshot: { step: "c" } });
		expect(standalone.current.id).toBe("c");
		expect(await standalone.next()).toMatchObject({ accepted: true, to: null });
	});
});
