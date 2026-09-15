import { expect, it } from "vitest";
import { summarizePerformance } from "./benchmark-summary";

const timing = (before: number, after: number) => ({
	v7: { medianMs: before },
	v8: { medianMs: after },
});

it("includes regressions and gives fast and slow scenarios equal weight", () => {
	const result = summarizePerformance([
		timing(1000, 500),
		timing(1, 2),
		timing(3, 3),
	]);
	expect(result.timeRatio).toBeCloseTo(1);
	expect(result.timeReductionPercent).toBeCloseTo(0);
	expect(result).toMatchObject({ count: 3, wins: 1, losses: 1, ties: 1 });
});

it("reports time reduction rather than confusing it with speedup", () => {
	expect(
		summarizePerformance([timing(20, 10), timing(2, 1)]).timeReductionPercent,
	).toBeCloseTo(50);
	expect(
		summarizePerformance([timing(10, 20)]).timeReductionPercent,
	).toBeCloseTo(-100);
});

it("rejects missing or invalid timings instead of publishing a misleading number", () => {
	expect(() => summarizePerformance([])).toThrow();
	for (const value of [0, -1, NaN, Infinity]) {
		expect(() => summarizePerformance([timing(1, value)])).toThrow();
		expect(() => summarizePerformance([timing(value, 1)])).toThrow();
	}
});
