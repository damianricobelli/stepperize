import { assert } from "vitest";

// All timed work runs in Chromium with one bundled production React runtime.
export async function runBenchmarks({ React, createRoot, flushSync, v8, v9 }) {
	const libraries = { v8, v9 };
	const h = React.createElement;
	const SEED = { "step-0": "seed" };
	/** Step whose completion the completion scenarios toggle. Not the current one: v9 reports that as "current". */
	const WATCHED = "step-1";
	const done = { accepted: true };
	/**
	 * Each version runs the same scenario through its own public API. Where the two
	 * are not the same amount of work, the comment says so; the report repeats it.
	 */
	const adapters = {
		v8: {
			config: (guard) => ({ beforeStepChange: guard, defaultData: SEED }),
			controlled: (step, setStep) => ({ step, onStepChange: (id) => setStep(id) }),
			id: (api) => api.id,
			data: (api, id) => api.data.get(id),
			allData: (api) => api.data.all(),
			completed: (api) => api.completed,
			isComplete: (api, id) => api.isComplete(id),
			setData: (api, id, value) => api.data.set(id, value),
			setComplete: (api, id, value) => api.setComplete(id, value),
			next: (api, payload) => api.next(payload === undefined ? undefined : { data: payload }),
			prev: (api, payload) => api.prev(payload === undefined ? undefined : { data: payload }),
			reset: (api) => api.reset(),
			resetKeeping: (api) => api.reset({ keepData: true, keepCompleted: true }),
			// Standalone validation on the definition.
			validator: (flow, id) => async (value) => {
				const result = await flow.validate(id, value);
				return { valid: result.success, value: result.data, issues: result.issues };
			},
			primitives: (flow, steps) =>
				h(
					flow.Stepper.Root,
					null,
					h(
						flow.Stepper.List,
						null,
						h(flow.Stepper.Items, null, (step) => item(flow, step)),
					),
					steps.map((step) => h(flow.Stepper.Content, { key: step.id, step: step.id }, step.title)),
					h(flow.Stepper.Prev, null, "Back"),
					h(flow.Stepper.Next, null, "Next"),
				),
		},
		v9: {
			config: (guard) => ({ guard, snapshot: { data: SEED } }),
			controlled: (step, setStep) => ({ step, onChange: (snapshot) => setStep(snapshot.step) }),
			id: (api) => api.current.id,
			data: (api, id) => api.data[id],
			allData: (api) => api.data,
			completed: (api) => api.snapshot().complete,
			isComplete: (api, id) => api.state(id) === "complete",
			setData: (api, id, value) => api.setData(id, value),
			// v9 has no completion setter (next() completes). `restore` is the public way to write it,
			// and it rebuilds the whole state, so this is more work than v8's `setComplete`.
			setComplete: (api, id, value) => api.restore({ complete: value ? [id] : [] }),
			// v9 `next()` also validates (no schema here), completes the step and records history.
			next: (api, payload) => (payload === undefined ? api.next() : api.next(payload)),
			// v9 `prev()` takes no data: write it first, in the same batch.
			prev: (api, payload) => {
				if (payload !== undefined) api.setData(api.current.id, payload);
				return api.prev();
			},
			reset: (api) => {
				api.reset();
				return done;
			},
			// v9 has no partial reset: restoring only the position keeps data and completion.
			resetKeeping: (api) => {
				api.restore({ step: "step-0", history: [] });
				return done;
			},
			// v9 validates inside `next()`: a framework-free flow parked on the last step, so a valid
			// value also finishes the flow (a state write) and an invalid one stores draft and issues.
			validator: (flow, id) => {
				const machine = flow.create({ snapshot: { step: id } });
				return async (value) => {
					const result = await machine.next(value);
					return { valid: result.accepted, value: result.data?.[id], issues: result.issues };
				};
			},
			primitives: (flow, steps) =>
				h(
					flow.Stepper.Root,
					null,
					h(flow.Stepper.List, null, (step) => item(flow, step)),
					steps.map((step) => h(flow.Stepper.Content, { key: step.id, step: step.id }, step.title)),
					h(flow.Stepper.Prev, null, "Back"),
					h(flow.Stepper.Next, null, "Next"),
				),
		},
	};
	const item = (flow, step) =>
		h(
			flow.Stepper.Item,
			{ key: step.id, step: step.id },
			h(flow.Stepper.Trigger, null, h(flow.Stepper.Indicator), h(flow.Stepper.Title)),
		);
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
		{
			id: "mount-primitives",
			group: "local",
			label: "Mount 20 primitive steppers · 10 steps",
			kind: "primitives",
			mounts: 20,
		},
		{
			id: "mount-primitives-large",
			group: "local",
			label: "Mount 5 primitive steppers · 100 steps",
			kind: "primitives",
			mounts: 5,
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
							title: `Step ${i}`,
							...(scenario.kind === "validation" ? { schema: numberSchema } : {}),
						})),
					),
				]),
			),
		]),
	);

	async function measure(version, scenario) {
		const flow = definitions[scenario.id][version];
		const use = adapters[version];
		const lastId = `step-${scenario.steps - 1}`;
		if (scenario.kind === "validation") {
			const validate = use.validator(flow, lastId);
			const values = [];
			const start = performance.now();
			for (let i = 0; i < scenario.operations; i++) values.push(await validate(scenario.valid ? i : "invalid"));
			const ms = performance.now() - start;
			values.forEach((value, i) => {
				assert.strictEqual(value.valid, scenario.valid);
				if (scenario.valid) assert.strictEqual(value.value, i);
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
		const config = use.config(guard);
		const selection = (state) =>
			scenario.select === "data"
				? use.data(state, "step-0")
				: scenario.select === "completion"
					? use.isComplete(state, WATCHED)
					: use.id(state);
		function Driver() {
			api = flow.useStepperContext();
			return null;
		}
		function Reader() {
			const value = scenario.select ? flow.useStepperContext(selection) : selection(flow.useStepperContext());
			renderCount++;
			return React.createElement("span", null, String(value));
		}
		function Local() {
			api = flow.useStepper(config);
			renderCount++;
			return React.createElement(
				"span",
				null,
				scenario.kind === "data" ? String(use.data(api, "step-0")) : use.id(api),
			);
		}
		function Owner({ children }) {
			const [step, setStep] = React.useState("step-0");
			return React.createElement(
				flow.Provider,
				{ ...config, ...(scenario.controlled ? use.controlled(step, setStep) : {}) },
				children,
			);
		}
		const container = document.createElement("div");
		document.body.append(container);
		const renderer = createRoot(container);
		const children =
			scenario.kind === "primitives"
				? null
				: scenario.kind === "mount"
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
		const accepted = (result) => result.accepted;
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
					? String(use.data(api, "step-0"))
					: use.id(api);
			assert.strictEqual(container.textContent, value.repeat(scenario.readers || 1));
		}
		try {
			if (scenario.kind === "primitives") {
				const steps = flow.steps;
				const start = performance.now();
				flushSync(() =>
					renderer.render(
						React.createElement(
							React.Fragment,
							null,
							Array.from({ length: scenario.mounts }, (_, key) =>
								React.createElement(React.Fragment, { key }, use.primitives(flow, steps)),
							),
						),
					),
				);
				const ms = performance.now() - start;
				// One trigger per step, plus Prev and Next, in every stepper.
				assert.strictEqual(container.querySelectorAll("button").length, scenario.mounts * (scenario.steps + 2));
				assert.strictEqual(container.querySelectorAll("li").length, scenario.mounts * scenario.steps);
				return { ms, renders: 0 };
			}
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
						if (scenario.kind === "data") use.setData(api, "step-0", i);
						else use.setComplete(api, WATCHED, i % 2 === 0);
					});
				ms = performance.now() - start;
				if (scenario.kind === "data") assert.strictEqual(use.data(api, "step-0"), scenario.operations - 1);
				else assert.strictEqual(use.isComplete(api, WATCHED), false);
				assert.strictEqual(use.id(api), "step-0");
			} else if (scenario.kind === "reset-full") {
				ms = 0;
				let resetRenders = 0;
				for (let i = 0; i < scenario.operations; i++) {
					flushSync(() => {
						use.setComplete(api, "step-0", true);
						use.setData(api, "step-0", i);
					});
					assert.strictEqual(accepted(await transition(() => api.goTo(lastId))), true);
					assert.strictEqual(use.data(api, "step-0"), i);
					assert.strictEqual(use.isComplete(api, "step-0"), true);
					renderCount = 0;
					const start = performance.now();
					const result = await transition(() => use.reset(api));
					ms += performance.now() - start;
					resetRenders += renderCount;
					assert.strictEqual(accepted(result), true);
					assert.strictEqual(use.id(api), "step-0");
					assert.deepEqual(use.allData(api), SEED);
					assert.deepEqual(use.completed(api), []);
				}
				renderCount = resetRenders;
			} else {
				const outcomes = [];
				const visited = [];
				const pendingStates = [];
				if (scenario.kind === "reset-preserve")
					flushSync(() => {
						use.setComplete(api, "step-0", true);
						use.setData(api, "step-0", "retained");
					});
				renderCount = 0;
				const start = performance.now();
				for (let i = 0; i < scenario.operations; i++) {
					outcomes.push(
						await transition(() => {
							if (scenario.kind === "boundary") return api.prev();
							if (scenario.kind === "blocked") return api.next();
							if (scenario.kind === "jump") return api.goTo(i % 2 === 0 ? lastId : "step-0");
							if (scenario.kind === "reset-preserve") return i % 2 === 0 ? api.goTo(lastId) : use.resetKeeping(api);
							const payload = scenario.kind === "payload" ? i : undefined;
							return i % 2 === 0 ? use.next(api, payload) : use.prev(api, payload);
						}),
					);
					visited.push(use.id(api));
					pendingStates.push(api.isPending);
				}
				ms = performance.now() - start;
				const rejected = ["boundary", "blocked"].includes(scenario.kind);
				outcomes.forEach((result, i) => {
					assert.strictEqual(accepted(result), !rejected);
					if (rejected) assert.strictEqual(result.reason, scenario.kind === "boundary" ? "boundary" : "guard");
					assert.strictEqual(
						visited[i],
						rejected || i % 2 === 1 ? "step-0" : ["jump", "reset-preserve"].includes(scenario.kind) ? lastId : "step-1",
					);
					assert.strictEqual(pendingStates[i], false);
				});
				assert.strictEqual(guardCalls, scenario.guard ? scenario.operations : 0);
				if (scenario.kind === "payload") {
					assert.strictEqual(use.data(api, "step-0"), scenario.operations - 2);
					assert.strictEqual(use.data(api, "step-1"), scenario.operations - 1);
				}
				if (scenario.kind === "reset-preserve") {
					assert.strictEqual(use.data(api, "step-0"), "retained");
					assert.deepEqual(use.completed(api), ["step-0"]);
				}
			}
			assertDom();
			const result = { ms, renders: renderCount };
			// After timing, check that selectors react to a relevant change.
			if (scenario.readers && ["data", "completion"].includes(scenario.kind)) {
				const previousRenders = renderCount;
				if (scenario.select === "data") flushSync(() => use.setData(api, "step-0", "changed"));
				else if (scenario.select === "completion") flushSync(() => use.setComplete(api, WATCHED, true));
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
		const samples = { v8: [], v9: [] };
		for (let round = -warmups; round < repetitions; round++) {
			for (const version of Math.abs(round) % 2 === 0 ? ["v8", "v9"] : ["v9", "v8"]) {
				globalThis.gc();
				const result = await measure(version, scenario);
				if (round >= 0) samples[version].push(result);
			}
		}
		for (const version of ["v8", "v9"]) {
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
