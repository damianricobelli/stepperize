import results from "@/lib/benchmark-results.json";
import { summarizePerformance } from "@/lib/benchmark-summary";

const formatNumber = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 0,
});
const groups = {
	local: "Local state",
	subscriptions: "Shared subscriptions",
	navigation: "Navigation",
	guards: "Guards and boundaries",
	reset: "Reset recipes",
	validation: "Schema validation",
	bundle: "Bundle size",
};
type Group = keyof typeof groups;
const change = (
	before: number,
	after: number,
	unit: string,
	subject = "v8",
) => {
	const tied = before === after;
	const improved = after < before;
	const percent = before === 0 ? undefined : ((after - before) / before) * 100;
	const delta = tied
		? "No change"
		: percent === undefined
			? "n/a"
			: `${percent > 0 ? "+" : ""}${Math.abs(percent) < 0.05 ? `${percent < 0 ? "−" : ""}<0.1` : percent.toFixed(1)}% ${unit}`;
	return (
		<span className="inline-flex items-center gap-2">
			<span aria-hidden="true">{tied ? "➖" : improved ? "✅" : "❌"}</span>
			<span className="sr-only">
				{`${subject} ${tied ? "ties" : improved ? "wins" : "loses"}: `}
			</span>
			{delta}
		</span>
	);
};

export function PerformanceTable({ group }: { group: Group }) {
	return (
		<div className="not-prose my-6">
			<section
				aria-label={`${groups[group]} benchmark results`}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard access to the horizontally scrollable table.
				tabIndex={0}
				className="overflow-x-auto rounded-xl border bg-card focus-visible:outline-2 focus-visible:outline-ring"
			>
				<table className="w-full min-w-[620px] text-left text-sm">
					<caption className="sr-only">
						{groups[group]}: v7 and v8 measurements. Lower values mean less
						time, renders, or code.
					</caption>
					<thead className="border-b bg-muted/60 text-xs text-muted-foreground">
						<tr>
							<th scope="col" className="px-4 py-3 font-medium">
								Scenario
							</th>
							<th scope="col" className="px-4 py-3 font-medium">
								v{results.versions.v7.version}
							</th>
							<th scope="col" className="px-4 py-3 font-medium">
								v{results.versions.v8.version}
							</th>
							<th scope="col" className="px-4 py-3 font-medium">
								v8 vs v7
							</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{results.scenarios
							.filter((scenario) => scenario.group === group)
							.map((scenario) => (
								<tr key={scenario.id}>
									<th scope="row" className="px-4 py-4 font-medium">
										{scenario.label}
										<span className="mt-1 block text-xs font-normal text-muted-foreground">
											{scenario.steps} steps
										</span>
									</th>
									{[scenario.v7, scenario.v8].map((value, index) => (
										<td
											key={index}
											className="whitespace-nowrap px-4 py-4 font-mono tabular-nums"
										>
											{value.medianMs.toFixed(2)} ms
											<span className="mt-1 block text-[11px] text-muted-foreground">
												IQR {value.q1Ms.toFixed(2)}–{value.q3Ms.toFixed(2)}
											</span>
											{scenario.kind !== "validation" && (
												<span className="mt-1 block text-[11px] text-muted-foreground">
													{value.minRenders === value.maxRenders
														? formatNumber.format(value.renders)
														: `${formatNumber.format(value.minRenders)}–${formatNumber.format(value.maxRenders)}`}{" "}
													renders
												</span>
											)}
										</td>
									))}
									<td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
										{change(scenario.v7.medianMs, scenario.v8.medianMs, "time")}
									</td>
								</tr>
							))}
						{group === "bundle" && (
							<tr>
								<th scope="row" className="px-4 py-4 font-medium">
									Minified library + core, gzip
								</th>
								<td className="whitespace-nowrap px-4 py-4 font-mono tabular-nums">
									{(results.versions.v7.gzipBytes / 1024).toFixed(2)} KiB
								</td>
								<td className="whitespace-nowrap px-4 py-4 font-mono tabular-nums">
									{(results.versions.v8.gzipBytes / 1024).toFixed(2)} KiB
								</td>
								<td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
									{change(
										results.versions.v7.gzipBytes,
										results.versions.v8.gzipBytes,
										"size",
									)}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</section>
		</div>
	);
}

export function BenchmarkSummary() {
	return (
		<div className="not-prose my-6 rounded-xl border bg-muted/40 p-5 text-sm leading-relaxed">
			<p className="font-medium">
				{results.configuration.scenarioCount} measured scenarios ·{" "}
				{results.measuredAt.slice(0, 10)}
			</p>
			<p className="mt-2 text-muted-foreground">
				React {results.environment.react} production ·{" "}
				{results.environment.browser} · {results.environment.cpu}.
			</p>
			<p className="mt-2 text-muted-foreground">
				Median of {results.configuration.repetitions} samples after{" "}
				{results.configuration.warmups} warmups for each version and scenario.
				IQR is the middle 50% of sample times in milliseconds. Lower is better;
				a positive change means more time or bytes in v8.
			</p>
			<p className="mt-2 text-muted-foreground">
				<span aria-hidden="true">✅</span> v8 wins ·{" "}
				<span aria-hidden="true">❌</span> v8 loses ·{" "}
				<span aria-hidden="true">➖</span> tie. These indicators compare the
				measured values; they do not establish statistical significance.
			</p>
			<a
				href="/benchmarks/v7-v8.json"
				download
				className="mt-3 inline-block font-medium text-primary underline underline-offset-4"
			>
				Download raw results
			</a>
		</div>
	);
}

export function BenchmarkEnvironment() {
	const entries = [
		["Measured at", results.measuredAt],
		[
			"Runtime",
			`${results.environment.browser}, React / React DOM ${results.environment.react}; Vitest ${results.environment.vitest}, Playwright ${results.environment.playwright}; Node ${results.environment.node} orchestrator`,
		],
		[
			"Machine",
			`${results.environment.cpu}, ${results.environment.arch}, ${results.environment.os}`,
		],
		[
			"Fixtures",
			`${results.configuration.scenarioCount} scenarios; each row records its step count, operations, readers and mount count in the raw JSON`,
		],
		[
			"Sampling",
			`${results.configuration.warmups} warmups + ${results.configuration.repetitions} measured samples per version and scenario`,
		],
		[
			"Bundler",
			`esbuild ${results.environment.esbuild}, ESM, ES2022, minified, gzip level 9`,
		],
		["v7 git commit", results.versions.v7.source],
		["v7 source SHA-256", results.versions.v7.sourceSha256],
		["v8 source SHA-256", results.versions.v8.sourceSha256],
		["Harness SHA-256", results.harnessSha256],
		["Lockfile SHA-256", results.environment.lockfileSha256],
	];
	return (
		<dl className="not-prose my-6 divide-y rounded-xl border px-5 text-sm">
			{entries.map(([label, value]) => (
				<div
					key={label}
					className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
				>
					<dt className="font-medium">{label}</dt>
					<dd className="min-w-0 break-words font-mono text-xs leading-relaxed text-muted-foreground">
						{value}
					</dd>
				</div>
			))}
		</dl>
	);
}

export function HeadlessBundleTable() {
	return (
		<div className="not-prose my-6 overflow-x-auto rounded-xl border bg-card">
			<table className="w-full text-left text-sm">
				<caption className="px-4 py-3 text-left text-muted-foreground">
					v8 full entry vs v8 headless, including core. React is external.
				</caption>
				<thead className="border-b bg-muted/60">
					<tr>
						{["Size", "v8 full", "v8 headless", "Headless vs full"].map(
							(label) => (
								<th key={label} scope="col" className="px-4 py-3 font-medium">
									{label}
								</th>
							),
						)}
					</tr>
				</thead>
				<tbody className="divide-y">
					{(
						[
							["Minified", "minifiedBytes"],
							["Minified + gzip", "gzipBytes"],
						] as const
					).map(([label, key]) => (
						<tr key={key}>
							<th scope="row" className="px-4 py-4 font-medium">
								{label}
							</th>
							{[results.versions.v8[key], results.headless[key]].map(
								(bytes, index) => (
									<td
										key={index}
										className="whitespace-nowrap px-4 py-4 font-mono tabular-nums"
									>
										{(bytes / 1024).toFixed(2)} KiB
									</td>
								),
							)}
							<td className="whitespace-nowrap px-4 py-4">
								{change(
									results.versions.v8[key],
									results.headless[key],
									"size",
									"Headless",
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function PerformanceHighlights() {
	const summary = summarizePerformance(results.scenarios);
	const reduced = summary.timeReductionPercent >= 0;
	return (
		<section
			aria-label="Overall benchmark summary"
			className="not-prose my-6 rounded-xl border bg-card p-5"
		>
			<div className="grid gap-6 sm:grid-cols-3">
				<div>
					<p className="text-3xl font-semibold tabular-nums">
						{Math.abs(summary.timeReductionPercent).toFixed(1)}%
					</p>
					<p className="mt-1 text-sm">
						{reduced ? "Lower" : "Higher"} benchmark time index
					</p>
				</div>
				<div>
					<p className="text-3xl font-semibold tabular-nums">
						{summary.wins}/{summary.count}
					</p>
					<p className="mt-1 text-sm">Scenarios with lower median time</p>
				</div>
				<div>
					<p className="text-3xl font-semibold tabular-nums">
						{summary.losses}
					</p>
					<p className="mt-1 text-sm">Scenarios with higher median time</p>
				</div>
			</div>
			<p className="mt-5 text-sm text-muted-foreground">
				v8 vs v7 · {results.measuredAt.slice(0, 10)} · Equal-weight geometric
				mean across all {summary.count} median time ratios, including
				regressions. Chromium, React production. This is a benchmark index, not
				an estimate of your app’s latency. {summary.ties} ties.
			</p>
		</section>
	);
}
