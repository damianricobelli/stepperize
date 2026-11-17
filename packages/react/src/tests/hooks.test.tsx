import { StrictMode, useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook } from "vitest-browser-react";
import { defineStepper } from "../headless";
import { act } from "./act";

afterEach(cleanup);

const flow = defineStepper([
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
]);

describe("useStepper", () => {
	it("owns a flow and re-renders with a new immutable view on every change", async () => {
		const { result } = await renderHook(() => flow.useStepper());
		const first = result.current;
		await act(async () => {
			await first.next("draft");
		});
		expect(result.current).not.toBe(first);
		expect(result.current.current.id).toBe("b");
		expect(result.current.data).toEqual({ a: "draft" });
		expect(first.current.id).toBe("a");
	});

	it("starts from a snapshot and always calls the latest callbacks", async () => {
		const seen: string[] = [];
		const { result, rerender } = await renderHook(
			(props?: { tag: string }) =>
				flow.useStepper({
					snapshot: { step: "b" },
					onChange: (snapshot) => seen.push(`${props?.tag}:${snapshot.step}`),
				}),
			{ initialProps: { tag: "one" } },
		);
		expect(result.current.current.id).toBe("b");
		await rerender({ tag: "two" });
		await act(async () => {
			await result.current.next();
		});
		expect(seen).toEqual(["two:c"]);
	});

	it("keeps working under StrictMode", async () => {
		const { result } = await renderHook(() => flow.useStepper(), { wrapper: StrictMode });
		await act(async () => {
			await result.current.next();
		});
		expect(result.current.current.id).toBe("b");
	});

	it("shows a change made before it subscribed", async () => {
		function Child({ write }: { write: () => void }) {
			// A child's layout effect runs before its parent's, so before the hook subscribes.
			useLayoutEffect(write, []);
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
		const strict = await render(<Owner />, { wrapper: StrictMode });
		await expect.element(strict.getByRole("status")).toHaveTextContent("early");
	});

	it("re-renders when an option that shapes the view changes", async () => {
		const { result, rerender } = await renderHook((props?: { linear: boolean }) => flow.useStepper(props), {
			initialProps: { linear: true },
		});
		expect(result.current.canGoTo("c")).toBe(false);
		await rerender({ linear: false });
		expect(result.current.canGoTo("c")).toBe(true);
	});

	it("stops updating once unmounted", async () => {
		const renders = vi.fn();
		const { result, unmount } = await renderHook(() => {
			renders();
			return flow.useStepper();
		});
		const stepper = result.current;
		await unmount();
		renders.mockClear();
		await stepper.next();
		expect(renders).not.toHaveBeenCalled();
	});

	it("uses the definition's defaults and lets an instance override them", async () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }], { linear: true });
		const strict = await renderHook(() => linear.useStepper());
		expect(strict.result.current.canGoTo("b")).toBe(false);
		const free = await renderHook(() => linear.useStepper({ linear: false }));
		expect(free.result.current.canGoTo("b")).toBe(true);
	});
});

describe("Provider and useStepperContext", () => {
	it("shares one flow, and a selector only re-renders when its result changes", async () => {
		const renders = { step: 0, data: 0 };
		let api!: ReturnType<typeof flow.useStepper>;
		function Step() {
			renders.step++;
			return <output>{flow.useStepperContext((s) => s.current.id)}</output>;
		}
		function Data() {
			renders.data++;
			api = flow.useStepperContext();
			return null;
		}
		const { container } = await render(
			<flow.Provider>
				<Step />
				<Data />
			</flow.Provider>,
		);
		const before = { ...renders };
		await act(() => api.setData("a", 1));
		expect(renders.step).toBe(before.step);
		expect(renders.data).toBe(before.data + 1);
		await act(async () => {
			await api.next();
		});
		expect(container.querySelector("output")?.textContent).toBe("b");
	});

	it("accepts a selector that builds a new object", async () => {
		let api!: { id: string; last: boolean };
		function Probe() {
			api = flow.useStepperContext((s) => ({ id: s.current.id, last: s.isLast }));
			return null;
		}
		await render(
			<flow.Provider snapshot={{ step: "c" }}>
				<Probe />
			</flow.Provider>,
		);
		expect(api).toEqual({ id: "c", last: true });
	});

	it("throws a coded error outside its own Provider", async () => {
		const other = defineStepper([{ id: "x" }]);
		function Probe() {
			flow.useStepperContext();
			return null;
		}
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(
			render(
				<other.Provider>
					<Probe />
				</other.Provider>,
			),
		).rejects.toThrow(/SZ100/);
		error.mockRestore();
	});
});

describe("step", () => {
	it("keeps the flow and a URL in sync in both directions", async () => {
		const linear = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }], { linear: true });
		const url = { value: "c", set: (_step: string) => {} };
		let api!: ReturnType<typeof linear.useStepper>;
		function Page() {
			const [param, setParam] = useState(url.value);
			url.value = param;
			url.set = setParam;
			api = linear.useStepper({
				step: param,
				onChange: (snapshot) => snapshot.step !== param && setParam(snapshot.step),
				onInvalidStep: setParam,
			});
			return null;
		}
		// A deep link to a step that is not reachable yet is corrected.
		await render(<Page />);
		expect([api.current.id, url.value]).toEqual(["a", "a"]);
		// The flow moves: the URL follows.
		await act(async () => {
			await api.next();
		});
		expect([api.current.id, url.value]).toEqual(["b", "b"]);
		// The URL moves (the back button): the flow follows.
		await act(async () => url.set("a"));
		expect([api.current.id, url.value]).toEqual(["a", "a"]);
		// A hand-edited URL is corrected too.
		await act(async () => url.set("nope"));
		expect([api.current.id, url.value]).toEqual(["a", "a"]);
	});
});

describe("create", () => {
	it("returns the same state machine without React", async () => {
		const standalone = flow.create({ snapshot: { step: "c" } });
		expect(standalone.current.id).toBe("c");
		expect(await standalone.next()).toMatchObject({ accepted: true, to: null });
	});
});
