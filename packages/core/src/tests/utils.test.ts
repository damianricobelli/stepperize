import { describe, expect, it } from "vitest";
import {
	createStepMap,
	getInitialData,
	getInitialStepIndex,
	getStepStatus,
	getStepStatuses,
	matchStep,
	parseStep,
	validateStep,
} from "../utils";

type TestStep = { id: "first"; label: string } | { id: "second"; label: string } | { id: "third"; label: string };

const steps: TestStep[] = [
	{ id: "first", label: "Step 1" },
	{ id: "second", label: "Step 2" },
	{ id: "third", label: "Step 3" },
];

describe("createStepMap", () => {
	const stepMap = createStepMap(steps);

	it("returns steps and ids", () => {
		expect(stepMap.steps).toEqual(steps);
		expect(stepMap.ids).toEqual(["first", "second", "third"]);
	});

	it("gets steps by id and index", () => {
		expect(stepMap.get("second")).toEqual({ id: "second", label: "Step 2" });
		expect(stepMap.at(0)).toEqual(steps[0]);
		expect(stepMap.get("missing" as any)).toBeUndefined();
		expect(stepMap.at(9)).toBeUndefined();
	});

	it("returns positions and neighbors", () => {
		expect(stepMap.indexOf("third")).toBe(2);
		expect(stepMap.has("second")).toBe(true);
		expect(stepMap.has("missing")).toBe(false);
		expect(stepMap.first()).toEqual(steps[0]);
		expect(stepMap.last()).toEqual(steps[2]);
		expect(stepMap.next("first")).toEqual(steps[1]);
		expect(stepMap.prev("third")).toEqual(steps[1]);
		expect(stepMap.next("missing" as any)).toBeUndefined();
		expect(stepMap.prev("missing" as any)).toBeUndefined();
		expect(stepMap.neighbors("second")).toEqual({
			prev: steps[0],
			next: steps[2],
		});
		expect(stepMap.neighbors("first")).toEqual({
			prev: undefined,
			next: steps[1],
		});
	});
});

describe("getInitialStepIndex", () => {
	it("returns 0 by default or when the id is not found", () => {
		expect(getInitialStepIndex(steps)).toBe(0);
		expect(getInitialStepIndex(steps, "missing" as any)).toBe(0);
	});

	it("returns the matching index", () => {
		expect(getInitialStepIndex(steps, "second")).toBe(1);
	});
});

describe("getInitialData", () => {
	it("returns a defensive copy", () => {
		const data = { first: { saved: true } };
		expect(getInitialData<typeof steps>(data)).toEqual(data);
		expect(getInitialData<typeof steps>(data)).not.toBe(data);
	});
});

describe("validateStep", () => {
	const schema = {
		"~standard": {
			version: 1 as const,
			vendor: "test",
			validate: (value: unknown) =>
				typeof value === "string" && value.length > 0
					? { value }
					: { issues: [{ message: "Required" }] },
		},
	};
	const withSchema = [{ id: "name", schema }, { id: "done" }] as const;

	it("succeeds for a step without a schema, passing the value through", async () => {
		const result = await validateStep(withSchema, "done", { anything: true });
		expect(result).toEqual({ success: true, data: { anything: true } });
	});

	it("returns success with the parsed value when the schema passes", async () => {
		const result = await validateStep(withSchema, "name", "Ada");
		expect(result).toEqual({ success: true, data: "Ada" });
	});

	it("returns issues when the schema fails", async () => {
		const result = await validateStep(withSchema, "name", "");
		expect(result.success).toBe(false);
		if (!result.success) expect(result.issues[0].message).toBe("Required");
	});

	it("throws for an unknown step id", async () => {
		await expect(validateStep(withSchema, "missing" as never, null)).rejects.toThrow(/not found/);
	});
});

describe("step statuses", () => {
	it("uses active/previous/upcoming", () => {
		expect(getStepStatus(steps, 1, "first")).toBe("previous");
		expect(getStepStatus(steps, 1, "second")).toBe("active");
		expect(getStepStatus(steps, 1, "third")).toBe("upcoming");
		expect(getStepStatuses(steps, 1)).toEqual({
			first: "previous",
			second: "active",
			third: "upcoming",
		});
	});
});

describe("parseStep", () => {
	it("returns the value when it matches a known step id", () => {
		expect(parseStep(steps, "second")).toBe("second");
	});

	it("returns undefined for unknown or malformed values", () => {
		expect(parseStep(steps, "missing")).toBeUndefined();
		expect(parseStep(steps, null)).toBeUndefined();
		expect(parseStep(steps, undefined)).toBeUndefined();
		expect(parseStep(steps, 42)).toBeUndefined();
	});
});

describe("matchStep", () => {
	it("runs the handler for the provided id", () => {
		expect(
			matchStep(steps, "second", {
				first: (step) => step.label,
				second: (step) => step.label,
				third: (step) => step.label,
			}),
		).toBe("Step 2");
	});

	it("throws when no exhaustive handler exists", () => {
		expect(() => matchStep(steps, "third", { first: (step: any) => step.label } as any)).toThrow(/No match handler/);
	});
});
