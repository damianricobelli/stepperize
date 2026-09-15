import type { StepChangeContext } from "@stepperize/core";
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, renderHook } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";
import { act } from "./act";

const steps = [{ id: "a" }, { id: "b" }, { id: "c" }] as const;
const flow = defineStepper(steps);
type Snapshot = ReturnType<typeof flow.useStepper>;
afterEach(cleanup);

it("shares a controlled snapshot across readers and its commit", async () => {
	const seen: Snapshot[][] = [[], []];
	function Reader({ index }: { index: number }) {
		seen[index].push(flow.useStepperContext());
		return null;
	}
	function App({ step }: { step: "a" | "b" } = { step: "a" }) {
		return (
			<flow.Provider step={step}>
				<Reader index={0} />
				<Reader index={1} />
			</flow.Provider>
		);
	}
	const app = await render(<App step="a" />);
	seen.forEach((entries) => {
		entries.length = 0;
	});
	await app.rerender(<App step="b" />);
	expect(seen[0].map((snapshot) => snapshot.id)).toEqual(["b"]);
	expect(seen[1]).toHaveLength(1);
	expect(seen[0][0]).toBe(seen[1][0]);
});

it("retained snapshots keep their reads after data, completion and navigation change", async () => {
	const { result } = await renderHook(() => flow.useStepper({ defaultData: { a: "seed" } }));
	const first = result.current;
	await act(() => {
		result.current.data.set("a", "changed");
		result.current.setComplete("a");
	});
	const second = result.current;
	await act(async () => {
		await result.current.next();
	});
	expect(first.data.get()).toBe("seed");
	expect(first.isComplete()).toBe(false);
	expect(first.status("a")).toBe("active");
	expect(second.data.get()).toBe("changed");
	expect(second.isComplete()).toBe(true);
	expect(second.id).toBe("a");
	expect(result.current.id).toBe("b");
	expect(result.current.status("a")).toBe("previous");
});

it("retained guard and change contexts preserve their respective statuses", async () => {
	let before!: StepChangeContext<typeof steps>;
	let after!: StepChangeContext<typeof steps>;
	const { result } = await renderHook(() =>
		flow.useStepper({
			beforeStepChange(context) {
				before = context;
				return true;
			},
			onStepChange(_id, context) {
				after = context;
			},
		}),
	);
	await act(async () => {
		await result.current.next({ data: "draft" });
	});
	expect(before.statuses).toEqual({ a: "active", b: "upcoming", c: "upcoming" });
	expect(after.statuses).toEqual({ a: "previous", b: "active", c: "upcoming" });
	expect(before.signal).toBe(after.signal);
	expect(before.signal.aborted).toBe(false);
	expect(before.data).toEqual({ a: "draft" });
	expect(after.data).toBe(before.data);
});

it("projects policy changes before layout effects, including restoring the default", async () => {
	const values: boolean[] = [];
	const { rerender } = await renderHook(
		({ linear }: { linear: boolean | undefined } = { linear: undefined }) => {
			const state = flow.useStepper({ linear });
			React.useLayoutEffect(() => {
				values.push(state.canGoTo("c"));
			}, [linear]);
		},
		{ initialProps: { linear: true as boolean | undefined } },
	);
	await rerender({ linear: undefined });
	expect(values).toEqual([false, true]);
});

it("cancels an unread signal and settles a guard that never resolves", async () => {
	let context!: StepChangeContext<typeof steps>;
	const { result, unmount } = await renderHook(() =>
		flow.useStepper({
			beforeStepChange(value) {
				context = value;
				return new Promise<boolean>(() => {});
			},
		}),
	);
	let navigation!: ReturnType<Snapshot["next"]>;
	await act(() => {
		navigation = result.current.next();
	});
	await unmount();
	expect(await navigation).toEqual({ accepted: false, reason: "cancelled" });
	expect(context.signal.aborted).toBe(true);
});

it.each(["local", "shared"] as const)(
	"abandoned %s renders do not install controlled state or callbacks",
	async (ownership) => {
		let api!: Snapshot;
		const calls: string[] = [];
		const suspended = new Promise<void>(() => {});
		const useFlow =
			ownership === "local"
				? (step: "a" | "b") =>
						flow.useStepper({
							step,
							beforeStepChange: () => {
								calls.push(step);
								return true;
							},
						})
				: (_step: "a" | "b") => flow.useStepperContext();
		function Probe({ blocked, step }: { blocked: boolean; step: "a" | "b" }) {
			const value = useFlow(step);
			React.useLayoutEffect(() => {
				api = value;
			});
			if (blocked) throw suspended;
			return <span>{value.id}</span>;
		}
		function App({ blocked = false, step = "a" }: { blocked?: boolean; step?: "a" | "b" }) {
			return (
				<React.Suspense fallback="loading">
					<flow.Provider
						step={step}
						beforeStepChange={() => {
							calls.push(step);
							return true;
						}}
					>
						<Probe blocked={blocked} step={step} />
					</flow.Provider>
				</React.Suspense>
			);
		}
		const container = document.createElement("div");
		document.body.append(container);
		const app = createRoot(container);
		try {
			await act(() => app.render(<App />));
			await act(async () => {
				React.startTransition(() => app.render(<App blocked step="b" />));
			});
			expect(container.textContent).toBe("a");
			await act(async () => {
				expect(await api.next()).toEqual({ accepted: true, from: "a", to: "b" });
			});
			expect(calls).toEqual(["a"]);
			await act(() => app.render(<App />));
			expect(container.textContent).toBe("a");
		} finally {
			await act(() => app.unmount());
			container.remove();
		}
	},
);
