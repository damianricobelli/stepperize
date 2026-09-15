import type { Stepper } from "@stepperize/core";
import { describe, expect, it, vi } from "vitest";
import { page as screen } from "vitest/browser";
import { render, renderHook } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";
import { act } from "./act";

const steps = [
	{ id: "first", title: "First" },
	{ id: "second", title: "Second" },
	{ id: "third", title: "Third" },
];

const stringSchema = {
	"~standard": {
		version: 1 as const,
		vendor: "test",
		validate: (value: unknown) =>
			typeof value === "string" && value.length > 0 ? { value } : { issues: [{ message: "Required" }] },
	},
};

describe("defineStepper", () => {
	it("throws for empty step definitions", () => {
		expect(() => defineStepper([] as const)).toThrow("defineStepper requires at least one step.");
	});

	it("throws for duplicate step ids", () => {
		const duplicateSteps: { id: string; title: string }[] = [
			{ id: "first", title: "First" },
			{ id: "first", title: "Duplicate" },
		];

		expect(() => defineStepper(duplicateSteps)).toThrow(
			"defineStepper requires unique step ids. Duplicate id(s): first.",
		);
	});

	it("defines steps from an array and returns the surface", () => {
		const result = defineStepper(steps);
		expect(result.steps).toEqual(steps);
		expect(result.Provider).toBeDefined();
		expect(typeof result.useStepper).toBe("function");
		expect(result.Stepper.Root).toBeDefined();
		expect(result.Stepper.Items).toBeDefined();
		expect(result.get("second")).toEqual(steps[1]);
		expect(result.at(0)).toEqual(steps[0]);
	});

	it("useStepper returns a flat stepper API", async () => {
		const { useStepper } = defineStepper(steps);
		const { result } = await renderHook(() => useStepper());
		const stepper = result.current;

		expect(stepper.steps).toEqual(steps);
		expect(stepper.current).toEqual(steps[0]);
		expect(stepper.id).toBe("first");
		expect(stepper.index).toBe(0);
		expect(stepper.count).toBe(3);
		expect(stepper.progress).toBe(0);
		expect(stepper.isFirst).toBe(true);
		expect(stepper.isLast).toBe(false);
		expect(stepper.canPrev).toBe(false);
		expect(stepper.canNext).toBe(true);
		expect(stepper.isPending).toBe(false);
		expect(stepper.status("first")).toBe("active");
		expect(stepper.status("second")).toBe("upcoming");
		expect(stepper.is("first")).toBe(true);
	});

	it("uses definition-level defaultStep and defaultData options", async () => {
		const { useStepper } = defineStepper(steps, {
			defaultStep: "second",
			defaultData: { first: { saved: true } },
		});
		const { result } = await renderHook(() => useStepper());

		expect(result.current.id).toBe("second");
		expect(result.current.index).toBe(1);
		expect(result.current.data.get("first")).toEqual({ saved: true });
		expect(result.current.data.get()).toBeUndefined();
	});

	it("navigates with next, prev, goTo and reset", async () => {
		const { useStepper } = defineStepper(steps, { defaultStep: "second" });
		const { result } = await renderHook(() => useStepper());

		await act(async () => {
			expect(await result.current.next()).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("third");
		expect(result.current.isLast).toBe(true);
		expect(result.current.progress).toBe(1);

		await act(async () => {
			expect(await result.current.next()).toMatchObject({ accepted: false });
			expect(await result.current.prev()).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("second");

		await act(async () => {
			expect(await result.current.goTo("first")).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("first");

		await act(async () => {
			expect(await result.current.reset()).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("second");
	});

	it("matches exhaustively by current step", async () => {
		const { useStepper } = defineStepper(steps);
		const { result } = await renderHook(() => useStepper());

		expect(
			result.current.match({
				first: (step) => step.title,
				second: (step) => step.title,
				third: (step) => step.title,
			}),
		).toBe("First");

		await act(async () => {
			await result.current.goTo("third");
		});

		expect(
			result.current.match({
				first: (step) => step.title,
				second: (step) => step.title,
				third: (step) => step.title,
			}),
		).toBe("Third");
	});

	it("stores and clears flow data for the current or explicit step", async () => {
		const { useStepper } = defineStepper(steps);
		const { result } = await renderHook(() => useStepper());

		await act(() => {
			result.current.data.set({ draft: true });
		});
		expect(result.current.data.get("first")).toEqual({ draft: true });

		await act(() => {
			result.current.data.set("second", { count: 2 });
		});
		expect(result.current.data.all()).toEqual({
			first: { draft: true },
			second: { count: 2 },
		});

		await act(() => {
			result.current.data.clear("first");
		});
		expect(result.current.data.all()).toEqual({ second: { count: 2 } });

		await act(() => {
			result.current.data.reset();
		});
		expect(result.current.data.all()).toEqual({});
	});

	it("passes payload data to the guard and persists it only when the change completes", async () => {
		const beforeStepChange = vi.fn().mockResolvedValue(false);
		const { useStepper } = defineStepper(steps);
		const { result } = await renderHook(() => useStepper({ beforeStepChange }));

		await act(async () => {
			expect(await result.current.next({ data: { name: "Ada" } })).toMatchObject({ accepted: false });
		});

		expect(beforeStepChange.mock.calls[0][0].data.first).toEqual({ name: "Ada" });
		expect(result.current.id).toBe("first");
		expect(result.current.data.get("first")).toBeUndefined();

		beforeStepChange.mockResolvedValueOnce(true);
		await act(async () => {
			expect(await result.current.next({ data: { name: "Ada" } })).toMatchObject({ accepted: true });
		});

		expect(result.current.id).toBe("second");
		expect(result.current.data.get("first")).toEqual({ name: "Ada" });
	});

	it("validates the step being left against the pending transition data", async () => {
		const wizard = defineStepper([{ id: "name", schema: stringSchema }, { id: "done" }] as const);
		const beforeStepChange = vi.fn(async ({ validate }) => (await validate()).success);
		const { result } = await renderHook(() => wizard.useStepper({ beforeStepChange }));

		await act(async () => {
			expect(await result.current.next({ data: "" })).toMatchObject({ accepted: false });
		});
		expect(result.current.id).toBe("name");
		expect(result.current.data.get("name")).toBeUndefined();

		await act(async () => {
			expect(await result.current.next({ data: "Ada" })).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("done");
		expect(result.current.data.get("name")).toBe("Ada");
	});

	it("supports explicit guard-context validation by id or step object", async () => {
		const wizard = defineStepper([{ id: "name", schema: stringSchema }, { id: "done" }] as const);
		const beforeStepChange = vi.fn(async ({ from, validate }) => {
			const byId = await validate("name");
			const byStep = await validate(from);
			return byId.success && byStep.success;
		});
		const { result } = await renderHook(() => wizard.useStepper({ beforeStepChange }));

		await act(async () => {
			expect(await result.current.next({ data: "Ada" })).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("done");
	});

	it("runs beforeStepChange as a guard and cancels on false", async () => {
		const beforeStepChange = vi.fn().mockResolvedValue(false);
		const { useStepper } = defineStepper(steps);
		const { result } = await renderHook(() => useStepper({ beforeStepChange }));

		await act(async () => {
			expect(await result.current.next()).toMatchObject({ accepted: false });
		});
		expect(beforeStepChange).toHaveBeenCalledTimes(1);
		expect(result.current.id).toBe("first");

		beforeStepChange.mockResolvedValueOnce(true);
		await act(async () => {
			expect(await result.current.next()).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("second");
	});

	it("validates stored data against a step schema, and treats schemaless steps as valid", async () => {
		const wizard = defineStepper([{ id: "name", schema: stringSchema }, { id: "done" }] as const);
		const { result } = await renderHook(() => wizard.useStepper());

		await act(async () => {
			const invalid = await result.current.validate("name");
			expect(invalid.success).toBe(false);
		});

		await act(() => {
			result.current.data.set("name", "Ada");
		});
		await act(async () => {
			const valid = await result.current.validate("name");
			expect(valid).toEqual({ success: true, data: "Ada" });
		});

		await act(async () => {
			const schemaless = await result.current.validate("done");
			expect(schemaless.success).toBe(true);
		});

		// definition-level validate of an arbitrary value
		const direct = await wizard.validate("name", "Bob");
		expect(direct).toEqual({ success: true, data: "Bob" });
	});

	it("supports controlled step state", async () => {
		const { useStepper } = defineStepper(steps);
		type StepId = (typeof steps)[number]["id"];
		const onStepChange = vi.fn();
		const { result, rerender } = await renderHook(
			({ step }: { step: StepId } = { step: "first" }) => useStepper({ step, onStepChange }),
			{
				initialProps: { step: "first" as StepId },
			},
		);

		await act(async () => {
			expect(await result.current.next()).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("first");
		expect(onStepChange).toHaveBeenCalledWith("second", expect.objectContaining({ direction: "next" }));

		await rerender({ step: "second" as StepId });
		expect(result.current.id).toBe("second");
	});

	it("does not run the guard for external controlled step changes", async () => {
		type StepId = (typeof steps)[number]["id"];
		const beforeStepChange = vi.fn().mockResolvedValue(true);
		const { useStepper } = defineStepper(steps);
		const { result, rerender } = await renderHook(
			({ step }: { step: StepId } = { step: "first" }) => useStepper({ step, beforeStepChange }),
			{
				initialProps: { step: "first" as StepId },
			},
		);

		await rerender({ step: "third" as StepId });
		expect(result.current.id).toBe("third");
		expect(beforeStepChange).not.toHaveBeenCalled();
	});

	it("recovers from an invalid controlled step and calls onInvalidStep", async () => {
		const { useStepper } = defineStepper(steps, { defaultStep: "second" });
		const onInvalidStep = vi.fn();
		const { result } = await renderHook(() => useStepper({ step: "nope", onInvalidStep }));

		expect(result.current.id).toBe("second");
		expect(onInvalidStep).toHaveBeenCalledWith("nope");
	});

	it("accepts null as an invalid controlled step from external state", async () => {
		const { useStepper } = defineStepper(steps);
		const onInvalidStep = vi.fn();
		const { result } = await renderHook(() => useStepper({ step: null, onInvalidStep }));

		expect(result.current.id).toBe("first");
		expect(onInvalidStep).toHaveBeenCalledWith(null);
	});

	it("parseStep narrows arbitrary values to known step ids", () => {
		const wizard = defineStepper(steps);
		expect(wizard.parseStep("second")).toBe("second");
		expect(wizard.parseStep("missing")).toBeUndefined();
		expect(wizard.parseStep(null)).toBeUndefined();
	});

	it("supports controlled flow data", async () => {
		const { useStepper } = defineStepper(steps);
		const onDataChange = vi.fn();
		const { result } = await renderHook(() => useStepper({ data: { first: { a: 1 } }, onDataChange }));

		await act(() => {
			result.current.data.set({ a: 2 });
		});

		expect(result.current.data.get("first")).toEqual({ a: 1 });
		expect(onDataChange).toHaveBeenCalledWith({ first: { a: 2 } });
	});

	it("tracks explicit completion separately from positional status", async () => {
		const { useStepper } = defineStepper(steps, { defaultCompleted: ["first"] });
		const { result } = await renderHook(() => useStepper());

		expect(result.current.status("first")).toBe("active");
		expect(result.current.isComplete("first")).toBe(true);
		expect(result.current.completed).toEqual(["first"]);

		await act(() => {
			result.current.setComplete("second");
		});
		expect(result.current.completed).toEqual(["first", "second"]);

		await act(() => {
			result.current.setComplete("first", false);
		});
		expect(result.current.completed).toEqual(["second"]);
	});

	it("supports controlled completion", async () => {
		const { useStepper } = defineStepper(steps);
		const onCompletedChange = vi.fn();
		const { result } = await renderHook(() => useStepper({ completed: ["first"], onCompletedChange }));

		await act(() => {
			result.current.setComplete("second");
		});

		expect(result.current.completed).toEqual(["first"]);
		expect(onCompletedChange).toHaveBeenCalledWith(["first", "second"]);
	});

	it("gates both canGoTo and goTo, with an explicit policy bypass", async () => {
		const { useStepper } = defineStepper(steps, { linear: true });
		const { result } = await renderHook(() => useStepper());

		expect(result.current.canGoTo("third")).toBe(false);

		await act(async () => {
			expect(await result.current.goTo("third")).toEqual({ accepted: false, reason: "policy" });
			expect(await result.current.goTo("third", { bypassPolicy: true })).toMatchObject({ accepted: true });
		});
		expect(result.current.id).toBe("third");
	});

	it("Provider shares stepper state with children", async () => {
		const { Provider, useStepperContext } = defineStepper(steps, { defaultStep: "second" });
		const seenSteppers: Stepper<typeof steps>[] = [];

		function Child() {
			const childStepper = useStepperContext();
			seenSteppers[0] = childStepper;
			return <span data-testid="child">{childStepper.id}</span>;
		}

		await render(
			<Provider>
				<Child />
			</Provider>,
		);

		expect(seenSteppers[0]?.id).toBe("second");
		expect(screen.getByTestId("child").element().textContent).toBe("second");
	});
});
