import React, { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { cleanup, render, renderHook } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";
import { act } from "./act";

const flow = defineStepper([
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
]);
type Api = ReturnType<typeof flow.useStepper>;
afterEach(cleanup);
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
async function mount(options: React.ComponentProps<typeof flow.Provider> = {}) {
	let api!: Api;
	function Probe() {
		api = flow.useStepperContext();
		return null;
	}
	const rendered = await render(
		<flow.Provider {...options}>
			<Probe />
		</flow.Provider>,
	);
	return {
		...rendered,
		get api() {
			return api;
		},
	};
}

describe("explicit ownership and subscriptions", () => {
	it("local hooks remain independent inside a Provider", async () => {
		let shared!: Api;
		let local!: Api;
		function Probe() {
			shared = flow.useStepperContext();
			local = flow.useStepper({ defaultStep: "b" });
			return null;
		}
		await render(
			<flow.Provider>
				<Probe />
			</flow.Provider>,
		);
		await act(async () => {
			await local.next();
		});
		expect([shared.id, local.id]).toEqual(["a", "c"]);
	});
	it("reports a missing provider for the correct definition", async () => {
		const other = defineStepper([{ id: "other" }]);
		function Probe() {
			flow.useStepperContext();
			return null;
		}
		await expect(
			render(
				<other.Provider>
					<Probe />
				</other.Provider>,
			),
		).rejects.toThrow("Missing Stepper.Provider for this definition");
	});
	it("isolates nested definitions, including their primitive actions", async () => {
		const outer = defineStepper([{ id: "a" }, { id: "b" }]);
		const inner = defineStepper([{ id: "x" }, { id: "y" }]);
		function Probe() {
			return (
				<>
					<span data-testid="outer">{outer.useStepperContext((s) => s.id)}</span>
					<span data-testid="inner">{inner.useStepperContext((s) => s.id)}</span>
					<outer.Stepper.Next>outer next</outer.Stepper.Next>
				</>
			);
		}
		await render(
			<outer.Provider>
				<inner.Provider>
					<Probe />
				</inner.Provider>
			</outer.Provider>,
		);
		await userEvent.click(screen.getByText("outer next").element());
		expect(screen.getByTestId("outer").element().textContent).toBe("b");
		expect(screen.getByTestId("inner").element().textContent).toBe("x");
	});
	it("supports object selections, changing selectors and custom equality", async () => {
		let api!: Api;
		let renders = 0;
		function Probe({ target }: { target: "a" | "b" }) {
			const selected = flow.useStepperContext(
				(s) => ({ value: s.is(target) }),
				(a, b) => a.value === b.value,
			);
			renders++;
			return <span>{String(selected.value)}</span>;
		}
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		const m = await render(
			<flow.Provider>
				<Grab />
				<Probe target="a" />
			</flow.Provider>,
		);
		const before = renders;
		await act(() => api.data.set("a", 42));
		expect(renders).toBe(before);
		await m.rerender(
			<flow.Provider>
				<Grab />
				<Probe target="b" />
			</flow.Provider>,
		);
		expect(screen.getByText("false").element()).toBeDefined();
		await act(async () => {
			await api.next();
		});
		expect(screen.getByText("true").element()).toBeDefined();
	});
	it("does not notify a primitive selector for unrelated data writes", async () => {
		let api!: Api;
		let renders = 0;
		function Probe() {
			renders++;
			return <span>{flow.useStepperContext((s) => s.id)}</span>;
		}
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		await render(
			<flow.Provider>
				<Grab />
				<Probe />
			</flow.Provider>,
		);
		const before = renders;
		await act(() => api.data.set("a", 1));
		expect(renders).toBe(before);
	});
	it("preserves identity while updating inline callbacks", async () => {
		let api!: Api;
		const seen = new Set<Api>();
		const calls: number[] = [];
		const Probe = React.memo(function Probe() {
			api = flow.useStepperContext();
			seen.add(api);
			return null;
		});
		function Parent({ count }: { count: number }) {
			return (
				<flow.Provider onStepChange={() => calls.push(count)}>
					<Probe />
				</flow.Provider>
			);
		}
		const m = await render(<Parent count={0} />);
		await m.rerender(<Parent count={1} />);
		expect(seen.size).toBe(1);
		await act(async () => {
			await api.next();
		});
		expect(calls).toEqual([1]);
	});
});

describe("atomic writes and navigation", () => {
	it("composes data, updater and completion writes in one event", async () => {
		const m = await mount();
		await act(() => {
			m.api.data.set("a", 1);
			m.api.data.set("b", 2);
			m.api.data.update("a", (previous) => Number(previous) + 1);
			m.api.setComplete("a");
			m.api.setComplete("b");
		});
		expect(m.api.data.all()).toEqual({ a: 2, b: 2 });
		expect(m.api.completed).toEqual(["a", "b"]);
	});
	it("accumulates controlled requests without changing authoritative reads", async () => {
		const onDataChange = vi.fn();
		const onCompletedChange = vi.fn();
		const m = await mount({ data: {}, completed: [], onDataChange, onCompletedChange });
		await act(() => {
			m.api.data.set("a", 1);
			m.api.data.set("b", 2);
			m.api.setComplete("a");
			m.api.setComplete("b");
		});
		expect(onDataChange).toHaveBeenLastCalledWith({ a: 1, b: 2 });
		expect(onCompletedChange).toHaveBeenLastCalledWith(["a", "b"]);
		expect(m.api.data.all()).toEqual({});
		expect(m.api.completed).toEqual([]);
	});
	it("saves, completes the source and moves in one accepted transition", async () => {
		const m = await mount();
		await act(async () => {
			expect(await m.api.next({ data: 42, complete: true })).toEqual({ accepted: true, from: "a", to: "b" });
		});
		expect([m.api.id, m.api.data.get("a"), m.api.completed]).toEqual(["b", 42, ["a"]]);
	});
	it("discards completion and payload when a guard rejects", async () => {
		const m = await mount({ beforeStepChange: () => false });
		await act(async () => {
			expect(await m.api.next({ data: 42, complete: true })).toEqual({ accepted: false, reason: "guard" });
		});
		expect([m.api.id, m.api.data.all(), m.api.completed]).toEqual(["a", {}, []]);
	});
	it.each([false, true])("rejects same-tick duplicate navigation (async guard: %s)", async (asyncGuard) => {
		const guard = vi.fn(() => (asyncGuard ? Promise.resolve(true) : true));
		const changed = vi.fn();
		const m = await mount({ beforeStepChange: guard, onStepChange: changed });
		await act(async () => {
			const results = await Promise.all([m.api.next(), m.api.next()]);
			expect(results[0].accepted).toBe(true);
			expect(results[1]).toEqual({ accepted: false, reason: "pending" });
		});
		expect(guard).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenCalledTimes(1);
	});
	it("allows awaited sequential navigation with a retained action", async () => {
		const m = await mount();
		const next = m.api.next;
		await act(async () => {
			await next();
			await next();
		});
		expect(m.api.id).toBe("c");
	});
	it("only reports pending while an async guard is unresolved", async () => {
		const guard = deferred<boolean>();
		const m = await mount({ beforeStepChange: () => guard.promise });
		let transition!: ReturnType<Api["next"]>;
		await act(() => {
			transition = m.api.next();
		});
		expect(m.api.isPending).toBe(true);
		await act(async () => {
			guard.resolve(false);
			await transition;
		});
		expect(m.api.isPending).toBe(false);
	});
	it("releases the gate when a guard throws", async () => {
		const guard = vi
			.fn()
			.mockImplementationOnce(() => {
				throw new Error("failed");
			})
			.mockReturnValue(true);
		const m = await mount({ beforeStepChange: guard });
		await act(async () => {
			await expect(m.api.next()).rejects.toThrow("failed");
		});
		await act(async () => {
			expect((await m.api.next()).accepted).toBe(true);
		});
	});
	it("keeps guards when bypassing policy and reports boundary/noop/invalid outcomes", async () => {
		const guard = vi.fn(() => false);
		const m = await mount({ linear: true, beforeStepChange: guard });
		await act(async () => {
			expect(await m.api.prev()).toEqual({ accepted: false, reason: "boundary" });
			expect(await m.api.goTo("a")).toEqual({ accepted: false, reason: "same-step" });
			expect(await m.api.goTo("unknown" as "a")).toEqual({ accepted: false, reason: "invalid-step" });
			expect(await m.api.goTo("c")).toEqual({ accepted: false, reason: "policy" });
			expect(await m.api.goTo("c", { bypassPolicy: true })).toEqual({ accepted: false, reason: "guard" });
		});
		expect(guard).toHaveBeenCalledTimes(1);
	});
	it("cancels an obsolete guard instead of overwriting newer data", async () => {
		const guard = deferred<boolean>();
		const onStepChange = vi.fn();
		const m = await mount({ beforeStepChange: () => guard.promise, onStepChange });
		let transition!: ReturnType<Api["next"]>;
		await act(() => {
			transition = m.api.next({ data: "old" });
		});
		await act(async () => {
			m.api.data.set("a", "new");
			expect(await transition).toEqual({ accepted: false, reason: "cancelled" });
			guard.resolve(true);
		});
		expect(m.api.data.get("a")).toBe("new");
		expect(m.api.id).toBe("a");
		expect(onStepChange).not.toHaveBeenCalled();
	});
	it("aborts on unmount and settles even if the guard never settles", async () => {
		const changed = vi.fn();
		let signal!: AbortSignal;
		const m = await mount({
			onStepChange: changed,
			beforeStepChange: (context) => {
				signal = context.signal;
				return new Promise(() => {});
			},
		});
		let transition!: ReturnType<Api["next"]>;
		await act(() => {
			transition = m.api.next();
		});
		await m.unmount();
		expect(signal.aborted).toBe(true);
		expect(await transition).toEqual({ accepted: false, reason: "cancelled" });
		expect(changed).not.toHaveBeenCalled();
	});
});

describe("defaults and reset", () => {
	it("restores defaults, supports selective retention, and works on the initial step", async () => {
		const m = await mount({ defaultData: { a: "seed" }, defaultCompleted: ["c"] });
		await act(() => {
			m.api.data.set("a", "dirty");
			m.api.setComplete("a");
		});
		await act(async () => {
			expect((await m.api.reset({ keepData: true })).accepted).toBe(true);
		});
		expect(m.api.data.get("a")).toBe("dirty");
		expect(m.api.completed).toEqual(["c"]);
		await act(async () => {
			await m.api.reset();
		});
		expect(m.api.data.get("a")).toBe("seed");
	});
	it("freezes defaults at mount", async () => {
		const { result, rerender } = await renderHook(
			({ seed }: { seed: number } = { seed: 0 }) =>
				flow.useStepper({
					defaultStep: seed ? "a" : "b",
					defaultData: { a: seed },
					defaultCompleted: seed ? ["a"] : ["b"],
				}),
			{ initialProps: { seed: 1 } },
		);
		await rerender({ seed: 0 });
		await act(async () => {
			await result.current.next();
			await result.current.reset();
		});
		expect([result.current.id, result.current.data.get("a"), result.current.completed]).toEqual(["a", 1, ["a"]]);
	});
	it("notifies invalid controlled values once even in StrictMode", async () => {
		const invalid = vi.fn();
		function Probe({ tick }: { tick: number }) {
			flow.useStepper({ step: "missing", onInvalidStep: (value) => invalid(value) });
			return <span>{tick}</span>;
		}
		const m = await render(
			<StrictMode>
				<Probe tick={0} />
			</StrictMode>,
		);
		await m.rerender(
			<StrictMode>
				<Probe tick={1} />
			</StrictMode>,
		);
		expect(invalid).toHaveBeenCalledTimes(1);
	});
	it("provides typed flow data to match handlers", async () => {
		const m = await mount({ defaultData: { a: "saved" } });
		expect(m.api.match({ a: (step, data) => [step.id, data], b: () => [], c: () => [] })).toEqual(["a", "saved"]);
	});
});

describe("primitives", () => {
	it("does not submit forms when clicking a trigger", async () => {
		const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
		await render(
			<form onSubmit={submit}>
				<flow.Stepper.Root>
					<flow.Stepper.Item step="b">
						<flow.Stepper.Trigger>B</flow.Stepper.Trigger>
					</flow.Stepper.Item>
				</flow.Stepper.Root>
			</form>,
		);
		await userEvent.click(screen.getByText("B").element());
		expect(submit).not.toHaveBeenCalled();
	});
	it("preserves force-mounted form values and exposes explicit completion", async () => {
		let api!: Api;
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		await render(
			<flow.Stepper.Root>
				<Grab />
				<flow.Stepper.Item step="a">
					<flow.Stepper.Trigger>A</flow.Stepper.Trigger>
					<flow.Stepper.Indicator />
				</flow.Stepper.Item>
				<flow.Stepper.Content step="a" forceMount>
					<input aria-label="Name" />
				</flow.Stepper.Content>
				<flow.Stepper.Content step="b" forceMount>
					B panel
				</flow.Stepper.Content>
			</flow.Stepper.Root>,
		);
		const input = screen.getByLabelText("Name").element() as HTMLInputElement;
		await userEvent.fill(input, "Ada");
		await act(async () => {
			await api.next({ complete: true });
		});
		expect(input.parentElement?.hidden).toBe(true);
		expect(input.parentElement?.getAttribute("data-state")).toBe("inactive");
		expect(document.querySelectorAll("[data-complete]").length).toBe(3);
		await act(async () => {
			await api.prev();
		});
		expect(input.value).toBe("Ada");
	});
	it("inherits orientation and focuses the right instance", async () => {
		function Instance() {
			return (
				<flow.Stepper.Root orientation="vertical">
					<flow.Stepper.List>
						<flow.Stepper.Items>
							{(step) => (
								<flow.Stepper.Item>
									<flow.Stepper.Trigger>{step.title}</flow.Stepper.Trigger>
								</flow.Stepper.Item>
							)}
						</flow.Stepper.Items>
					</flow.Stepper.List>
					<flow.Stepper.Separator />
				</flow.Stepper.Root>
			);
		}
		await render(
			<>
				<Instance />
				<Instance />
			</>,
		);
		const tabs = screen.getByRole("tab", { name: "A" }).elements();
		expect(tabs[0].id).not.toBe(tabs[1].id);
		expect(screen.getByRole("tablist").elements()[1].getAttribute("aria-orientation")).toBe("vertical");
		tabs[1].focus();
		await act(async () => {
			await userEvent.keyboard("{ArrowDown}");
		});
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: "B" }).elements()[1]);
	});
	it("updates only affected items for adjacent navigation", async () => {
		let api!: Api;
		const renders: string[] = [];
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		await render(
			<flow.Stepper.Root>
				<Grab />
				<flow.Stepper.Items>
					{(step) => (
						<flow.Stepper.Item
							render={(props) => {
								renders.push(step.id);
								return <li {...props} />;
							}}
						/>
					)}
				</flow.Stepper.Items>
			</flow.Stepper.Root>,
		);
		renders.length = 0;
		await act(async () => {
			await api.next();
		});
		expect(renders.sort()).toEqual(["a", "b"]);
	});
});

it("observes rejected promises from guards that cancel themselves", async () => {
	const flow = defineStepper([{ id: "a" }, { id: "b" }]);
	const { result } = await renderHook(() =>
		flow.useStepper({
			beforeStepChange: async () => {
				result.current.data.set("a", "new data");
				throw new Error("obsolete guard failed");
			},
		}),
	);
	await act(async () => {
		expect(await result.current.next()).toEqual({ accepted: false, reason: "cancelled" });
	});
	expect(result.current.id).toBe("a");
	expect(result.current.data.get("a")).toBe("new data");
});
