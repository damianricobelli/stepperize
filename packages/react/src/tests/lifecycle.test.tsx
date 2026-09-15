import { StrictMode, useLayoutEffect } from "react";
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { cleanup, render, renderHook } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";
import { act } from "./act";

afterEach(cleanup);
it("controlled render layout effect reads current controlled step", async () => {
	const flow = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }]);
	const observed: string[] = [];
	const m = await renderHook(
		({ step }: { step: "a" | "b" } = { step: "a" }) => {
			const s = flow.useStepper({ step });
			useLayoutEffect(() => {
				observed.push(s.id);
			}, [step]);
			return s;
		},
		{ initialProps: { step: "a" as "a" | "b" } },
	);
	await m.rerender({ step: "b" });
	expect(observed).toEqual(["a", "b"]);
});
it("outer trigger uses its own item below nested flow item", async () => {
	const a = defineStepper([{ id: "a0" }, { id: "a1" }]);
	const b = defineStepper([{ id: "b0" }, { id: "b1" }]);
	let outer: any, inner: any;
	function Grab() {
		outer = a.useStepperContext();
		inner = b.useStepperContext();
		return null;
	}
	const m = await render(
		<a.Provider>
			<a.Stepper.Item step="a1">
				<b.Provider>
					<ol>
						<b.Stepper.Item step="b1">
							<Grab />
							<a.Stepper.Trigger>Outer</a.Stepper.Trigger>
						</b.Stepper.Item>
					</ol>
				</b.Provider>
			</a.Stepper.Item>
		</a.Provider>,
	);
	await userEvent.click(m.getByText("Outer").element());
	expect(outer.id).toBe("a1");
	expect(inner.id).toBe("b0");
});
it("nested list navigation does not navigate ancestor flow", async () => {
	const a = defineStepper([{ id: "a0" }, { id: "a1" }]);
	const b = defineStepper([{ id: "b0" }, { id: "b1" }]);
	let outer: any, inner: any;
	function Grab() {
		outer = a.useStepperContext();
		inner = b.useStepperContext();
		return null;
	}
	const m = await render(
		<a.Stepper.Root>
			<a.Stepper.List>
				<a.Stepper.Item step="a0">
					<a.Stepper.Trigger>Outer</a.Stepper.Trigger>
					<b.Stepper.Root>
						<Grab />
						<b.Stepper.List>
							<b.Stepper.Items>
								{(s) => (
									<b.Stepper.Item>
										<b.Stepper.Trigger>{s.id}</b.Stepper.Trigger>
									</b.Stepper.Item>
								)}
							</b.Stepper.Items>
						</b.Stepper.List>
					</b.Stepper.Root>
				</a.Stepper.Item>
			</a.Stepper.List>
		</a.Stepper.Root>,
	);
	m.getByText("b0").element().focus();
	await userEvent.keyboard("{ArrowRight}");
	expect(outer.id).toBe("a0");
	expect(inner.id).toBe("b1");
});
it("a controlled child layout effect invokes current callback", async () => {
	const flow = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }]);
	const observed: number[] = [];
	function Child({ tick }: { tick: number }) {
		const s = flow.useStepperContext();
		useLayoutEffect(() => {
			if (tick) void s.next();
		}, [tick]);
		return null;
	}
	const m = await render(
		<flow.Provider onStepChange={() => observed.push(0)}>
			<Child tick={0} />
		</flow.Provider>,
	);
	await act(
		async () =>
			await m.rerender(
				<flow.Provider onStepChange={() => observed.push(1)}>
					<Child tick={1} />
				</flow.Provider>,
			),
	);
	expect(observed).toEqual([1]);
});
it("uses current controlled step and guard in child layout effects", async () => {
	const flow = defineStepper([{ id: "a" }, { id: "b" }, { id: "c" }]);
	let result: any;
	const guards: string[] = [];
	function Child({ tick }: { tick: number }) {
		const s = flow.useStepperContext();
		useLayoutEffect(() => {
			if (tick) result = s.next();
		}, [tick]);
		return null;
	}
	function Parent({ tick }: { tick: number }) {
		return (
			<flow.Provider
				step={tick ? "b" : "a"}
				beforeStepChange={() => {
					guards.push(String(tick));
					return true;
				}}
			>
				<Child tick={tick} />
			</flow.Provider>
		);
	}
	const m = await render(<Parent tick={0} />);
	await m.rerender(<Parent tick={1} />);
	expect(await result).toEqual({ accepted: true, from: "b", to: "c" });
	expect(guards).toEqual(["1"]);
});
it("StrictMode async mount navigation eventually succeeds", async () => {
	const flow = defineStepper([{ id: "a" }, { id: "b" }]);
	const outcomes: any[] = [];
	let current = "";
	function Child() {
		const s = flow.useStepperContext();
		current = s.id;
		useLayoutEffect(() => {
			s.next().then((r) => outcomes.push(r));
		}, []);
		return null;
	}
	await act(async () => {
		await render(
			<StrictMode>
				<flow.Provider beforeStepChange={() => Promise.resolve(true)}>
					<Child />
				</flow.Provider>
			</StrictMode>,
		);
	});
	expect(current).toBe("b");
});
