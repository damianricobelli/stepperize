import { summarizePerformance } from "../../apps/docs/src/lib/benchmark-summary.ts";

const colors = { green: 32, red: 31, dim: 2, bold: 1 };

/** Human-readable console output; the raw samples remain in the JSON artifacts. */
export function printReport(result, { stream = process.stdout } = {}) {
	const color = stream.isTTY && !Object.hasOwn(process.env, "NO_COLOR") && process.env.TERM !== "dumb";
	const paint = (text, style) => (color ? `\x1b[${colors[style]}m${text}\x1b[0m` : text);
	const write = (line = "") => stream.write(`${line}\n`);
	const count = (value) => value.toLocaleString("en-US");
	const names = [result.versions.v7.version, result.versions.v8.version].map((version) => `v${version}`);
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
	table(
		["Scenario", `${names[0]} ms`, `${names[1]} ms`, "Δ time", "Renders v7 → v8", "v8 result"],
		result.scenarios.map((scenario) => {
			const [delta, verdict] = comparison(scenario.v7.medianMs, scenario.v8.medianMs);
			return [
				scenario.label,
				scenario.v7.medianMs.toFixed(3),
				scenario.v8.medianMs.toFixed(3),
				delta,
				scenario.kind === "validation" ? "—" : `${renderCount(scenario.v7)} → ${renderCount(scenario.v8)}`,
				verdict,
			];
		}),
	);
	write();
	const [sizeDelta, sizeVerdict] = comparison(result.versions.v7.gzipBytes, result.versions.v8.gzipBytes);
	table(
		["Bundle", `${names[0]} KiB`, `${names[1]} KiB`, "Δ size", "v8 result"],
		[
			[
				"Library + core · minified + gzip",
				(result.versions.v7.gzipBytes / 1024).toFixed(2),
				(result.versions.v8.gzipBytes / 1024).toFixed(2),
				sizeDelta,
				sizeVerdict,
			],
		],
	);
	if (result.headless) {
		write();
		table(
			["v8 entry + core", "Full KiB", "Headless KiB", "Δ gzip", "Headless result"],
			[
				[
					"Own UI: hooks + Provider, no primitives",
					(result.versions.v8.gzipBytes / 1024).toFixed(2),
					(result.headless.gzipBytes / 1024).toFixed(2),
					...comparison(result.versions.v8.gzipBytes, result.headless.gzipBytes),
				],
			],
		);
	}
	const { wins, losses, ties, count: scenarioCount, timeReductionPercent } = summarizePerformance(result.scenarios);
	write();
	write(`Timing: ${paint(`✓ ${wins} wins`, "green")} · ${paint(`✗ ${losses} losses`, "red")} · = ${ties} ties`);
	write(
		`Overall time index: ${Math.abs(timeReductionPercent).toFixed(1)}% ${timeReductionPercent >= 0 ? "lower" : "higher"} · geometric mean of all ${scenarioCount} v8/v7 median ratios, including regressions.`,
	);
	write("This suite-level index does not predict application latency. Bundle size is separate.");
	write(paint("Lower is better. Signs compare measured medians, not statistical significance.", "dim"));
}
