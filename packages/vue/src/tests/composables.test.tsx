import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-vue";
import { computed, defineComponent, effectScope, nextTick, onMounted, ref, watch } from "vue";
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
