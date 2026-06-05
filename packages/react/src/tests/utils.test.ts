import { describe, expect, it } from "vitest";
import { getStatuses } from "../utils";

const steps = [
	{ id: "first", label: "Step 1" },
	{ id: "second", label: "Step 2" },
	{ id: "third", label: "Step 3" },
];

describe("getStatuses", () => {
	it("returns active for current index, previous for past, upcoming for future", () => {
		expect(getStatuses(steps, 0)).toEqual({
			first: "active",
			second: "upcoming",
			third: "upcoming",
		});
		expect(getStatuses(steps, 1)).toEqual({
			first: "previous",
			second: "active",
			third: "upcoming",
		});
		expect(getStatuses(steps, 2)).toEqual({
			first: "previous",
			second: "previous",
			third: "active",
		});
	});
});
