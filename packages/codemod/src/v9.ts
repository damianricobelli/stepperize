import { parse as babelParse } from "@babel/parser";
import recast from "recast";

const b = recast.types.builders;
type Node = any;
type Path = any;

export type TransformResult = {
	/** The new source. Identical to the input when nothing changed. */
	code: string;
	/** Automatic rewrites applied. */
	rewrites: number;
	/** `// TODO(stepperize-v9)` comments added for changes that need a decision. */
	todos: number;
};

const PREFIX = "TODO(stepperize-v9):";
const PACKAGES = /^@stepperize\/(react|core)(\/|$)/;

/** What each removed or changed API becomes. Every message ends up in a `// TODO(stepperize-v9)` comment. */
const TODO = {
	status:
		'`status(id)` was removed. Use `state(id)`: "pending" | "current" | "complete". The positional "previous" / "upcoming" no longer exist; compare indexes if you need them.',
	validate:
		"`validate()` changed. `validate(id?)` checks the stored data of a step and resolves with its issues, or `undefined` when valid. `next()` also validates the current step.",
	setComplete: "`setComplete()` was removed. A step is complete once `next()` validates it and moves on.",
	dataClear:
		"`data.clear()` / `data.reset()` were removed. Use `setData(id, undefined)`, `restore({ data: {} })` or `reset()`.",
	dataCurrent: "`data.get()` without an id: read `stepper.data[stepper.current.id]`.",
	dataWrite: "`data` is now a plain object. Write with `stepper.setData(id, value)`.",
	nextPayload: "`next()` takes the step data directly: `next(data)` instead of `next({ data, complete })`.",
	prevPayload: "`prev()` takes no arguments. Call `setData(id, data)` before it to keep a draft.",
	goToOptions:
		"`goTo(id)` takes no options. `bypassPolicy` is gone (use `restore({ step })` to skip `linear` and the guard); call `setData` to save data.",
	resetOptions:
		"`reset()` takes no options. To keep data or completion, use `restore({ step, data, complete })` with the parts to keep.",
	resultFrom:
		"Navigation results no longer have `from`. They are `{ accepted, to, data }` or `{ accepted, reason, issues }`.",
	controlled: (name: string) =>
		`\`${name}\` was removed. State is saved and restored as one snapshot: pass \`snapshot\` to start from saved state and persist it in \`onChange(snapshot)\`.`,
	onStepChange:
		"`onStepChange` was removed. Use `onChange(snapshot)` and read `snapshot.step`; it also runs when data or completion change.",
	onInvalidStep:
		"`onInvalidStep` now receives the step the flow is on, not the raw value, and also runs when `linear` or the guard refuse `step`.",
	guardValidate: "`validate()` is not passed to the guard. `next()` validates the step before the guard runs.",
	guardField: (name: string) =>
		`\`${name}\` is not passed to the guard. Its context is \`{ from, to, direction, data, signal }\`; \`to\` is \`null\` when the flow finishes.`,
	guardDirection: (value: string) =>
		value === "goto"
			? 'The guard direction "goto" is now "goTo".'
			: 'The guard no longer runs for `reset()`: the "reset" direction is gone.',
	definition: (name: string) =>
		({
			get: "`definition.get(id)` was removed. Use `definition.steps.find((step) => step.id === id)`.",
			at: "`definition.at(index)` was removed. Use `definition.steps[index]`.",
			parseStep:
				"`definition.parseStep()` was removed. Pass the raw value to the `step` option: unknown ids are ignored.",
			validate: "`definition.validate()` was removed. Use `stepper.validate(id)` on a flow, or let `next(data)` do it.",
		})[name] as string,
	primitivesEntry:
		"`@stepperize/react/primitives` was removed. Use the `Stepper` components returned by `defineStepper` from `@stepperize/react`.",
	rootProps: "`Stepper.Root` now calls its function child with the stepper itself: `(stepper) => ...`.",
	items: "`Stepper.Items` was removed. Pass the function as the only child of `Stepper.List`.",
	destructured: (name: string) =>
		`\`${name}\` is no longer on the stepper. ${
			(
				{
					id: "Use `current.id`.",
					count: "Use `steps.length`.",
					canPrev: "Use `!isFirst && !isPending`.",
					canNext: "Use `!isLast && !isPending`.",
					completed: "Use `snapshot().complete`.",
					is: 'Use `current.id === "id"`.',
					status: 'Use `state(id)`: "pending" | "current" | "complete".',
					isComplete: 'Use `state(id) === "complete"`.',
					setComplete: "A step is complete once `next()` validates it.",
					validate: "`validate(id?)` resolves with the issues, or `undefined`; `next()` validates too.",
				} as Record<string, string>
			)[name]
		}`,
};

const REMOVED = [
	"id",
	"count",
	"canPrev",
	"canNext",
	"completed",
	"is",
	"status",
	"isComplete",
	"setComplete",
	"validate",
];
const MOVES = ["next", "prev", "goTo", "reset"];
const CONTROLLED = ["data", "onDataChange", "completed", "onCompletedChange"];
const DEFAULTS: Record<string, string> = { defaultStep: "step", defaultData: "data", defaultCompleted: "complete" };
const GUARD_FIELDS = ["fromIndex", "toIndex", "statuses"];
const STATICS = ["get", "at", "parseStep", "validate"];

type Kind = "stepper" | "data" | "next" | "prev" | "goTo" | "reset" | "result" | "guard";

const isId = (node: Node, name?: string) => node?.type === "Identifier" && (name === undefined || node.name === name);
const isFn = (node: Node) => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
const isString = (node: Node): node is { value: string } => node?.type === "StringLiteral";
const isMember = (node: Node) => node?.type === "MemberExpression" && !node.computed && isId(node.property);
const keyName = (prop: Node): string | undefined =>
	prop.computed ? undefined : isId(prop.key) ? prop.key.name : isString(prop.key) ? prop.key.value : undefined;
const unwrap = (node: Node): Node => (node?.type === "AwaitExpression" ? unwrap(node.argument) : node);

function parser(file: string) {
	const typescript = /\.[cm]?tsx?$/.test(file);
	const jsx = !/\.[cm]?ts$/.test(file);
	return {
		parse: (source: string) =>
			babelParse(source, {
				sourceType: "module",
				tokens: true,
				allowReturnOutsideFunction: true,
				plugins: [...(jsx ? (["jsx"] as const) : []), ...(typescript || jsx ? (["typescript"] as const) : [])],
			}),
	};
}

/** Migrate one file from v8 to v9. Pure: it never touches the disk. */
export function transform(source: string, file = "file.tsx"): TransformResult {
	// Cheap exit: nothing in this file mentions a stepper.
	if (!/stepper/i.test(source)) return { code: source, rewrites: 0, todos: 0 };
	const useTabs = /^\t/m.test(source);
	const format = {
		useTabs,
		tabWidth: useTabs ? 4 : (/^( +)\S/m.exec(source)?.[1].length ?? 2),
		quote: /^import[^\n]*'/m.test(source) ? ("single" as const) : ("double" as const),
		lineTerminator: source.includes("\r\n") ? "\r\n" : "\n",
		arrowParensAlways: true,
	};
	const ast = recast.parse(source, { ...format, parser: parser(file) });
	let rewrites = 0;
	let todos = 0;

	// ---- Comments -----------------------------------------------------------

	/** Put a TODO above the statement that contains `path`, once per message. */
	function todo(path: Path, message: string) {
		let target = path;
		// A statement in a list of statements: a comment there never lands between `if (...)` and its body.
		while (
			target.parent &&
			!(recast.types.namedTypes.Statement.check(target.node) && Array.isArray(target.parentPath?.value))
		)
			target = target.parent;
		if (/^Export(Named|Default)Declaration$/.test(target.parent?.node?.type)) target = target.parent;
		const node = target.node;
		const text = ` ${PREFIX} ${message}`;
		if (node.comments?.some((comment: Node) => comment.value === text)) return;
		node.comments = [...(node.comments ?? []), b.commentLine(text, true, false)];
		todos++;
	}

	// ---- Names --------------------------------------------------------------

	/** Local names of `defineStepper`. */
	const define = new Set<string>();
	/** Local names of the hooks, including `const { useStepper: useCheckout } = ...`. */
	const hooks = new Map<string, "useStepper" | "useStepperContext">([
		["useStepper", "useStepper"],
		["useStepperContext", "useStepperContext"],
	]);
	/** Identifiers that hold a definition (`defineStepper(...)` or something used like one). */
	const definitions = new Set<string>();
	/** Identifiers that hold the `Stepper` components. */
	const namespaces = new Set<string>();
	/** Identifiers that hold a definition's `Provider`. */
	const providers = new Set<string>();
	/** Type names that describe a stepper: our `Stepper`, or `ReturnType<typeof flow.useStepper>`. */
	const types = new Set<string>();
	/** Local object types by name, to find the props typed as a stepper. */
	const shapes = new Map<string, Node[]>();

	const isDefine = (node: Node) => node?.type === "CallExpression" && isId(node.callee) && define.has(node.callee.name);

	recast.visit(ast, {
		visitImportDeclaration(path: Path) {
			const from: string = path.node.source.value;
			const ours = PACKAGES.test(from);
			if (from === "@stepperize/react/primitives") todo(path, TODO.primitivesEntry);
			for (const specifier of path.node.specifiers ?? []) {
				if (specifier.type !== "ImportSpecifier") continue;
				const imported = specifier.imported.name ?? specifier.imported.value;
				const local = specifier.local?.name ?? imported;
				if (ours && imported === "defineStepper") define.add(local);
				// A hook or `Stepper` with our names from another package is not ours.
				if (!ours && !from.startsWith(".") && hooks.has(local)) hooks.delete(local);
				// From us, `Stepper` is the instance type; from the app's own modules, the components.
				if (imported === "Stepper" && ours) types.add(local);
				if (imported === "Stepper" && /^(\.|@\/|~\/|#)/.test(from)) namespaces.add(local);
			}
			return false;
		},
	});

	recast.visit(ast, {
		visitMemberExpression(path: Path) {
			const { node } = path;
			if (
				isMember(node) &&
				isId(node.object) &&
				["useStepper", "useStepperContext", "Stepper"].includes(node.property.name)
			)
				definitions.add(node.object.name);
			this.traverse(path);
		},
		visitJSXMemberExpression(path: Path) {
			const { node } = path;
			if (node.object.type === "JSXIdentifier" && node.property.name === "Stepper") definitions.add(node.object.name);
			this.traverse(path);
		},
		visitVariableDeclarator(path: Path) {
			const { id, init } = path.node;
			if (isDefine(init) && isId(id)) definitions.add(id.name);
			this.traverse(path);
		},
	});

	recast.visit(ast, {
		visitVariableDeclarator(path: Path) {
			const { id, init } = path.node;
			if (id.type === "ObjectPattern") {
				const definition = isDefine(init) || (isId(init) && definitions.has(init.name));
				for (const prop of id.properties) {
					const key = prop.type === "ObjectProperty" ? keyName(prop) : undefined;
					const local = isId(prop.value) ? prop.value.name : undefined;
					if (!key || !local) continue;
					if (key === "Stepper") namespaces.add(local);
					if (key === "useStepper" || key === "useStepperContext") hooks.set(local, key);
					if (definition && key === "Provider") providers.add(local);
					if (definition && STATICS.includes(key)) todo(path, TODO.definition(key));
				}
			}
			this.traverse(path);
		},
	});

	const hookOf = (node: Node) => {
		if (node?.type !== "CallExpression") return undefined;
		const { callee } = node;
		if (isId(callee)) return hooks.get(callee.name);
		if (isMember(callee) && (callee.property.name === "useStepper" || callee.property.name === "useStepperContext"))
			return callee.property.name as "useStepper" | "useStepperContext";
		return undefined;
	};

	/** `<Stepper.Root>` → "Root", for any identifier known to hold the components, or `<x.Stepper.Root>`. */
	const component = (name: Node): string | undefined => {
		if (name?.type !== "JSXMemberExpression") return undefined;
		const { object, property } = name;
		const ours =
			(object.type === "JSXIdentifier" && namespaces.has(object.name)) ||
			(object.type === "JSXMemberExpression" && object.property.name === "Stepper");
		return ours ? property.name : undefined;
	};
	const isProvider = (name: Node) =>
		name?.type === "JSXIdentifier"
			? providers.has(name.name)
			: name?.type === "JSXMemberExpression" &&
				name.property.name === "Provider" &&
				name.object.type === "JSXIdentifier" &&
				definitions.has(name.object.name);

	// ---- Bindings -----------------------------------------------------------

	/** Scope node → name → what the binding holds. Scope nodes are stable across traversals. */
	const bindings = new Map<Node, Map<string, Kind>>();
	const mark = (scope: Node, name: string, kind: Kind) => {
		if (!bindings.has(scope)) bindings.set(scope, new Map());
		bindings.get(scope)?.set(name, kind);
	};
	const declared = (path: Path, name: string) => path.scope?.lookup(name)?.node ?? path.scope?.node;
	const kindOf = (path: Path, node: Node): Kind | undefined =>
		isId(node) ? bindings.get(path.scope?.lookup(node.name)?.node)?.get(node.name) : undefined;

	/** `const { next, data, id } = useStepper()`: follow what can be followed, flag what is gone. */
	function destructure(pattern: Node, path: Path, scope: Node) {
		for (const prop of pattern.properties) {
			const key = prop.type === "ObjectProperty" ? keyName(prop) : undefined;
			if (!key) continue;
			if (REMOVED.includes(key)) todo(path, TODO.destructured(key));
			else if (isId(prop.value) && (key === "data" || MOVES.includes(key))) mark(scope, prop.value.name, key as Kind);
		}
	}

	function bind(target: Node, path: Path, scope: Node) {
		if (isId(target)) mark(scope, target.name, "stepper");
		else if (target?.type === "ObjectPattern") destructure(target, path, scope);
	}

	recast.visit(ast, {
		visitVariableDeclarator(path: Path) {
			const { id, init } = path.node;
			const hook = hookOf(init);
			if (hook === "useStepper" || (hook === "useStepperContext" && !init.arguments.length))
				bind(id, path, isId(id) ? declared(path, id.name) : path.scope?.node);
			this.traverse(path);
		},
		visitCallExpression(path: Path) {
			const { node } = path;
			const [selector] = node.arguments;
			if (hookOf(node) === "useStepperContext" && isFn(selector) && selector.params[0])
				bind(selector.params[0], path.get("arguments", 0), selector);
			this.traverse(path);
		},
		visitJSXElement(path: Path) {
			const { node } = path;
			if (component(node.openingElement.name) === "Root") {
				node.children.forEach((child: Node, index: number) => {
					const fn = child.type === "JSXExpressionContainer" ? child.expression : undefined;
					if (!isFn(fn) || !fn.params[0]) return;
					const [param] = fn.params;
					const only =
						param.type === "ObjectPattern" && param.properties.length === 1 ? param.properties[0] : undefined;
					if (only?.type === "ObjectProperty" && keyName(only) === "stepper" && isId(only.value)) {
						// `({ stepper }) =>` and `({ stepper: s }) =>` become `(stepper) =>` and `(s) =>`.
						const next = b.identifier(only.value.name);
						if (param.typeAnnotation) todo(path.get("children", index), TODO.rootProps);
						fn.params[0] = next;
						mark(fn, next.name, "stepper");
						rewrites++;
					} else if (param.type === "ObjectPattern" || isId(param)) {
						// Already `(stepper) =>` in v9 code; anything else needs a look.
						if (param.type === "ObjectPattern") todo(path.get("children", index), TODO.rootProps);
						else mark(fn, param.name, "stepper");
					}
				});
			}
			this.traverse(path);
		},
	});

	// Steppers received as typed arguments: `function Nav({ stepper }: { stepper: Stepper })`.
	const typeOf = (node: Node): Node => (node?.type === "TSTypeAnnotation" ? node.typeAnnotation : node);
	const isStepperType = (node: Node) => {
		const type = typeOf(node);
		return type?.type === "TSTypeReference" && isId(type.typeName) && types.has(type.typeName.name);
	};
	const membersOf = (node: Node): Node[] => {
		const type = typeOf(node);
		if (type?.type === "TSTypeLiteral") return type.members;
		return type?.type === "TSTypeReference" && isId(type.typeName) ? (shapes.get(type.typeName.name) ?? []) : [];
	};
	// Two rounds, so an alias of an alias is found whatever the order of declaration.
	for (let round = 0; round < 2; round++)
		recast.visit(ast, {
			visitTSTypeAliasDeclaration(path: Path) {
				const { id, typeAnnotation } = path.node;
				if (typeAnnotation.type === "TSTypeLiteral") shapes.set(id.name, typeAnnotation.members);
				else if (isStepperType(typeAnnotation) || /\buseStepper(Context)?>/.test(recast.print(typeAnnotation).code))
					types.add(id.name);
				return false;
			},
			visitTSInterfaceDeclaration(path: Path) {
				shapes.set(path.node.id.name, path.node.body.body);
				return false;
			},
		});
	recast.visit(ast, {
		visitFunction(path: Path) {
			for (const entry of path.node.params) {
				const param = entry.type === "AssignmentPattern" ? entry.left : entry;
				if (isId(param) && isStepperType(param.typeAnnotation)) mark(path.node, param.name, "stepper");
				if (param.type !== "ObjectPattern") continue;
				const typed = new Set(
					membersOf(param.typeAnnotation)
						.filter((member) => member.type === "TSPropertySignature" && isStepperType(member.typeAnnotation))
						.map((member) => keyName(member)),
				);
				for (const prop of param.properties)
					if (prop.type === "ObjectProperty" && typed.has(keyName(prop)) && isId(prop.value))
						mark(path.node, prop.value.name, "stepper");
			}
			this.traverse(path);
		},
		visitVariableDeclarator(path: Path) {
			const { id } = path.node;
			if (isId(id) && isStepperType(id.typeAnnotation)) mark(declared(path, id.name), id.name, "stepper");
			this.traverse(path);
		},
	});

	// Results of moves: `const result = await stepper.next()`.
	const isMove = (path: Path, node: Node) => {
		const call = unwrap(node);
		if (call?.type !== "CallExpression") return false;
		const { callee } = call;
		if (isMember(callee)) return kindOf(path, callee.object) === "stepper" && MOVES.includes(callee.property.name);
		return MOVES.includes(kindOf(path, callee) as string);
	};
	recast.visit(ast, {
		visitVariableDeclarator(path: Path) {
			const { id, init } = path.node;
			if (isMove(path, init)) {
				if (isId(id)) mark(declared(path, id.name), id.name, "result");
				else if (id.type === "ObjectPattern" && id.properties.some((prop: Node) => keyName(prop) === "from"))
					todo(path, TODO.resultFrom);
			}
			this.traverse(path);
		},
	});

	// ---- Expressions --------------------------------------------------------

	const member = (object: Node, ...names: string[]) =>
		names.reduce((node, name) => b.memberExpression(node, b.identifier(name)), object);
	const clone = (node: Node): Node => b.identifier(node.name);
	/** `data.x`, `data["a-b"]` or `data[expression]`. */
	const read = (data: Node, id: Node) =>
		isString(id) && /^[A-Za-z_$][\w$]*$/.test(id.value)
			? b.memberExpression(data, b.identifier(id.value))
			: b.memberExpression(data, id, true);
	/** Equality checks built here, so a `!` around them can flip the operator instead of wrapping it. */
	const equalities = new WeakSet<Node>();
	const equals = (left: Node, right: Node) => {
		const node = b.binaryExpression("===", left, right);
		equalities.add(node);
		return node;
	};

	/**
	 * `next({ data, complete })` → `next(data)`. Returns false for a v8 payload that
	 * cannot be unwrapped. Anything else is left alone: in v9 the argument is the data.
	 */
	function unwrapPayload(call: Node) {
		const [payload] = call.arguments;
		if (call.arguments.length !== 1 || payload.type !== "ObjectExpression") return true;
		const keys = payload.properties.map((prop: Node) => (prop.type === "ObjectProperty" ? keyName(prop) : undefined));
		if (!keys.includes("data") && !keys.includes("complete")) return true;
		if (!keys.every((key: string | undefined) => key === "data" || key === "complete")) return false;
		const data = payload.properties.find((prop: Node) => keyName(prop) === "data");
		call.arguments = data ? [data.value] : [];
		rewrites++;
		return true;
	}

	function moveArguments(path: Path, name: string) {
		const call = path.node;
		const count = call.arguments.length;
		if (name === "next" && !unwrapPayload(call)) todo(path, TODO.nextPayload);
		if (name === "prev" && count) todo(path, TODO.prevPayload);
		if (name === "goTo" && count > 1) todo(path, TODO.goToOptions);
		if (name === "reset" && count) todo(path, TODO.resetOptions);
	}

	recast.visit(ast, {
		visitUnaryExpression(path: Path) {
			const { node } = path;
			const { argument } = node;
			if (
				node.operator === "!" &&
				isMember(argument) &&
				kindOf(path, argument.object) === "stepper" &&
				(argument.property.name === "canPrev" || argument.property.name === "canNext")
			) {
				// `!stepper.canPrev` reads better as `stepper.isFirst || stepper.isPending`.
				const edge = argument.property.name === "canPrev" ? "isFirst" : "isLast";
				path.replace(
					b.logicalExpression("||", member(clone(argument.object), edge), member(clone(argument.object), "isPending")),
				);
				rewrites++;
				return false;
			}
			this.traverse(path);
			if (node.operator === "!" && equalities.has(node.argument)) {
				path.replace(b.binaryExpression("!==", node.argument.left, node.argument.right));
			}
			return undefined;
		},
		visitCallExpression(path: Path) {
			this.traverse(path);
			const { node } = path;
			const { callee } = node;
			const args = node.arguments;

			// Destructured moves: `const { next } = useStepper()`.
			const direct = kindOf(path, callee);
			if (direct && MOVES.includes(direct)) return moveArguments(path, direct);
			if (!isMember(callee)) return undefined;
			const name: string = callee.property.name;

			// `data.get("x")` on `stepper.data` or on a destructured `data`.
			const owner = callee.object;
			const stepperData = isMember(owner) && owner.property.name === "data" && kindOf(path, owner.object) === "stepper";
			if (stepperData || kindOf(path, owner) === "data") {
				const stepper = stepperData ? owner.object : undefined;
				const current = () => member(clone(stepper), "current", "id");
				let next: Node;
				if (name === "all" && !args.length) next = owner;
				else if (name === "get" && args.length === 1) next = read(owner, args[0]);
				else if (name === "get" && !args.length && stepper) next = b.memberExpression(owner, current(), true);
				else if (name === "set" && stepper && (args.length === 1 || args.length === 2))
					next = b.callExpression(member(clone(stepper), "setData"), args.length === 2 ? args : [current(), args[0]]);
				else if (name === "update" && stepper && args.length === 2)
					next = b.callExpression(member(clone(stepper), "setData"), [
						args[0],
						b.callExpression(args[1], [read(member(clone(stepper), "data"), args[0])]),
					]);
				else if (name === "get") return todo(path, TODO.dataCurrent);
				else if (name === "set" || name === "update") return todo(path, TODO.dataWrite);
				else if (name === "clear" || name === "reset") return todo(path, TODO.dataClear);
				else return undefined;
				path.replace(next);
				rewrites++;
				return undefined;
			}

			if (kindOf(path, owner) !== "stepper") return undefined;
			if (name === "is" && args.length === 1) {
				path.replace(equals(member(clone(owner), "current", "id"), args[0]));
				rewrites++;
			} else if (name === "isComplete" && args.length <= 1) {
				const id = args[0] ?? member(clone(owner), "current", "id");
				path.replace(equals(b.callExpression(member(clone(owner), "state"), [id]), b.stringLiteral("complete")));
				rewrites++;
			} else if (MOVES.includes(name)) moveArguments(path, name);
			return undefined;
		},
		visitMemberExpression(path: Path) {
			this.traverse(path);
			const { node } = path;
			if (!isMember(node)) return undefined;
			const name: string = node.property.name;
			const kind = kindOf(path, node.object);
			if (kind === "result" && name === "from") todo(path, TODO.resultFrom);
			if (kind !== "stepper") return undefined;
			const stepper = () => clone(node.object);
			let next: Node;
			if (name === "id") next = member(stepper(), "current", "id");
			else if (name === "count") next = member(stepper(), "steps", "length");
			else if (name === "completed") next = member(b.callExpression(member(stepper(), "snapshot"), []), "complete");
			else if (name === "canPrev" || name === "canNext")
				next = b.logicalExpression(
					"&&",
					b.unaryExpression("!", member(stepper(), name === "canPrev" ? "isFirst" : "isLast")),
					b.unaryExpression("!", member(stepper(), "isPending")),
				);
			else if (name === "status" || name === "validate" || name === "setComplete") return todo(path, TODO[name]);
			else return undefined;
			path.replace(next);
			rewrites++;
			return undefined;
		},
	});

	// ---- Options ------------------------------------------------------------

	/** The guard lost `validate`, `fromIndex`, `toIndex`, `statuses` and two directions. */
	function guard(fn: Node, path: Path) {
		if (!isFn(fn) && fn?.type !== "ObjectMethod") return;
		const [context] = fn.params;
		if (context?.type === "ObjectPattern")
			for (const prop of context.properties) {
				const key = prop.type === "ObjectProperty" ? keyName(prop) : undefined;
				if (key === "validate") todo(path, TODO.guardValidate);
				else if (key && GUARD_FIELDS.includes(key)) todo(path, TODO.guardField(key));
			}
		recast.visit(fn.body, {
			visitMemberExpression(inner: Path) {
				const { node } = inner;
				if (isId(context) && isMember(node) && isId(node.object, context.name)) {
					if (node.property.name === "validate") todo(path, TODO.guardValidate);
					else if (GUARD_FIELDS.includes(node.property.name)) todo(path, TODO.guardField(node.property.name));
				}
				this.traverse(inner);
			},
			visitStringLiteral(inner: Path) {
				const { value } = inner.node;
				if (value === "goto" || value === "reset") todo(path, TODO.guardDirection(value));
				return false;
			},
		});
	}

	function removed(name: string) {
		if (name === "onStepChange") return TODO.onStepChange;
		if (name === "onInvalidStep") return TODO.onInvalidStep;
		return CONTROLLED.includes(name) ? TODO.controlled(name) : undefined;
	}

	/** `{ defaultStep, beforeStepChange, ... }` as an object literal. */
	function options(object: Node, path: Path) {
		if (object?.type !== "ObjectExpression") return;
		const snapshot: Node[] = [];
		const existing = object.properties.find(
			(prop: Node) => prop.type === "ObjectProperty" && keyName(prop) === "snapshot",
		);
		let at = -1;
		object.properties = object.properties.filter((prop: Node, index: number) => {
			const key = prop.type === "ObjectProperty" || prop.type === "ObjectMethod" ? keyName(prop) : undefined;
			if (!key) return true;
			if (key === "beforeStepChange") {
				prop.key = b.identifier("guard");
				if (prop.type === "ObjectProperty") prop.shorthand = false;
				guard(prop.type === "ObjectMethod" ? prop : prop.value, path);
				rewrites++;
			} else if (key === "guard") guard(prop.type === "ObjectMethod" ? prop : prop.value, path);
			else if (DEFAULTS[key] && prop.type === "ObjectProperty") {
				if (at < 0) at = index;
				snapshot.push(b.objectProperty(b.identifier(DEFAULTS[key]), prop.value));
				rewrites++;
				return false;
			} else {
				const message = removed(key);
				if (message) todo(path, message);
			}
			return true;
		});
		if (!snapshot.length) return;
		if (existing?.value.type === "ObjectExpression") existing.value.properties.push(...snapshot);
		else if (existing) todo(path, TODO.controlled("defaultStep / defaultData / defaultCompleted"));
		else object.properties.splice(at, 0, b.objectProperty(b.identifier("snapshot"), b.objectExpression(snapshot)));
	}

	/** The same options, written as JSX props on `Stepper.Root` or a `Provider`. */
	function props(element: Node, path: Path) {
		const snapshot: Node[] = [];
		const value = (attribute: Node) =>
			attribute.value?.type === "JSXExpressionContainer" ? attribute.value.expression : attribute.value;
		const existing = element.attributes.find((attribute: Node) => attribute.name?.name === "snapshot");
		let at = -1;
		element.attributes = element.attributes.filter((attribute: Node, index: number) => {
			if (attribute.type !== "JSXAttribute" || attribute.name.type !== "JSXIdentifier") return true;
			const key: string = attribute.name.name;
			if (key === "beforeStepChange") {
				attribute.name = b.jsxIdentifier("guard");
				guard(value(attribute), path);
				rewrites++;
			} else if (key === "guard") guard(value(attribute), path);
			else if (DEFAULTS[key] && attribute.value) {
				if (at < 0) at = index;
				snapshot.push(b.objectProperty(b.identifier(DEFAULTS[key]), value(attribute)));
				rewrites++;
				return false;
			} else {
				const message = removed(key);
				if (message) todo(path, message);
			}
			return true;
		});
		if (!snapshot.length) return;
		const current = existing && value(existing);
		if (current?.type === "ObjectExpression") current.properties.push(...snapshot);
		else if (existing) todo(path, TODO.controlled("defaultStep / defaultData / defaultCompleted"));
		else
			element.attributes.splice(
				at,
				0,
				b.jsxAttribute(b.jsxIdentifier("snapshot"), b.jsxExpressionContainer(b.objectExpression(snapshot))),
			);
	}

	const blank = (child: Node) => child.type === "JSXText" && !child.value.trim();

	recast.visit(ast, {
		visitCallExpression(path: Path) {
			const { node } = path;
			if (hookOf(node) === "useStepper") options(node.arguments[0], path);
			else if (isDefine(node)) options(node.arguments[1], path);
			else if (
				isMember(node.callee) &&
				isId(node.callee.object) &&
				definitions.has(node.callee.object.name) &&
				STATICS.includes(node.callee.property.name)
			)
				todo(path, TODO.definition(node.callee.property.name));
			this.traverse(path);
		},
		visitJSXElement(path: Path) {
			this.traverse(path);
			const { node } = path;
			const opening = node.openingElement;
			const name = component(opening.name);
			if (name === "Root" || isProvider(opening.name)) props(opening, path);
			if (name === "Actions" || name === "Separator") {
				const tag = name === "Actions" ? "div" : "hr";
				opening.name = b.jsxIdentifier(tag);
				if (node.closingElement) node.closingElement.name = b.jsxIdentifier(tag);
				if (name === "Separator")
					opening.attributes = opening.attributes.filter((attribute: Node) => attribute.name?.name !== "orientation");
				rewrites++;
			}
			if (name === "List") {
				const children = node.children.filter((child: Node) => !blank(child));
				const [items] = children;
				if (children.length === 1 && items.type === "JSXElement" && component(items.openingElement.name) === "Items") {
					// Keep the surrounding whitespace of the List, and the content of the Items.
					node.children = node.children.flatMap((child: Node) =>
						child === items ? items.children.filter((inner: Node) => !blank(inner)) : [child],
					);
					rewrites++;
				}
			}
			if (name === "Items" && component(path.parent?.node?.openingElement?.name) !== "List") todo(path, TODO.items);
			return undefined;
		},
	});

	// An `Items` that stayed inside a `List` with siblings still needs a decision.
	recast.visit(ast, {
		visitJSXElement(path: Path) {
			if (
				component(path.node.openingElement.name) === "Items" &&
				component(path.parent?.node?.openingElement?.name) === "List"
			)
				todo(path, TODO.items);
			this.traverse(path);
		},
	});

	if (!rewrites && !todos) return { code: source, rewrites, todos };
	let { code } = recast.print(ast, format);
	if (useTabs) {
		// recast indents the lines it prints with spaces after the tabs it kept: finish the job on those lines only.
		const original = new Set(source.split(/\r?\n/));
		code = code
			.split(format.lineTerminator)
			.map((line) => (original.has(line) ? line : line.replace(/^[\t ]+/, (indent) => indent.replace(/ {4}/g, "\t"))))
			.join(format.lineTerminator);
	}
	return { code, rewrites, todos };
}
