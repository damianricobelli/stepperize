import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { leftoverStyles, STYLES_WARNING, transform } from "../v9";

const HEAD = `import { defineStepper } from "@stepperize/react";

const flow = defineStepper([{ id: "a" }, { id: "b" }]);
const { Stepper } = flow;
`;

/** Run one statement inside a component that owns a stepper, and return what it became. */
function line(statement: string, declaration = "const stepper = flow.useStepper();") {
	const open = `${HEAD}\nasync function Component() {\n`;
	const result = transform(`${open}\t${declaration}\n\t${statement}\n}\n`);
	const body = result.code.slice(open.length, -"\n}\n".length).replace(/^\t/gm, "");
	// Without TODOs the declaration is untouched: drop it and keep the statement.
	return { ...result, body, code: body.startsWith(declaration) ? body.slice(declaration.length + 1) : body };
}

/** Run a JSX expression returned from a component. */
function jsx(markup: string) {
	const before = `${HEAD}\nconst element = (\n`;
	const result = transform(`${before}${markup}\n);\n`);
	const start = result.code.indexOf("const element = (\n") + "const element = (\n".length;
	return { ...result, comments: todosOf(result.code), code: result.code.slice(start, -"\n);\n".length) };
}

const todosOf = (code: string) => code.split("\n").filter((entry) => entry.includes("TODO(stepperize-v9)"));

describe("automatic rewrites", () => {
	it.each([
		["stepper.id;", "stepper.current.id;"],
		["stepper.count;", "stepper.steps.length;"],
		['stepper.is("a");', 'stepper.current.id === "a";'],
		['if (!stepper.is("a")) done();', 'if (stepper.current.id !== "a") done();'],
		["const back = stepper.canPrev;", "const back = !stepper.isFirst && !stepper.isPending;"],
		["const forward = stepper.canNext;", "const forward = !stepper.isLast && !stepper.isPending;"],
		["const disabled = !stepper.canPrev;", "const disabled = stepper.isFirst || stepper.isPending;"],
		["const disabled = !stepper.canNext;", "const disabled = stepper.isLast || stepper.isPending;"],
		["const off = stepper.canNext === false;", "const off = (!stepper.isLast && !stepper.isPending) === false;"],
		['stepper.isComplete("a");', 'stepper.state("a") === "complete";'],
		["stepper.isComplete();", 'stepper.state(stepper.current.id) === "complete";'],
		['if (!stepper.isComplete("a")) done();', 'if (stepper.state("a") !== "complete") done();'],
		["stepper.completed.length;", "stepper.snapshot().complete.length;"],
		['stepper.data.get("a");', "stepper.data.a;"],
		['stepper.data.get("first-step");', 'stepper.data["first-step"];'],
		["stepper.data.get(id);", "stepper.data[id];"],
		["stepper.data.get();", "stepper.data[stepper.current.id];"],
		["stepper.data.get(stepper.id);", "stepper.data[stepper.current.id];"],
		["const all = stepper.data.all();", "const all = stepper.data;"],
		['stepper.data.set("a", values);', 'stepper.setData("a", values);'],
		["stepper.data.set(values);", "stepper.setData(stepper.current.id, values);"],
		['stepper.data.update("a", merge);', 'stepper.setData("a", merge(stepper.data.a));'],
		["await stepper.next({ data: values, complete: true });", "await stepper.next(values);"],
		["stepper.next({ data: values });", "stepper.next(values);"],
		["stepper.next({ complete: true });", "stepper.next();"],
		["stepper.next();", "stepper.next();"],
		['stepper.goTo("b");', 'stepper.goTo("b");'],
		// Already v9: the argument is the data, whatever its shape.
		["stepper.next(values);", "stepper.next(values);"],
		['stepper.next({ name: "Ada" });', 'stepper.next({ name: "Ada" });'],
	])("%s → %s", (input, output) => {
		const result = line(input);
		expect(result.code).toBe(output);
		expect(result.todos).toBe(0);
	});

	it("follows a stepper from useStepperContext, with or without a selector", () => {
		expect(line("shared.id;", "const shared = flow.useStepperContext();").code).toBe("shared.current.id;");
		expect(line("const id = flow.useStepperContext((s) => s.id);").code).toBe(
			"const id = flow.useStepperContext((s) => s.current.id);",
		);
	});

	it("follows a destructured data and next, and hooks taken out of the definition", () => {
		const declaration = "const { data, next } = flow.useStepper();";
		expect(line('data.get("a");', declaration).code).toBe("data.a;");
		expect(line("data.all();", declaration).code).toBe("data;");
		expect(line("next({ data: values });", declaration).code).toBe("next(values);");
		const source = `import { defineStepper } from "@stepperize/react/headless";\nconst { useStepper: useFlow } = defineStepper([{ id: "a" }]);\nfunction C() {\n\tconst s = useFlow();\n\treturn s.id;\n}\n`;
		expect(transform(source).code).toContain("return s.current.id;");
	});

	it("follows a stepper received as a typed argument", () => {
		const source = `import { defineStepper, type Stepper } from "@stepperize/react";
import { flow } from "./flow";

type Flow = ReturnType<typeof flow.useStepper>;
type Alias = Flow;
interface Props {
	stepper: Flow;
	user: User;
}

export function Inline({ stepper, label }: { stepper: Stepper<Steps>; label: string }) {
	return stepper.id + label.id;
}
export const Named = ({ stepper: s, user }: Props) => [s.count, user.id];
export function Whole(stepper: Alias, other: Other) {
	const local: Flow = pick();
	return [stepper.canNext, other.id, local.is("a")];
}
`;
		const { code, todos } = transform(source);
		expect(code).toContain("return stepper.current.id + label.id;");
		expect(code).toContain("[s.steps.length, user.id]");
		expect(code).toContain('return [!stepper.isLast && !stepper.isPending, other.id, local.current.id === "a"];');
		expect(todos).toBe(0);
	});

	it("leaves alone what is not provably a stepper", () => {
		const source = `import { useStepper } from "some-ui-kit";\nimport { Stepper } from "@mui/material";\nconst nav = <Stepper.Actions />;\nfunction C({ user, stepper }) {\n\tconst other = useStepper();\n\treturn [user.id, stepper.id, other.id, other.data.get("a")];\n}\n`;
		expect(transform(source)).toEqual({ code: source, rewrites: 0, todos: 0, notes: [], warnings: [] });
		const unrelated = `const form = useForm();\nform.next({ data: 1 });\nexport const id = form.id;\n`;
		expect(transform(unrelated).code).toBe(unrelated);
	});

	it("respects shadowing: an inner binding with the same name is not the stepper", () => {
		const source = `${HEAD}\nfunction C() {\n\tconst stepper = flow.useStepper();\n\tconst ids = list.map((stepper) => stepper.id);\n\treturn [stepper.id, ids];\n}\n`;
		const { code } = transform(source);
		expect(code).toContain("list.map((stepper) => stepper.id)");
		expect(code).toContain("return [stepper.current.id, ids];");
	});

	it("turns the Root render prop into the stepper itself", () => {
		const result = jsx("\t<Stepper.Root>{({ stepper }) => <p>{stepper.id}</p>}</Stepper.Root>");
		expect(result.code).toBe("\t<Stepper.Root>{(stepper) => <p>{stepper.current.id}</p>}</Stepper.Root>");
		expect(jsx("\t<Stepper.Root>{({ stepper: s }) => <p>{s.count}</p>}</Stepper.Root>").code).toBe(
			"\t<Stepper.Root>{(s) => <p>{s.steps.length}</p>}</Stepper.Root>",
		);
		expect(jsx("\t<flow.Stepper.Root>{({ stepper }) => stepper.id}</flow.Stepper.Root>").code).toBe(
			"\t<flow.Stepper.Root>{(stepper) => stepper.current.id}</flow.Stepper.Root>",
		);
	});

	it("moves the Items function into the List", () => {
		const result = jsx(
			"\t<Stepper.List>\n\t\t<Stepper.Items>\n\t\t\t{(step) => <Stepper.Item key={step.id} />}\n\t\t</Stepper.Items>\n\t</Stepper.List>",
		);
		expect(result.code).toBe("\t<Stepper.List>\n\t\t{(step) => <Stepper.Item key={step.id} />}\n\t</Stepper.List>");
		expect(result.todos).toBe(0);
	});

	it("replaces Actions and Separator with plain elements", () => {
		expect(jsx('\t<Stepper.Actions className="row"><Stepper.Next /></Stepper.Actions>').code).toBe(
			'\t<div className="row"><Stepper.Next /></div>',
		);
		expect(jsx('\t<Stepper.Separator orientation="vertical" className="line" />').code).toBe(
			'\t<hr className="line" />',
		);
	});

	it("renames beforeStepChange and folds the defaults into one snapshot", () => {
		const hook = line(
			'const s = flow.useStepper({ linear: true, defaultStep: "b", defaultData: saved, defaultCompleted: ["a"], beforeStepChange });',
			"",
		);
		expect(hook.code.replace(/\s+/g, " ")).toBe(
			'const s = flow.useStepper({ linear: true, snapshot: { step: "b", data: saved, complete: ["a"] }, guard: beforeStepChange });',
		);
		expect(hook.todos).toBe(0);
		const defaults = transform(`${HEAD}const other = defineStepper([{ id: "x" }], { defaultStep: "x" });\n`);
		expect(defaults.code.replace(/\s+/g, " ")).toContain('defineStepper([{ id: "x" }], { snapshot: { step: "x" } });');
		const props = jsx('\t<Stepper.Root defaultStep="b" defaultData={saved} beforeStepChange={check} step={param} />');
		expect(props.code.replace(/\s+/g, " ")).toBe(
			' <Stepper.Root snapshot={{ step: "b", data: saved }} guard={check} step={param} />',
		);
		const provider = jsx("\t<flow.Provider defaultCompleted={done} beforeStepChange={check} />");
		expect(provider.code.replace(/\s+/g, " ")).toBe(" <flow.Provider snapshot={{ complete: done }} guard={check} />");
	});

	it("keeps the file's quotes and indentation", () => {
		const source = `import { defineStepper } from '@stepperize/react';\n\nconst flow = defineStepper([{ id: 'a' }]);\n\nfunction C() {\n  const stepper = flow.useStepper({ defaultStep: 'a' });\n  return stepper.isComplete();\n}\n`;
		const { code } = transform(source);
		expect(code).toContain("return stepper.state(stepper.current.id) === 'complete';");
		expect(code).toContain("flow.useStepper({ snapshot: {\n    step: 'a'\n  } });");
		expect(code).not.toContain("\t");
	});
});

describe("steppers reached indirectly", () => {
	it("follows a stepper kept in a ref", () => {
		const source = `import { useRef } from "react";
import { defineStepper, type Stepper } from "@stepperize/react";

const flow = defineStepper([{ id: "a" }]);

function Component() {
	const ref = useRef<Stepper | null>(null);
	const save = () => {
		const stepper = ref.current;
		if (!stepper) return;
		stepper.data.set("a", stepper.data.get("a"));
	};
	return save;
}
`;
		const result = transform(source);
		expect(result.code).toContain('stepper.setData("a", stepper.data.a);');
		expect(result.todos).toBe(0);
	});

	it("follows a stepper returned by the app's own hook, alone or inside an object", () => {
		const source = `${HEAD}
function Step() {
	const { stepper, total } = useInvites();
	const other = useFlow();
	return [stepper.data.get("a"), other.count, total];
}

function useInvites() {
	const stepper = flow.useStepperContext();
	return { stepper, total: stepper.count };
}

const useFlow = () => flow.useStepperContext();
`;
		const result = transform(source);
		expect(result.code).toContain("return [stepper.data.a, other.steps.length, total];");
		expect(result.code).toContain("return { stepper, total: stepper.steps.length };");
		expect(result.todos).toBe(0);
	});

	it("follows a stepper typed in place", () => {
		const source = `${HEAD}
function Nav({ stepper }: { stepper: ReturnType<typeof flow.useStepper> }) {
	return stepper.canNext;
}
`;
		expect(transform(source).code).toContain("return !stepper.isLast && !stepper.isPending;");
	});

	it("flags the v8 API on a value it could not follow instead of leaving it silently", () => {
		const source = `${HEAD}
function Nav(props) {
	props.stepper.data.set("a", 1);
	return props.stepper.canNext;
}
`;
		const result = transform(source);
		expect(result.todos).toBe(2);
		expect(result.notes[0]).toContain("`props.stepper.data.set()` looks like the v8 API");
		expect(result.notes[1]).toContain("use `!props.stepper.isLast && !props.stepper.isPending`");
		expect(result.code).toContain('props.stepper.data.set("a", 1);');
		// Flagged once: a second run adds nothing.
		expect(transform(result.code).code).toBe(result.code);
	});

	it("does not flag look-alikes in files that have nothing to do with a stepper", () => {
		const source = `// stepper-free helper\nexport const read = (response) => response.data.get("a");\n`;
		expect(transform(source, "helpers.ts").code).toBe(source);
	});
});

describe("rewrites that used to be comments", () => {
	const guarded = (guard: string) =>
		transform(
			`${HEAD}\nfunction Component() {\n\treturn flow.useStepper({\n\t\tbeforeStepChange: ${guard},\n\t});\n}\n`,
		);

	it("removes a guard that only validated on the way forward", () => {
		const first = guarded(
			'async ({ direction, validate }) => {\n\t\t\tif (direction !== "next") return true;\n\t\t\treturn (await validate()).success;\n\t\t}',
		);
		expect(first.code).toContain("return flow.useStepper();");
		expect(first.todos).toBe(0);
		const second = guarded(
			"async ({ validate }) => {\n\t\t\tconst result = await validate();\n\t\t\treturn result.success;\n\t\t}",
		);
		expect(second.code).toContain("return flow.useStepper();");
		expect(jsx("\t<Stepper.Root beforeStepChange={async ({ validate }) => (await validate()).success} />").code).toBe(
			"\t<Stepper.Root />",
		);
	});

	it("keeps a guard that does anything else, and says why", () => {
		const result = guarded(
			"async ({ validate }) => {\n\t\t\tconst result = await validate();\n\t\t\tif (!result.success) track(result.issues);\n\t\t\treturn result.success;\n\t\t}",
		);
		expect(result.code).toContain("guard: async ({ validate }) => {");
		expect(result.notes).toEqual([expect.stringContaining("`validate()` is not passed to the guard")]);
	});

	it('turns a status only compared with "active" into a state compared with "current"', () => {
		expect(line('const on = stepper.status("a") === "active";').code).toBe(
			'const on = stepper.state("a") === "current";',
		);
		const held = line('const status = stepper.status("a");\n\tconst on = status === "active" || status !== "active";');
		expect(held.body).toContain('const status = stepper.state("a");');
		expect(held.body).toContain('const on = status === "current" || status !== "current";');
		expect(held.todos).toBe(0);
	});

	it("leaves a status used by position as a comment", () => {
		const result = line(
			'const status = stepper.status("a");\n\tconst done = status === "previous" || status === "active";',
		);
		expect(result.body).toContain('stepper.status("a")');
		expect(result.body).toContain('status === "active"');
		expect(result.todos).toBe(1);
	});

	it("follows the declarations a type checker says are steppers", () => {
		const source = 'function Nav({ stepper }) {\n\treturn stepper.data.get("a");\n}\n';
		expect(transform(source, "nav.tsx", { typed: new Set(["1:stepper"]) }).code).toBe(
			"function Nav({ stepper }) {\n\treturn stepper.data.a;\n}\n",
		);
		expect(transform(source, "nav.tsx").todos).toBe(1);
	});

	it("does not stop at a scope it cannot read", () => {
		const source = `${HEAD}\nfunction load() {\n\ttry {\n\t\treturn read();\n\t} catch {\n\t\treturn null;\n\t}\n}\n\nfunction Component() {\n\tconst stepper = flow.useStepper();\n\tconst status = stepper.status("a");\n\treturn [load(), status === "active"];\n}\n`;
		expect(transform(source).code).toContain('stepper.state("a")');
	});
});

describe("selectors", () => {
	it("rewrites Tailwind variants and CSS attribute selectors to data-state", () => {
		const source = `${HEAD}
const classes = "data-[status=active]:bg-primary group-data-[status=upcoming]/item:opacity-50 data-[complete]:ring-1 data-complete:font-bold";
const css = '[data-status="active"] > [data-complete]';
`;
		const result = transform(source);
		expect(result.code).toContain(
			'"data-[state=current]:bg-primary group-data-[state=pending]/item:opacity-50 data-[state=complete]:ring-1 data-[state=complete]:font-bold"',
		);
		expect(result.code).toContain(`'[data-state="current"] > [data-state=complete]'`);
		expect(result.rewrites).toBe(6);
		expect(result.warnings).toEqual([STYLES_WARNING]);
		expect(leftoverStyles(result.code)).toEqual([]);
	});

	it("warns only when the positional status was involved", () => {
		const active = transform(`${HEAD}const classes = "data-[status=active]:bg-primary";\n`);
		expect(active.warnings).toEqual([]);
		const previous = transform(`${HEAD}const classes = "data-[status=previous]:bg-primary";\n`);
		expect(previous.code).toContain("data-[state=complete]:bg-primary");
		expect(previous.warnings).toEqual([STYLES_WARNING]);
	});

	it("leaves selectors alone in files it cannot tie to a stepper, and reports their lines", () => {
		const source = `// a stepper-like table\nexport const row = "data-[status=active]:bg-primary";\n`;
		expect(transform(source, "table.ts").code).toBe(source);
		expect(leftoverStyles(source)).toEqual([2]);
		expect(leftoverStyles('.item[data-status="previous"] {}\n.other {}\n')).toEqual([1]);
	});
});

describe("formatting", () => {
	it("keeps every line it does not have to touch", () => {
		const source = `${HEAD}
export function Wizard() {
	return (
		<Stepper.Root className="grid">
			{({ stepper }) => (
				<div
					className="flex"
				>
					<Stepper.List>
						<Stepper.Items>
							{(step) => (
								<Stepper.Item
									key={step.id}
									step={step.id}
								/>
							)}
						</Stepper.Items>
					</Stepper.List>
					<p>{stepper.current.title}</p>
				</div>
			)}
		</Stepper.Root>
	);
}
`;
		const expected = source
			.replace("({ stepper }) =>", "(stepper) =>")
			.replace(/\t+<\/?Stepper\.Items>\n/g, "")
			.replace(/^\t(\t{5,}(?:\{\(step|<Stepper\.Item|key=|step=|\/>|\)\}))/gm, "$1");
		expect(transform(source).code).toBe(expected);
	});
});

describe("TODO comments", () => {
	it.each([
		['stepper.status("a");', "`status(id)` was removed"],
		["await stepper.validate();", "`validate()` changed"],
		['stepper.setComplete("a");', "`setComplete()` was removed"],
		['stepper.data.clear("a");', "`data.clear()` / `data.reset()` were removed"],
		["stepper.data.reset();", "`data.clear()` / `data.reset()` were removed"],
		['stepper.goTo("b", { bypassPolicy: true });', "`goTo(id)` takes no options"],
		["stepper.prev({ data: values });", "`prev()` takes no arguments"],
		["stepper.reset({ keepData: true });", "`reset()` takes no options"],
		["stepper.next({ ...payload, complete: true });", "`next()` takes the step data directly"],
		["const result = await stepper.next(); log(result.from);", "Navigation results no longer have `from`"],
		["const { from } = await stepper.goTo(target);", "Navigation results no longer have `from`"],
		['flow.get("a");', "`definition.get(id)` was removed"],
		["flow.at(0);", "`definition.at(index)` was removed"],
		["flow.parseStep(param);", "`definition.parseStep()` was removed"],
		['flow.validate("a", values);', "`definition.validate()` was removed"],
		["flow.useStepper({ data: saved });", "`data` was removed"],
		["flow.useStepper({ onDataChange: save });", "`onDataChange` was removed"],
		["flow.useStepper({ completed: done });", "`completed` was removed"],
		["flow.useStepper({ onCompletedChange: save });", "`onCompletedChange` was removed"],
		["flow.useStepper({ onStepChange: navigate });", "`onStepChange` was removed"],
		["flow.useStepper({ onInvalidStep: recover });", "`onInvalidStep` now receives the step the flow is on"],
		["flow.useStepper({ beforeStepChange: ({ validate }) => validate() });", "`validate()` is not passed to the guard"],
		["flow.useStepper({ beforeStepChange: (ctx) => ctx.validate() });", "`validate()` is not passed to the guard"],
		[
			"flow.useStepper({ async beforeStepChange(ctx) { return ctx.validate(); } });",
			"`validate()` is not passed to the guard",
		],
		[
			"flow.useStepper({ beforeStepChange: ({ fromIndex }) => fromIndex > 0 });",
			"`fromIndex` is not passed to the guard",
		],
		["flow.useStepper({ beforeStepChange: (ctx) => ctx.toIndex > 0 });", "`toIndex` is not passed to the guard"],
		["flow.useStepper({ beforeStepChange: (ctx) => ctx.statuses.a });", "`statuses` is not passed to the guard"],
		[
			'flow.useStepper({ beforeStepChange: (ctx) => ctx.direction !== "goto" });',
			'The guard direction "goto" is now "goTo"',
		],
		[
			'flow.useStepper({ beforeStepChange: (ctx) => ctx.direction !== "reset" });',
			"The guard no longer runs for `reset()`",
		],
	])("%s", (input, message) => {
		const result = line(input);
		expect(todosOf(result.code)).toEqual([expect.stringContaining(`// TODO(stepperize-v9): ${message}`)]);
		expect(result.todos).toBe(1);
		// The comment sits on its own line, right above the statement it is about.
		expect(result.code.split("\n")[0]).toContain("TODO(stepperize-v9)");
	});

	it.each(["id", "count", "canPrev", "canNext", "completed", "is", "status", "isComplete", "setComplete", "validate"])(
		"destructuring the removed `%s`",
		(name) => {
			const result = line("", `const { ${name}, next } = flow.useStepper();`);
			expect(result.body.split("\n")).toEqual([
				expect.stringContaining(`// TODO(stepperize-v9): \`${name}\` is no longer on the stepper`),
				`const { ${name}, next } = flow.useStepper();`,
				"",
			]);
		},
	);

	it("flags writes through a destructured data, which need the stepper", () => {
		const result = line('data.set("a", values);', "const { data } = flow.useStepper();");
		expect(todosOf(result.body)).toEqual([expect.stringContaining("`data` is now a plain object")]);
	});

	it("flags the removed primitives entry and controlled props in JSX", () => {
		const entry = transform('import { Stepper } from "@stepperize/react/primitives";\n');
		expect(entry.code).toBe(
			'// TODO(stepperize-v9): `@stepperize/react/primitives` was removed. Use the `Stepper` components returned by `defineStepper` from `@stepperize/react`.\nimport { Stepper } from "@stepperize/react/primitives";\n',
		);
		const props = jsx("\t<Stepper.Root data={saved} onDataChange={save} />");
		expect(props.comments).toEqual([
			expect.stringContaining("`data` was removed"),
			expect.stringContaining("`onDataChange` was removed"),
		]);
		expect(props.code).toBe("\t<Stepper.Root data={saved} onDataChange={save} />");
	});

	it("flags an Items that cannot simply move into its List", () => {
		const result = jsx("\t<Stepper.List><li>First</li><Stepper.Items>{render}</Stepper.Items></Stepper.List>");
		expect(result.comments).toEqual([expect.stringContaining("`Stepper.Items` was removed")]);
	});

	it("never puts a comment between a condition and its body", () => {
		const result = line('if (ready) stepper.status("a");');
		expect(result.code).toMatch(/^\/\/ TODO\(stepperize-v9\)[^\n]*\nif \(ready\)/);
	});
});

const SAMPLE = `${HEAD}
export function Checkout() {
	const stepper = flow.useStepper({
		defaultStep: "a",
		beforeStepChange: async ({ validate, direction }) => direction === "goto" || (await validate()).success,
		onStepChange: (step) => track(step),
	});
	const draft = stepper.data.get("a");
	const submit = async () => {
		const result = await stepper.next({ data: draft, complete: true });
		if (!result.accepted) return report(result.from);
		await stepper.goTo("b", { bypassPolicy: true });
	};
	return (
		<Stepper.Root defaultStep="a" data={draft}>
			{({ stepper: s }) => (
				<>
					<Stepper.List>
						<Stepper.Items>{(step) => <Stepper.Item key={step.id} />}</Stepper.Items>
					</Stepper.List>
					<Stepper.Actions>
						<button type="button" disabled={!s.canPrev} onClick={submit}>
							{s.is("b") ? stepper.status("a") : s.count}
						</button>
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}
`;

describe("whole files", () => {
	it("is idempotent: a second run changes nothing", () => {
		const first = transform(SAMPLE);
		expect(first.rewrites).toBeGreaterThan(8);
		expect(first.todos).toBe(7);
		expect(transform(first.code)).toEqual({ code: first.code, rewrites: 0, todos: 0, notes: [], warnings: [] });
	});

	it("parses plain TypeScript, where <T>value is a cast and not JSX", () => {
		const source = `import { flow } from "./flow";\nexport function useId() {\n\tconst stepper = flow.useStepper();\n\treturn <string>stepper.id;\n}\n`;
		expect(transform(source, "use-id.ts").code).toContain("return <string>stepper.current.id;");
	});

	it("skips files that never mention a stepper", () => {
		const source = "export const answer = 42;\n";
		expect(transform(source)).toEqual({ code: source, rewrites: 0, todos: 0, notes: [], warnings: [] });
	});
});

describe("cli", () => {
	const cli = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
	const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" });

	it("rewrites the files of a directory, and --dry leaves them untouched", () => {
		const root = mkdtempSync(join(tmpdir(), "stepperize-codemod-"));
		try {
			mkdirSync(join(root, "src", "node_modules", "pkg"), { recursive: true });
			const file = join(root, "src", "checkout.tsx");
			const ignored = join(root, "src", "node_modules", "pkg", "index.tsx");
			writeFileSync(file, SAMPLE);
			writeFileSync(ignored, SAMPLE);
			writeFileSync(join(root, "src", "plain.js"), "export const answer = 42;\n");

			const dry = run("v9", root, "--dry");
			expect(dry).toMatch(/would change\s+.*checkout\.tsx/);
			expect(dry).toContain("2 files scanned, 1 would change");
			expect(readFileSync(file, "utf8")).toBe(SAMPLE);

			const output = run("v9", root);
			expect(output).toContain("2 files scanned, 1 changed");
			expect(output).toContain("7 TODOs to review");
			expect(readFileSync(file, "utf8")).toBe(transform(SAMPLE).code);
			expect(readFileSync(ignored, "utf8")).toBe(SAMPLE);
			expect(run("v9", root)).toContain("0 changed");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("groups what is left, reports style sheets and says what to do next", () => {
		const root = mkdtempSync(join(tmpdir(), "stepperize-codemod-"));
		try {
			writeFileSync(join(root, "checkout.tsx"), SAMPLE);
			writeFileSync(join(root, "stepper.css"), '.item[data-status="active"] {}\n');
			const output = run("v9", root, "--dry");
			expect(output).toContain('Left for you, as "TODO(stepperize-v9)" comments:');
			expect(output).toMatch(/Still styled with the v8 attributes[\s\S]*stepper\.css:1/);
			expect(output).toContain("Run your type checker, or this command again with --check");
			expect(readFileSync(join(root, "stepper.css"), "utf8")).toContain("data-status");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	/** A project with its own TypeScript and a stand-in for the library's types. */
	function project(files: Record<string, string>) {
		const root = mkdtempSync(join(tmpdir(), "stepperize-codemod-"));
		const modules = join(root, "node_modules");
		const library = join(modules, "@stepperize", "react");
		mkdirSync(library, { recursive: true });
		mkdirSync(join(root, "src"));
		symlinkSync(
			dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
			join(modules, "typescript"),
			"dir",
		);
		writeFileSync(join(library, "package.json"), '{ "name": "@stepperize/react", "types": "index.d.ts" }');
		writeFileSync(
			join(library, "index.d.ts"),
			`type Step = { id: string };
export type Stepper = {
	steps: readonly Step[]; current: Step; index: number; isFirst: boolean; isLast: boolean; isPending: boolean;
	data: Record<string, unknown>;
	next(data?: unknown): Promise<unknown>; prev(): Promise<unknown>; goTo(id: string): Promise<unknown>;
	setData(id: string, value: unknown): void; state(id: string): string; canGoTo(id: string): boolean;
	match(handlers: unknown): unknown;
};
export declare function defineStepper(steps: readonly Step[]): { steps: readonly Step[]; useStepper(): Stepper };
`,
		);
		writeFileSync(join(root, "package.json"), "{}");
		writeFileSync(
			join(root, "tsconfig.json"),
			'{ "compilerOptions": { "strict": true, "module": "esnext", "moduleResolution": "bundler", "target": "es2022", "noEmit": true }, "include": ["src"] }',
		);
		for (const [name, content] of Object.entries(files)) writeFileSync(join(root, "src", name), content);
		const at = (...args: string[]) =>
			execFileSync(process.execPath, [cli, "v9", "src", ...args], { cwd: root, encoding: "utf8" });
		return { root, at, read: (name: string) => readFileSync(join(root, "src", name), "utf8") };
	}

	const FLOW = `import { defineStepper } from "@stepperize/react";

export const flow = defineStepper([{ id: "a" }, { id: "b" }]);
export type Flow = ReturnType<typeof flow.useStepper>;
export const first = flow.parseStep("a");
`;
	// The stepper arrives typed from another file: only a type checker can tell what it is.
	const NAV = `import type { Flow } from "./flow";

export function label(props: { stepper: Flow }) {
	const { stepper } = props;
	return stepper.data.get("a");
}

export const canMove = (api: Flow) => api.canNext;
`;

	it("uses the project's types to follow a stepper across files", () => {
		const typed = project({ "flow.ts": FLOW, "nav.ts": NAV });
		const plain = project({ "flow.ts": FLOW, "nav.ts": NAV });
		try {
			expect(typed.at()).toContain("Finding steppers with the types of tsconfig.json");
			expect(typed.read("nav.ts")).toContain("return stepper.data.a;");
			expect(typed.read("nav.ts")).toContain("(api: Flow) => !api.isLast && !api.isPending;");
			expect(typed.read("nav.ts")).not.toContain("TODO(stepperize-v9)");

			// Without them it does not guess: it leaves a comment.
			plain.at("--no-types");
			expect(plain.read("nav.ts")).toContain('return stepper.data.get("a");');
			expect(plain.read("nav.ts")).toContain("TODO(stepperize-v9)");
		} finally {
			rmSync(typed.root, { recursive: true, force: true });
			rmSync(plain.root, { recursive: true, force: true });
		}
	});

	it("type-checks what it migrated with --check, and reports everything as JSON with --json", () => {
		const { root, at, read } = project({ "flow.ts": FLOW, "nav.ts": NAV });
		try {
			const report = JSON.parse(at("--dry", "--check", "--json"));
			expect(report).toMatchObject({ dry: true, types: "tsconfig.json", scanned: 2, errors: [] });
			expect(report.changed.map((change: { file: string }) => change.file).sort()).toEqual([
				join("src", "flow.ts"),
				join("src", "nav.ts"),
			]);
			expect(report.todos).toEqual([
				{
					file: join("src", "flow.ts"),
					line: 5,
					message: expect.stringContaining("`definition.parseStep()` was removed"),
				},
			]);
			// The one call it could not rewrite is the one error left.
			expect(report.diagnostics).toEqual([
				expect.objectContaining({
					file: join("src", "flow.ts"),
					line: 6,
					message: expect.stringContaining("parseStep"),
				}),
			]);
			// `--dry` wrote nothing.
			expect(read("nav.ts")).toBe(NAV);

			const text = at("--check");
			expect(text).toContain("Type check: 1 error in the migrated files:");
			expect(text).toMatch(/flow\.ts:6:\d+ {2}Property 'parseStep' does not exist/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("fails on an unknown option or a path that does not exist", () => {
		expect(() => run("v9", "src", "--write")).toThrow(
			expect.objectContaining({ status: 1, stdout: expect.stringContaining("Unknown option: --write") }),
		);
		expect(() => run("v9", join(tmpdir(), "stepperize-nowhere"))).toThrow(
			expect.objectContaining({ status: 1, stdout: expect.stringContaining("not found") }),
		);
		expect(run("--help")).toContain("Usage:");
	});

	it("prints usage and fails without a transform or a path", () => {
		expect(() => run()).toThrow(expect.objectContaining({ status: 1, stdout: expect.stringContaining("Usage:") }));
	});
});
