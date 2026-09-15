type Timing = { v7: { medianMs: number }; v8: { medianMs: number } };

/** Equal-weight geometric mean of every scenario's median time ratio (v8 / v7). */
export function summarizePerformance(scenarios: readonly Timing[]) {
	if (!scenarios.length)
		throw new Error("Cannot summarize an empty benchmark.");
	let logs = 0;
	let wins = 0;
	let losses = 0;
	for (const { v7, v8 } of scenarios) {
		if (
			![v7.medianMs, v8.medianMs].every(
				(time) => Number.isFinite(time) && time > 0,
			)
		) {
			throw new Error("Benchmark medians must be finite and positive.");
		}
		logs += Math.log(v8.medianMs) - Math.log(v7.medianMs);
		if (v8.medianMs < v7.medianMs) wins++;
		if (v8.medianMs > v7.medianMs) losses++;
	}
	const timeRatio = Math.exp(logs / scenarios.length);
	return {
		count: scenarios.length,
		wins,
		losses,
		ties: scenarios.length - wins - losses,
		timeRatio,
		timeReductionPercent: (1 - timeRatio) * 100,
	};
}
