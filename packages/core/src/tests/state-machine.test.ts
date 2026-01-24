import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Step, StepMetadata, StepStatuses } from "../types";
import {
	areDependenciesSatisfied,
	canAccessStep,
	canNavigate,
	canRedo,
	canUndo,
	createInitialState,
	createTransitionContext,
	findNextValidStepIndex,
	isStepCompleted,
	shouldSkipStep,
	stepperReducer,
	validateStepMetadata,
} from "../state-machine";
import type { StandardSchemaV1 } from "../standard-schema";

const steps: Step[] = [
	{ id: "first", label: "Step 1" },
	{ id: "second", label: "Step 2" },
	{ id: "third", label: "Step 3" },
];

type Steps = typeof steps;

describe("createInitialState", () => {
	it("creates initial state with default values", () => {
		const state = createInitialState(steps);

		expect(state.currentIndex).toBe(0);
		expect(state.statuses).toEqual({
			first: "idle",
			second: "idle",
			third: "idle",
		});
		expect(state.metadata).toEqual({
			first: null,
			second: null,
			third: null,
		});
		expect(state.history).toHaveLength(1);
		expect(state.historyIndex).toBe(0);
		expect(state.initialized).toBe(true);
	});

	it("uses initialStep from config", () => {
		const state = createInitialState(steps, {
			initialStep: "second",
		});

		expect(state.currentIndex).toBe(1);
		expect(state.history[0].step.id).toBe("second");
	});

	it("uses initialStatuses from config", () => {
		const state = createInitialState(steps, {
			initialStatuses: {
				first: "success",
				second: "pending",
			},
		});

		expect(state.statuses.first).toBe("success");
		expect(state.statuses.second).toBe("pending");
		expect(state.statuses.third).toBe("idle");
	});

	it("uses initialMetadata from config", () => {
		const state = createInitialState(steps, {
			initialMetadata: {
				first: { foo: "bar" },
			},
		});

		expect(state.metadata.first).toEqual({ foo: "bar" });
		expect(state.metadata.second).toBeNull();
		expect(state.metadata.third).toBeNull();
	});

	it("sets initialized to false when initialData is provided", () => {
		const state = createInitialState(steps, {
			initialData: async () => ({}),
		});

		expect(state.initialized).toBe(false);
	});
});

describe("stepperReducer", () => {
	let initialState: ReturnType<typeof createInitialState<Steps>>;

	beforeEach(() => {
		initialState = createInitialState(steps);
	});

	describe("GO_TO action", () => {
		it("navigates to valid index", () => {
			const newState = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 2 },
				steps,
			);

			expect(newState.currentIndex).toBe(2);
			expect(newState.history).toHaveLength(2);
			expect(newState.historyIndex).toBe(1);
		});

		it("does not navigate to invalid index", () => {
			const newState = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 10 },
				steps,
			);

			expect(newState.currentIndex).toBe(0);
		});

		it("does not navigate to negative index", () => {
			const newState = stepperReducer(
				initialState,
				{ type: "GO_TO", index: -1 },
				steps,
			);

			expect(newState.currentIndex).toBe(0);
		});

		it("truncates history when navigating back", () => {
			// Navigate forward
			let state = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 1 },
				steps,
			);
			state = stepperReducer(state, { type: "GO_TO", index: 2 }, steps);

			// Navigate back
			state = stepperReducer(state, { type: "GO_TO", index: 0 }, steps);

			expect(state.history).toHaveLength(4);
			expect(state.historyIndex).toBe(3);
		});

		it("respects linear mode restrictions", () => {
			const state = createInitialState(steps, {
				mode: "linear",
			});

			// Cannot skip steps in linear mode
			const newState = stepperReducer(
				state,
				{ type: "GO_TO", index: 2 },
				steps,
				{ mode: "linear" },
			);

			expect(newState.currentIndex).toBe(0);
		});
	});

	describe("SET_STATUS action", () => {
		it("updates step status", () => {
			const newState = stepperReducer(
				initialState,
				{ type: "SET_STATUS", stepId: "first", status: "success" },
				steps,
			);

			expect(newState.statuses.first).toBe("success");
			expect(newState.statuses.second).toBe("idle");
		});
	});

	describe("SET_METADATA action", () => {
		it("updates step metadata", () => {
			const newState = stepperReducer(
				initialState,
				{
					type: "SET_METADATA",
					stepId: "first",
					metadata: { foo: "bar" },
				},
				steps,
			);

			expect(newState.metadata.first).toEqual({ foo: "bar" });
			expect(newState.metadata.second).toBeNull();
		});
	});

	describe("RESET_METADATA action", () => {
		it("resets metadata to null when keepInitial is false", () => {
			let state = stepperReducer(
				initialState,
				{
					type: "SET_METADATA",
					stepId: "first",
					metadata: { foo: "bar" },
				},
				steps,
			);

			state = stepperReducer(
				state,
				{ type: "RESET_METADATA", keepInitial: false },
				steps,
			);

			expect(state.metadata.first).toBeNull();
		});

		it("keeps initial metadata when keepInitial is true", () => {
			const state = createInitialState(steps, {
				initialMetadata: {
					first: { initial: "value" },
				},
			});

			let newState = stepperReducer(
				state,
				{
					type: "SET_METADATA",
					stepId: "first",
					metadata: { changed: "value" },
				},
				steps,
			);

			newState = stepperReducer(
				newState,
				{
					type: "RESET_METADATA",
					keepInitial: true,
					initialMetadata: { first: { initial: "value" } },
				},
				steps,
			);

			expect(newState.metadata.first).toEqual({ initial: "value" });
		});
	});

	describe("RESET action", () => {
		it("resets state to initial values", () => {
			let state = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 2 },
				steps,
			);
			state = stepperReducer(
				state,
				{ type: "SET_STATUS", stepId: "first", status: "success" },
				steps,
			);
			state = stepperReducer(
				state,
				{
					type: "SET_METADATA",
					stepId: "first",
					metadata: { foo: "bar" },
				},
				steps,
			);

			const resetState = stepperReducer(
				state,
				{
					type: "RESET",
					initialIndex: 0,
					initialMetadata: { first: { initial: "value" } },
					initialStatuses: { first: "idle" },
				},
				steps,
			);

			expect(resetState.currentIndex).toBe(0);
			expect(resetState.statuses.first).toBe("idle");
			expect(resetState.metadata.first).toEqual({ initial: "value" });
			expect(resetState.history).toHaveLength(1);
			expect(resetState.historyIndex).toBe(0);
		});
	});

	describe("UNDO action", () => {
		it("navigates to previous history entry", () => {
			let state = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 1 },
				steps,
			);
			state = stepperReducer(state, { type: "GO_TO", index: 2 }, steps);

			state = stepperReducer(state, { type: "UNDO" }, steps);

			expect(state.currentIndex).toBe(1);
			expect(state.historyIndex).toBe(1);
		});

		it("does nothing if at beginning of history", () => {
			const newState = stepperReducer(
				initialState,
				{ type: "UNDO" },
				steps,
			);

			expect(newState.currentIndex).toBe(0);
			expect(newState.historyIndex).toBe(0);
		});
	});

	describe("REDO action", () => {
		it("navigates to next history entry", () => {
			let state = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 1 },
				steps,
			);
			state = stepperReducer(state, { type: "GO_TO", index: 2 }, steps);
			state = stepperReducer(state, { type: "UNDO" }, steps);

			state = stepperReducer(state, { type: "REDO" }, steps);

			expect(state.currentIndex).toBe(2);
			expect(state.historyIndex).toBe(2);
		});

		it("does nothing if at end of history", () => {
			let state = stepperReducer(
				initialState,
				{ type: "GO_TO", index: 1 },
				steps,
			);

			const newState = stepperReducer(state, { type: "REDO" }, steps);

			expect(newState.currentIndex).toBe(1);
			expect(newState.historyIndex).toBe(1);
		});
	});

	describe("INITIALIZE action", () => {
		it("initializes state with provided data", () => {
			const newState = stepperReducer(
				initialState,
				{
					type: "INITIALIZE",
					state: {
						step: "second",
						metadata: { first: { foo: "bar" } },
						statuses: { first: "success" },
					},
				},
				steps,
			);

			expect(newState.currentIndex).toBe(1);
			expect(newState.metadata.first).toEqual({ foo: "bar" });
			expect(newState.statuses.first).toBe("success");
			expect(newState.initialized).toBe(true);
		});
	});
});

describe("canNavigate", () => {
	it("allows navigation in free mode", () => {
		const state = createInitialState(steps);

		expect(canNavigate(steps, state, 0, "free")).toBe(true);
		expect(canNavigate(steps, state, 1, "free")).toBe(true);
		expect(canNavigate(steps, state, 2, "free")).toBe(true);
	});

	it("allows backward navigation in linear mode", () => {
		let state = createInitialState(steps);
		state = stepperReducer(state, { type: "GO_TO", index: 2 }, steps);

		expect(canNavigate(steps, state, 0, "linear")).toBe(true);
		expect(canNavigate(steps, state, 1, "linear")).toBe(true);
	});

	it("prevents skipping steps forward in linear mode", () => {
		const state = createInitialState(steps);

		expect(canNavigate(steps, state, 2, "linear")).toBe(false);
	});

	it("allows forward one step in linear mode if current is completed", () => {
		let state = createInitialState(steps);
		state = stepperReducer(
			state,
			{ type: "SET_STATUS", stepId: "first", status: "success" },
			steps,
		);

		expect(canNavigate(steps, state, 1, "linear")).toBe(true);
	});

	it("prevents forward navigation if current step is not completed", () => {
		const state = createInitialState(steps);

		expect(canNavigate(steps, state, 1, "linear")).toBe(false);
	});

	it("checks dependencies", () => {
		const stepsWithDeps: Step[] = [
			{ id: "first", label: "Step 1" },
			{ id: "second", label: "Step 2", requires: ["first"] },
			{ id: "third", label: "Step 3", requires: ["second"] },
		];

		let state = createInitialState(stepsWithDeps);

		// Cannot navigate to second if first is not completed
		expect(canNavigate(stepsWithDeps, state, 1, "free")).toBe(false);

		// Complete first step
		state = stepperReducer(
			state,
			{ type: "SET_STATUS", stepId: "first", status: "success" },
			stepsWithDeps,
		);

		// Now can navigate to second
		expect(canNavigate(stepsWithDeps, state, 1, "free")).toBe(true);
	});
});

describe("areDependenciesSatisfied", () => {
	it("returns true when step has no dependencies", () => {
		const statuses: StepStatuses<Steps> = {
			first: "idle",
			second: "idle",
			third: "idle",
		};

		expect(areDependenciesSatisfied(steps[0], statuses)).toBe(true);
	});

	it("returns true when all dependencies are satisfied", () => {
		const step = { id: "third", requires: ["first", "second"] } as Step;
		const statuses: StepStatuses<Steps> = {
			first: "success",
			second: "success",
			third: "idle",
		};

		expect(areDependenciesSatisfied(step, statuses)).toBe(true);
	});

	it("returns false when any dependency is not satisfied", () => {
		const step = { id: "third", requires: ["first", "second"] } as Step;
		const statuses: StepStatuses<Steps> = {
			first: "success",
			second: "idle",
			third: "idle",
		};

		expect(areDependenciesSatisfied(step, statuses)).toBe(false);
	});
});

describe("createTransitionContext", () => {
	it("creates transition context with correct values", () => {
		const state = createInitialState(steps);
		const context = createTransitionContext(steps, state, 1, "next");

		expect(context.from.id).toBe("first");
		expect(context.to.id).toBe("second");
		expect(context.direction).toBe("next");
		expect(context.fromIndex).toBe(0);
		expect(context.toIndex).toBe(1);
		expect(context.metadata).toEqual(state.metadata);
		expect(context.statuses).toEqual(state.statuses);
	});
});

describe("isStepCompleted", () => {
	it("returns true when step status is success", () => {
		const statuses: StepStatuses<Steps> = {
			first: "success",
			second: "idle",
			third: "idle",
		};

		expect(isStepCompleted("first", statuses)).toBe(true);
	});

	it("returns false when step status is not success", () => {
		const statuses: StepStatuses<Steps> = {
			first: "idle",
			second: "pending",
			third: "error",
		};

		expect(isStepCompleted("first", statuses)).toBe(false);
		expect(isStepCompleted("second", statuses)).toBe(false);
		expect(isStepCompleted("third", statuses)).toBe(false);
	});
});

describe("canAccessStep", () => {
	it("returns true when step can be accessed", () => {
		const state = createInitialState(steps);

		expect(canAccessStep(steps, state, "first", "free")).toBe(true);
		expect(canAccessStep(steps, state, "second", "free")).toBe(true);
	});

	it("returns false when step cannot be accessed", () => {
		const state = createInitialState(steps, { mode: "linear" });

		expect(canAccessStep(steps, state, "second", "linear")).toBe(false);
	});
});

describe("canUndo", () => {
	it("returns true when undo is available", () => {
		let state = createInitialState(steps);
		state = stepperReducer(state, { type: "GO_TO", index: 1 }, steps);

		expect(canUndo(state)).toBe(true);
	});

	it("returns false when at beginning of history", () => {
		const state = createInitialState(steps);

		expect(canUndo(state)).toBe(false);
	});
});

describe("canRedo", () => {
	it("returns true when redo is available", () => {
		let state = createInitialState(steps);
		state = stepperReducer(state, { type: "GO_TO", index: 1 }, steps);
		state = stepperReducer(state, { type: "UNDO" }, steps);

		expect(canRedo(state)).toBe(true);
	});

	it("returns false when at end of history", () => {
		const state = createInitialState(steps);

		expect(canRedo(state)).toBe(false);
	});
});

describe("shouldSkipStep", () => {
	it("returns false when step has no skip function", () => {
		const metadata: StepMetadata<Steps> = {
			first: null,
			second: null,
			third: null,
		};

		expect(shouldSkipStep(steps[0], metadata)).toBe(false);
	});

	it("returns true when skip function returns true", () => {
		const step = {
			id: "first",
			skip: () => true,
		} as Step;

		const metadata: StepMetadata<Steps> = {
			first: null,
			second: null,
			third: null,
		};

		expect(shouldSkipStep(step, metadata)).toBe(true);
	});

	it("returns false when skip function returns false", () => {
		const step = {
			id: "first",
			skip: () => false,
		} as Step;

		const metadata: StepMetadata<Steps> = {
			first: null,
			second: null,
			third: null,
		};

		expect(shouldSkipStep(step, metadata)).toBe(false);
	});

	it("passes metadata to skip function", () => {
		const skipFn = vi.fn().mockReturnValue(false);
		const step = {
			id: "first",
			skip: skipFn,
		} as Step;

		const metadata: StepMetadata<Steps> = {
			first: { foo: "bar" },
			second: null,
			third: null,
		};

		shouldSkipStep(step, metadata);

		expect(skipFn).toHaveBeenCalledWith({ first: { foo: "bar" }, second: null, third: null });
	});
});

describe("findNextValidStepIndex", () => {
	it("finds next non-skipped step forward", () => {
		const stepsWithSkip: Step[] = [
			{ id: "first", label: "Step 1" },
			{ id: "second", label: "Step 2", skip: () => true },
			{ id: "third", label: "Step 3" },
		];

		const metadata: StepMetadata<typeof stepsWithSkip> = {
			first: null,
			second: null,
			third: null,
		};

		const index = findNextValidStepIndex(stepsWithSkip, 0, 1, metadata);

		expect(index).toBe(2);
	});

	it("finds next non-skipped step backward", () => {
		const stepsWithSkip: Step[] = [
			{ id: "first", label: "Step 1" },
			{ id: "second", label: "Step 2", skip: () => true },
			{ id: "third", label: "Step 3" },
		];

		const metadata: StepMetadata<typeof stepsWithSkip> = {
			first: null,
			second: null,
			third: null,
		};

		const index = findNextValidStepIndex(stepsWithSkip, 2, -1, metadata);

		expect(index).toBe(0);
	});

	it("returns -1 when no valid step is found", () => {
		const stepsWithSkip: Step[] = [
			{ id: "first", label: "Step 1", skip: () => true },
			{ id: "second", label: "Step 2", skip: () => true },
		];

		const metadata: StepMetadata<typeof stepsWithSkip> = {
			first: null,
			second: null,
		};

		const index = findNextValidStepIndex(stepsWithSkip, 0, 1, metadata);

		expect(index).toBe(-1);
	});
});

describe("validateStepMetadata", () => {
	it("returns success when step has no schema", () => {
		const step: Step = { id: "first" };
		const result = validateStepMetadata(step, { foo: "bar" });

		expect(result).toEqual({ success: true, data: { foo: "bar" } });
	});

	it("validates with Standard Schema synchronously", () => {
		const mockSchema: StandardSchemaV1 = {
			"~standard": {
				version: 1,
				vendor: "test",
				validate: (value: unknown) => {
					if (typeof value === "object" && value !== null && "valid" in value) {
						return { value };
					}
					return {
						issues: [{ message: "Invalid data" }],
					};
				},
				types: {
					input: {} as unknown,
					output: { valid: true } as { valid: boolean },
				},
			},
		};

		const step = { id: "first", schema: mockSchema } as unknown as Step;

		const successResult = validateStepMetadata(step, { valid: true });
		expect(successResult).toEqual({ success: true, data: { valid: true } });

		const failResult = validateStepMetadata(step, { invalid: true });
		expect(failResult).toEqual({
			success: false,
			error: [{ message: "Invalid data" }],
		});
	});

	it("validates with Standard Schema asynchronously", async () => {
		const mockSchema: StandardSchemaV1 = {
			"~standard": {
				version: 1,
				vendor: "test",
				validate: (value: unknown) => {
					return Promise.resolve(
						typeof value === "object" && value !== null && "valid" in value
							? { value }
							: { issues: [{ message: "Invalid data" }] },
					);
				},
				types: {
					input: {} as unknown,
					output: { valid: true } as { valid: boolean },
				},
			},
		};

		const step = { id: "first", schema: mockSchema } as unknown as Step;

		const successResult = await validateStepMetadata(step, { valid: true });
		expect(successResult).toEqual({ success: true, data: { valid: true } });

		const failResult = await validateStepMetadata(step, { invalid: true });
		expect(failResult).toEqual({
			success: false,
			error: [{ message: "Invalid data" }],
		});
	});
});
