import { assert } from "vitest";

// All timed work runs in Chromium with one bundled production React runtime.
export async function runBenchmarks({ React, createRoot, flushSync, v7, v8 }) {
	const libraries = { v7, v8 };
	assert.strictEqual(typeof globalThis.gc, "function", "Chromium must expose GC");
	assert.strictEqual(globalThis.crossOriginIsolated, true, "High-resolution timers require isolation");
	// Yield a browser task without setTimeout's nested-timer clamp.
	const nextTurn = () =>
		new Promise((resolve) => {
			const channel = new MessageChannel();
			channel.port1.onmessage = () => {
				channel.port1.close();
				channel.port2.close();
				resolve();
			};
			channel.port2.postMessage(null);
		});
	const warmups = 5;
	const repetitions = 21;
	const specifications = [
		{ id: "mount", group: "local", label: "Mount 100 local flows", kind: "mount", mounts: 100 },
		{
			id: "mount-large",
			group: "local",
			label: "Mount 100 local flows · 100 steps",
			kind: "mount",
			mounts: 100,
			steps: 100,
		},
		{ id: "local-data", group: "local", label: "200 local data writes", kind: "data" },
		{ id: "local-data-large", group: "local", label: "200 local data writes · 100 steps", kind: "data", steps: 100 },
		{
			id: "shared-full",
			group: "subscriptions",
			label: "200 data writes · 20 full-state readers",
			kind: "data",
			readers: 20,
		},
		{
			id: "shared-id",
			group: "subscriptions",
			label: "200 data writes · 20 id readers",
			kind: "data",
			readers: 20,
			select: "id",
		},
		{
			id: "shared-id-large",
			group: "subscriptions",
			label: "200 data writes · 100 id readers",
			kind: "data",
			readers: 100,
			select: "id",
		},
		{
			id: "shared-data",
			group: "subscriptions",
			label: "200 data writes · 20 data readers",
			kind: "data",
			readers: 20,
			select: "data",
		},
		{
			id: "shared-completion",
			group: "subscriptions",
			label: "200 completion toggles · 20 completion readers",
			kind: "completion",
			readers: 20,
			select: "completion",
		},
		{ id: "navigation", group: "navigation", label: "200 next / prev moves", kind: "navigation" },
		{
			id: "navigation-large",
			group: "navigation",
			label: "200 first / last jumps · 100 steps",
			kind: "jump",
			steps: 100,
		},
		{
			id: "controlled",
			group: "navigation",
			label: "200 controlled moves · 20 id readers",
			kind: "navigation",
			readers: 20,
			select: "id",
			controlled: true,
		},
		{ id: "payload", group: "navigation", label: "200 next / prev moves with data", kind: "payload" },
		{
			id: "guard-allow",
			group: "guards",
			label: "200 moves · accepting sync guard",
			kind: "navigation",
			guard: "allow",
		},
		{
			id: "guard-block",
			group: "guards",
			label: "200 attempts · blocking sync guard",
			kind: "blocked",
			guard: "block",
		},
		{
			id: "guard-async",
			group: "guards",
			label: "200 moves · accepting microtask guard",
			kind: "navigation",
			guard: "async",
		},
		{ id: "boundary", group: "guards", label: "200 prev attempts at the first step", kind: "boundary" },
		{ id: "reset-preserve", group: "reset", label: "100 goTo / reset pairs · preserve data", kind: "reset-preserve" },
		{
			id: "reset-full",
			group: "reset",
			label: "100 full resets · setup excluded",
			kind: "reset-full",
			operations: 100,
		},
		{
			id: "schema-valid",
			group: "validation",
			label: "200 valid schema checks · last of 100 steps",
			kind: "validation",
			steps: 100,
			valid: true,
		},
		{
			id: "schema-invalid",
			group: "validation",
			label: "200 invalid schema checks · last of 100 steps",
			kind: "validation",
			steps: 100,
			valid: false,
		},
	];
	const scenarios = specifications.map((spec) => ({ steps: 10, readers: 0, mounts: 1, operations: 200, ...spec }));
	const numberSchema = {
		"~standard": {
			version: 1,
			vendor: "benchmark-fixture",
			validate: (value) => (typeof value === "number" ? { value } : { issues: [{ message: "Expected a number" }] }),
		},
	};
	const definitions = Object.fromEntries(
		scenarios.map((scenario) => [
			scenario.id,
			Object.fromEntries(
				Object.entries(libraries).map(([version, library]) => [
					version,
					library.defineStepper(
						Array.from({ length: scenario.steps }, (_, i) => ({
							id: `step-${i}`,
							...(scenario.kind === "validation" ? { schema: numberSchema } : {}),
						})),
					),
				]),
			),
		]),
	);

	async function measure(version, scenario) {
		const flow = definitions[scenario.id][version];
		const lastId = `step-${scenario.steps - 1}`;
		if (scenario.kind === "validation") {
			const values = [];
			const start = performance.now();
			for (let i = 0; i < scenario.operations; i++)
				values.push(await flow.validate(lastId, scenario.valid ? i : "invalid"));
			const ms = performance.now() - start;
			values.forEach((value, i) => {
				assert.strictEqual(value.success, scenario.valid);
				if (scenario.valid) assert.strictEqual(value.data, i);
				else assert.deepEqual(value.issues, [{ message: "Expected a number" }]);
			});
			return { ms, renders: 0 };
		}
		let api;
		let renderCount = 0;
		let guardCalls = 0;
		const guard = scenario.guard
			? () => {
					guardCalls++;
					return scenario.guard === "async" ? Promise.resolve(true) : scenario.guard !== "block";
				}
			: undefined;
		const config = { beforeStepChange: guard, defaultData: { "step-0": "seed" } };
		const sharedHook = version === "v7" ? flow.useStepper : flow.useStepperContext;
		const selection = (state) =>
			scenario.select === "data"
				? state.data.get("step-0")
				: scenario.select === "completion"
					? state.isComplete("step-0")
					: state.id;
		function Driver() {
			api = sharedHook();
			return null;
		}
		function Reader() {
			const value = scenario.select && version === "v8" ? flow.useStepperContext(selection) : selection(sharedHook());
			renderCount++;
			return React.createElement("span", null, String(value));
		}
		function Local() {
			api = flow.useStepper(config);
			renderCount++;
			return React.createElement("span", null, scenario.kind === "data" ? String(api.data.get("step-0")) : api.id);
		}
		function Owner({ children }) {
			const [step, setStep] = React.useState("step-0");
			return React.createElement(
				flow.Provider,
				{ ...config, ...(scenario.controlled ? { step, onStepChange: (id) => setStep(id) } : {}) },
				children,
			);
		}
		const container = document.createElement("div");
		document.body.append(container);
		const renderer = createRoot(container);
		const children =
			scenario.kind === "mount"
				? React.createElement(
						React.Fragment,
						null,
						Array.from({ length: scenario.mounts }, (_, key) => React.createElement(Local, { key })),
					)
				: scenario.readers
					? React.createElement(
							Owner,
							null,
							React.createElement(Driver),
							Array.from({ length: scenario.readers }, (_, key) => React.createElement(Reader, { key })),
						)
					: React.createElement(Local);
		const accepted = (result) => (version === "v7" ? result : result.accepted);
		async function transition(action) {
			let pending;
			flushSync(() => {
				pending = action();
			});
			const result = await pending;
			// Same event-loop yield for both versions: let guarded/controlled commits finish.
			await nextTurn();
			return result;
		}
		function assertDom() {
			const value = scenario.readers
				? String(selection(api))
				: scenario.kind === "data"
					? String(api.data.get("step-0"))
					: api.id;
			assert.strictEqual(container.textContent, value.repeat(scenario.readers || 1));
		}
		try {
			if (scenario.kind === "mount") {
				const start = performance.now();
				flushSync(() => renderer.render(children));
				const ms = performance.now() - start;
				assert.strictEqual(container.textContent, "step-0".repeat(scenario.mounts));
				assert.strictEqual(renderCount, scenario.mounts);
				return { ms, renders: renderCount };
			}
			flushSync(() => renderer.render(children));
			renderCount = 0;
			let ms;
			if (["data", "completion"].includes(scenario.kind)) {
				const start = performance.now();
				for (let i = 0; i < scenario.operations; i++)
					flushSync(() => {
						if (scenario.kind === "data") api.data.set("step-0", i);
						else api.setComplete("step-0", i % 2 === 0);
					});
				ms = performance.now() - start;
				if (scenario.kind === "data") assert.strictEqual(api.data.get("step-0"), scenario.operations - 1);
				else assert.strictEqual(api.isComplete("step-0"), false);
				assert.strictEqual(api.id, "step-0");
			} else if (scenario.kind === "reset-full") {
				ms = 0;
				let resetRenders = 0;
				for (let i = 0; i < scenario.operations; i++) {
					flushSync(() => {
						api.data.set("step-0", i);
						api.setComplete("step-0", true);
					});
					assert.strictEqual(accepted(await transition(() => api.goTo(lastId))), true);
					assert.strictEqual(api.data.get("step-0"), i);
					assert.strictEqual(api.isComplete("step-0"), true);
					renderCount = 0;
					const start = performance.now();
					const result = await transition(() => {
						if (version === "v7") {
							api.data.reset();
							api.setComplete("step-0", false);
						}
						return api.reset();
					});
					ms += performance.now() - start;
					resetRenders += renderCount;
					assert.strictEqual(accepted(result), true);
					assert.strictEqual(api.id, "step-0");
					assert.deepEqual(api.data.all(), { "step-0": "seed" });
					assert.deepEqual(api.completed, []);
				}
				renderCount = resetRenders;
			} else {
				const outcomes = [];
				const visited = [];
				const pendingStates = [];
				if (scenario.kind === "reset-preserve")
					flushSync(() => {
						api.data.set("step-0", "retained");
						api.setComplete("step-0", true);
					});
				renderCount = 0;
				const start = performance.now();
				for (let i = 0; i < scenario.operations; i++) {
					outcomes.push(
						await transition(() => {
							if (scenario.kind === "boundary") return api.prev();
							if (scenario.kind === "blocked") return api.next();
							if (scenario.kind === "jump") return api.goTo(i % 2 === 0 ? lastId : "step-0");
							if (scenario.kind === "reset-preserve")
								return i % 2 === 0
									? api.goTo(lastId)
									: version === "v8"
										? api.reset({ keepData: true, keepCompleted: true })
										: api.reset();
							return i % 2 === 0
								? api.next(scenario.kind === "payload" ? { data: i } : undefined)
								: api.prev(scenario.kind === "payload" ? { data: i } : undefined);
						}),
					);
					visited.push(api.id);
					pendingStates.push(api.isPending);
				}
				ms = performance.now() - start;
				const rejected = ["boundary", "blocked"].includes(scenario.kind);
				outcomes.forEach((result, i) => {
					assert.strictEqual(accepted(result), !rejected);
					if (rejected && version === "v8")
						assert.strictEqual(result.reason, scenario.kind === "boundary" ? "boundary" : "guard");
					assert.strictEqual(
						visited[i],
						rejected || i % 2 === 1 ? "step-0" : ["jump", "reset-preserve"].includes(scenario.kind) ? lastId : "step-1",
					);
					assert.strictEqual(pendingStates[i], false);
				});
				assert.strictEqual(guardCalls, scenario.guard ? scenario.operations : 0);
				if (scenario.kind === "payload") {
					assert.strictEqual(api.data.get("step-0"), scenario.operations - 2);
					assert.strictEqual(api.data.get("step-1"), scenario.operations - 1);
				}
				if (scenario.kind === "reset-preserve") {
					assert.strictEqual(api.data.get("step-0"), "retained");
					assert.deepEqual(api.completed, ["step-0"]);
				}
			}
			assertDom();
			const result = { ms, renders: renderCount };
			// After timing, check that selectors react to a relevant change.
			if (scenario.readers && ["data", "completion"].includes(scenario.kind)) {
				const previousRenders = renderCount;
				if (scenario.select === "data") flushSync(() => api.data.set("step-0", "changed"));
				else if (scenario.select === "completion") flushSync(() => api.setComplete("step-0", true));
				else assert.strictEqual(accepted(await transition(() => api.next())), true);
				assert.strictEqual(renderCount - previousRenders, scenario.readers);
				assertDom();
			}
			return result;
		} finally {
			flushSync(() => renderer.unmount());
			container.remove();
		}
	}
	const quantile = (sorted, fraction) => {
		const position = (sorted.length - 1) * fraction;
		const low = Math.floor(position);
		return sorted[low] + (sorted[Math.ceil(position)] - sorted[low]) * (position - low);
	};
	for (const scenario of scenarios) {
		const samples = { v7: [], v8: [] };
		for (let round = -warmups; round < repetitions; round++) {
			for (const version of Math.abs(round) % 2 === 0 ? ["v7", "v8"] : ["v8", "v7"]) {
				globalThis.gc();
				const result = await measure(version, scenario);
				if (round >= 0) samples[version].push(result);
			}
		}
		for (const version of ["v7", "v8"]) {
			const sorted = samples[version].map((sample) => sample.ms).sort((a, b) => a - b);
			const counts = samples[version].map((sample) => sample.renders).sort((a, b) => a - b);
			scenario[version] = {
				medianMs: quantile(sorted, 0.5),
				q1Ms: quantile(sorted, 0.25),
				q3Ms: quantile(sorted, 0.75),
				renders: quantile(counts, 0.5),
				minRenders: counts[0],
				maxRenders: counts.at(-1),
				samples: samples[version],
			};
		}
	}
	return {
		configuration: {
			warmups,
			repetitions,
			scenarioCount: scenarios.length,
			timer: "performance.now",
			scheduler: "MessageChannel",
			explicitGc: true,
			crossOriginIsolated: globalThis.crossOriginIsolated,
		},
		scenarios,
	};
}
