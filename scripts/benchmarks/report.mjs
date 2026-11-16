/** Scenarios where the two versions do not do the same amount of work. See the adapters in measure.mjs. */
const CAVEATS = {
	"shared-completion": "v9 has no completion setter: written through restore()",
	navigation: "v9 next() also completes the step and records history",
	controlled: "v8 step + onStepChange · v9 step + onChange",
	payload: "v9 prev() takes no data: setData() + prev()",
	"guard-allow": "v9 next() also completes the step and records history",
	"guard-async": "v9 next() also completes the step and records history",
	"reset-preserve": "v9 has no partial reset: restore({ step })",
	"reset-full": "v9 completion set up through restore()",
	"schema-valid": "v8 definition.validate() · v9 validates inside next() and finishes the flow",
	"schema-invalid": "v8 definition.validate() · v9 validates inside next() and stores draft + issues",
};

// Interquartile ranges that overlap mean the medians cannot be told apart in this run.
const overlaps = (a, b) => a.q1Ms <= b.q3Ms && b.q1Ms <= a.q3Ms;

/** Equal-weight geometric mean of every scenario's median time ratio (v9 / v8). Noise counts as a tie. */
function summarize(scenarios) {
	let logs = 0;
	let wins = 0;
	let losses = 0;
	for (const { v8, v9 } of scenarios) {
		logs += Math.log(v9.medianMs) - Math.log(v8.medianMs);
		if (overlaps(v8, v9)) continue;
		if (v9.medianMs < v8.medianMs) wins++;
		if (v9.medianMs > v8.medianMs) losses++;
	}
	return {
		count: scenarios.length,
		wins,
		losses,
		ties: scenarios.length - wins - losses,
		timeReductionPercent: (1 - Math.exp(logs / scenarios.length)) * 100,
	};
}

const colors = { green: 32, red: 31, dim: 2, bold: 1 };

/** Human-readable console output; the raw samples remain in the JSON artifacts. */
export function printReport(result, { stream = process.stdout } = {}) {
	// biome-ignore lint/suspicious/noUndeclaredEnvVars: terminal capability check for a script run outside turbo.
	const color = stream.isTTY && !Object.hasOwn(process.env, "NO_COLOR") && process.env.TERM !== "dumb";
	const paint = (text, style) => (color ? `\x1b[${colors[style]}m${text}\x1b[0m` : text);
	const write = (line = "") => stream.write(`${line}\n`);
	const count = (value) => value.toLocaleString("en-US");
	const names = [result.versions.v8.version, result.versions.v9.version].map((version) => `v${version}`);
	const comparison = (before, after) => {
		if (before === after) return ["0.0%", "= TIE"];
		const difference = before === 0 ? Infinity : Math.abs(((after - before) / before) * 100);
		const percent = !Number.isFinite(difference) ? "n/a" : `${difference < 0.05 ? "<0.1" : difference.toFixed(1)}%`;
		return [`${after < before ? "−" : "+"}${percent}`, after < before ? "✓ WIN" : "✗ LOSS"];
	};
	const wrap = (text, width) => {
		const lines = [];
		let line = "";
		for (const word of text.split(" ")) {
			if (line && line.length + word.length + 1 > width) {
				lines.push(line);
				line = "";
			}
			line += `${line ? " " : ""}${word}`;
		}
		return [...lines, line];
	};
	const table = (headers, rows) => {
		const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index].length)));
		const overhead = widths.slice(1).reduce((sum, width) => sum + width, 0) + headers.length * 3 + 1;
		widths[0] = Math.min(widths[0], Math.max(24, (stream.columns || 120) - overhead));
		const border = (left, middle, right) =>
			`${left}${widths.map((width) => "─".repeat(width + 2)).join(middle)}${right}`;
		const row = (cells, heading = false) => {
			const lines = cells.map((cell, index) => wrap(cell, widths[index]));
			for (let line = 0; line < Math.max(...lines.map((cell) => cell.length)); line++) {
				const padded = lines.map((cell, index) => {
					const value = cell[line] || "";
					const text = index === 0 ? value.padEnd(widths[index]) : value.padStart(widths[index]);
					return heading
						? paint(text, "bold")
						: value === "✓ WIN"
							? paint(text, "green")
							: value === "✗ LOSS"
								? paint(text, "red")
								: text;
				});
				write(`│ ${padded.join(" │ ")} │`);
			}
		};
		write(border("┌", "┬", "┐"));
		row(headers, true);
		write(border("├", "┼", "┤"));
		for (const cells of rows) row(cells);
		write(border("└", "┴", "┘"));
	};
	const renderCount = (sample) =>
		sample.minRenders === sample.maxRenders
			? count(sample.renders)
			: `${count(sample.minRenders)}–${count(sample.maxRenders)}`;

	write();
	write(paint(`Stepperize performance · ${names[0]} → ${names[1]}`, "bold"));
	write(
		`${result.environment.node} · ${result.environment.browser} · React ${result.environment.react} · ${result.environment.cpu}`,
	);
	write(`${result.configuration.repetitions} samples · ${result.configuration.warmups} warmups · median times`);
	write();
	const noted = [];
	table(
		["Scenario", `${names[0]} ms`, `${names[1]} ms`, "Δ time", "Renders v8 → v9", "v9 result"],
		result.scenarios.map((scenario) => {
			const [delta, verdict] = comparison(scenario.v8.medianMs, scenario.v9.medianMs);
			const caveat = CAVEATS[scenario.id];
			if (caveat) noted.push(`  * ${scenario.label}: ${caveat}`);
			return [
				`${scenario.label}${caveat ? " *" : ""}`,
				scenario.v8.medianMs.toFixed(3),
				scenario.v9.medianMs.toFixed(3),
				delta,
				["validation", "primitives"].includes(scenario.kind)
					? "—"
					: `${renderCount(scenario.v8)} → ${renderCount(scenario.v9)}`,
				overlaps(scenario.v8, scenario.v9) ? "≈ NOISE" : verdict,
			];
		}),
	);
	write();
	table(
		["Bundle · minified + gzip", `${names[0]} KiB`, `${names[1]} KiB`, "Δ size", "v9 result"],
		[
			["Full entry + core", "gzipBytes"],
			["Headless entry + core", "headlessGzipBytes"],
		].map(([label, key]) => [
			label,
			(result.versions.v8[key] / 1024).toFixed(2),
			(result.versions.v9[key] / 1024).toFixed(2),
			...comparison(result.versions.v8[key], result.versions.v9[key]),
		]),
	);
	const { wins, losses, ties, count: scenarioCount, timeReductionPercent } = summarize(result.scenarios);
	write();
	write(`Timing: ${paint(`✓ ${wins} wins`, "green")} · ${paint(`✗ ${losses} losses`, "red")} · ≈ ${ties} within noise`);
	write(
		`Overall time index: ${Math.abs(timeReductionPercent).toFixed(1)}% ${timeReductionPercent >= 0 ? "lower" : "higher"} · geometric mean of all ${scenarioCount} v9/v8 median ratios, including regressions.`,
	);
	write("This suite-level index does not predict application latency. Bundle size is separate.");
	if (noted.length) {
		write();
		write("* Not the same work on both sides:");
		for (const line of noted) write(line);
	}
	write();
	write(
		paint(
			"Lower is better. ≈ NOISE: the interquartile ranges overlap in this run. Wins and losses still need to repeat across runs.",
			"dim",
		),
	);
}
