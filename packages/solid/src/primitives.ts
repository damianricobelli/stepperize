import { fail, type Step, warn } from "@stepperize/core";
import {
	checkTrigger,
	contentAttrs,
	focusInside,
	HIDDEN,
	type ItemValue,
	indicatorAttrs,
	itemAttrs,
	itemBits,
	itemValue,
	listAttrs,
	navAttrs,
	navBits,
	navIdle,
	OPTION_KEYS,
	onListKeydown,
	reportError,
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	type Ui,
} from "@stepperize/core/primitives";
import {
	type Component,
	createComponent,
	createComputed,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	DEV,
	type JSX,
	mergeProps,
	on,
	onCleanup,
	onMount,
	Show,
	splitProps,
	untrack,
	useContext,
	type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Scope } from "./definition";
import type { ContentOwnProps, ItemOwnProps, ListOwnProps, Polymorphic, RootProps } from "./types";

/** Unstyled, accessible components bound to one flow, so `step` props are typed with its ids. */
export type Primitives<S extends readonly Step[]> = {
	Root: Component<RootProps<S>>;
	List: Polymorphic<"ol", ListOwnProps<S>>;
	Item: Polymorphic<"li", ItemOwnProps<S>>;
	Trigger: Polymorphic<"button">;
	Title: Polymorphic<"span">;
	Description: Polymorphic<"span">;
	Indicator: Polymorphic<"span">;
	Content: Polymorphic<"div", ContentOwnProps<S>>;
	Prev: Polymorphic<"button">;
	Next: Polymorphic<"button">;
	/** The enclosing `Stepper.Item`: its step, index, state and whether it can be reached. Reactive, like props. */
	useItem: () => ItemValue<S>;
};

type RootValue = {
	/** Live: its fields follow the Root. */
	ui: Ui;
	/** Tabs need triggers: each one tells its Root while it is mounted. */
	register: () => void;
};

const UiContext = createContext<RootValue>();
const ItemContext = createContext<ItemValue>();
/** The step index a `Stepper.List` function is rendering, so its Item needs no `step` prop. */
const IndexContext = createContext(-1);
/** `tabs` is true inside a tablist: its items are presentational. */
const TablistContext = createContext<{ readonly tabs: boolean }>();

const useRoot = () => useContext(UiContext) ?? fail("SZ100", "Missing Stepper.Root. Render the primitives inside it.");

function useItem<S extends readonly Step[]>(): ItemValue<S> {
	return (useContext(ItemContext) ??
		fail("SZ101", "Missing Stepper.Item. Render this primitive inside a Stepper.Item.")) as ItemValue<S>;
}

/**
 * A primitive's props as its implementation sees them: `T` erased. What it does
 * not read goes to the element untouched.
 */
type Erased<Own = unknown> = Own &
	Omit<{ as?: ValidComponent; ref?: unknown; children?: JSX.Element }, keyof Own> & { [attribute: string]: unknown };

/**
 * Callers see a signature generic over what `as` renders, so its props and `ref`
 * are typed; the implementation is the same for every `T`. The one cast between them.
 */
const polymorphic = <Default extends ValidComponent, Own = unknown>(render: (props: Erased<Own>) => JSX.Element) =>
	render as Polymorphic<Default, Own>;

/** Run the caller's handler: a function, or Solid's `[function, data]` pair. */
function call(handler: unknown, event: Event) {
	if (typeof handler === "function") handler(event);
	else if (Array.isArray(handler) && typeof handler[0] === "function") handler[0](handler[1], event);
}

/**
 * Render the default tag, or what `as` names. `attrs` wins over what the caller
 * passed, except where a primitive only sets a default. In development, check
 * that an `as` component really put the props on an element.
 */
function element(
	name: string,
	tag: string,
	local: { as?: ValidComponent; ref?: unknown },
	rest: object,
	// Opaque to the types: an index signature would swallow `component`.
	attrs: () => object,
	extra: object,
	check?: (node: Element) => void,
) {
	let node: Element | undefined;
	const ref = (value: Element) => {
		node = value;
		// Solid compiles every `ref` given to a component into a function.
		if (typeof local.ref === "function") local.ref(value);
	};
	if (DEV) {
		onMount(() => {
			if (node) check?.(node);
			else if (typeof local.as === "function") {
				warn(
					"SZ001",
					`Stepper.${name} received an \`as\` component that did not spread its props (including \`ref\`) onto an element, so ARIA attributes and handlers are missing.`,
				);
			}
		});
	}
	return createComponent(
		Dynamic,
		mergeProps(
			{
				get component() {
					return local.as ?? tag;
				},
			},
			rest,
			attrs,
			extra,
			{ ref },
		),
	);
}

const NONE = () => ({});

/** `<Show>` as Content uses it: one signature instead of the keyed overloads. */
const Mount: Component<{ when: boolean; children: JSX.Element }> = Show;

/**
 * For Prev and Next: `type="button"` unless `as` names another tag. A component
 * gets it too: a design-system button inside a form would otherwise submit it.
 * It is a default, so a `type` the caller passes still wins.
 */
const buttonType = (as: unknown) => (typeof as === "string" && as !== "button" ? {} : { type: "button" });

/**
 * A render function declares its parameter, the rule `<Show>` and `<Match>`
 * follow. A function without one is content: one of Solid's own accessors, such
 * as what `<For>` or `<Show>` returns.
 */
const renders = <F extends (...args: never[]) => JSX.Element>(children: JSX.Element | F): children is F =>
	typeof children === "function" && children.length > 0;

/**
 * Children that may be a function of something the primitive knows. The call is
 * not tracked, as in `<Show>`: what the function reads at its top level must not
 * render the whole subtree again, only the expressions in its JSX follow the flow.
 */
const resolve = <T>(children: JSX.Element | ((value: T) => JSX.Element), value: T): JSX.Element =>
	renders(children) ? untrack(() => children(value)) : children;

function createRoot<S extends readonly Step[]>(scope: Scope<S>): Component<RootProps<S>> {
	return (props) => {
		const [, local, rest] = splitProps(props, OPTION_KEYS, ["orientation", "children", "ref"]);
		// Only the option keys are read from the props, never the children or attributes.
		const shared = scope.useFlow(props);
		// The same on the server and the client. The dash keeps one Root's prefix from starting another's.
		const id = `${createUniqueId()}-`;
		// Tabs need triggers. Assume them (server HTML and the usual layout never change),
		// then count the ones that actually mounted.
		const [triggers, setTriggers] = createSignal(0);
		const [mounted, setMounted] = createSignal(false);
		onMount(() => setMounted(true));
		const orientation = () => local.orientation ?? "horizontal";
		const ui: Ui = {
			id,
			get orientation() {
				return orientation();
			},
			// The policy the flow applies, so the markup never disagrees with what a click does.
			get tabs() {
				return !shared.stepper.isLinear && (!mounted() || triggers() > 0);
			},
		};
		const value: RootValue = {
			ui,
			register: () => {
				setTriggers((count) => count + 1);
				onCleanup(() => setTriggers((count) => count - 1));
			},
		};
		const status = createMemo(() => statusBits(shared.view()));
		const index = createMemo(() => shared.view().index);
		let root: HTMLDivElement | undefined;
		let region: HTMLSpanElement | undefined;
		// Computations run before Solid touches the DOM: was focus in this stepper?
		let inside = false;
		createComputed(
			on(
				index,
				() => {
					inside = focusInside(root);
				},
				{ defer: true },
			),
		);
		createEffect(on(index, () => stepChanged(root, region, shared.flow.current, ui, inside), { defer: true }));
		const attrs: () => object = () => rootAttrs(orientation(), status());

		return createComponent(scope.FlowContext.Provider, {
			value: shared,
			get children() {
				return createComponent(UiContext.Provider, {
					value,
					get children() {
						return createComponent(
							Dynamic,
							mergeProps({ component: "div" }, attrs, rest, {
								ref: (node: HTMLDivElement) => {
									root = node;
									if (typeof local.ref === "function") local.ref(node);
								},
								get children() {
									return [
										// The function only tracks what it reads, so a Root that ignores the stepper never updates for it.
										resolve(local.children, shared.stepper),
										createComponent(Dynamic<"span">, {
											component: "span",
											ref: (node: HTMLSpanElement) => {
												region = node;
											},
											"aria-live": "polite",
											style: HIDDEN,
										}),
									];
								},
							}),
						);
					},
				});
			},
		});
	};
}

function createList<S extends readonly Step[]>(scope: Scope<S>) {
	return polymorphic<"ol", ListOwnProps<S>>((props) => {
		const [local, rest] = splitProps(props, ["orientation", "children", "as", "ref", "onKeyDown", "onkeydown"]);
		const { ui } = useRoot();
		// Read lazily in the handler so the List never updates on navigation.
		const { flow } = scope.useShared();
		const orientation = () => local.orientation ?? ui.orientation;
		return createComponent(TablistContext.Provider, {
			value: ui,
			get children() {
				// What the caller passes wins over the computed attributes, as in every other binding.
				return element(
					"List",
					"ol",
					local,
					mergeProps(() => listAttrs(ui, orientation()), rest),
					NONE,
					{
						// Solid types `currentTarget` as the element the handler is on.
						onKeyDown: (event: KeyboardEvent & { currentTarget: HTMLElement }) => {
							// Solid keeps both spellings in one slot: take whichever the caller used.
							call(local.onKeyDown ?? local.onkeydown, event);
							onListKeydown(event, event.currentTarget, flow, ui, orientation());
						},
						get children() {
							const children = local.children;
							// Called once per step, untracked like every other render function.
							return renders(children)
								? scope.steps.map((step, index) =>
										createComponent(IndexContext.Provider, {
											value: index,
											get children() {
												return untrack(() => children(step, index));
											},
										}),
									)
								: children;
						},
					},
				);
			},
		});
	});
}

function createItem<S extends readonly Step[]>(scope: Scope<S>) {
	return polymorphic<"li", ItemOwnProps<S>>((props) => {
		const [local, rest] = splitProps(props, ["step", "children", "as", "ref"]);
		const tablist = useContext(TablistContext);
		const auto = useContext(IndexContext);
		const { view } = scope.useShared();
		const index = () => (local.step === undefined ? auto : (scope.positions.get(local.step) ?? -1));
		const step = (): S[number] =>
			scope.steps[index()] ??
			fail(
				local.step === undefined ? "SZ101" : "SZ102",
				local.step === undefined
					? "Stepper.Item needs a `step` prop outside a Stepper.List function."
					: `Step "${local.step}" not found.`,
			);
		// One number per item, its trigger included: it only changes when what they show does.
		const bits = createMemo(() => itemBits(view(), step().id));
		const value = createMemo(() => itemValue<S>(step(), index(), bits()));
		const item: ItemValue<S> = {
			get step() {
				return value().step;
			},
			get index() {
				return value().index;
			},
			get state() {
				return value().state;
			},
			get invalid() {
				return value().invalid;
			},
			get disabled() {
				return value().disabled;
			},
			get pending() {
				return value().pending;
			},
		};
		return createComponent(ItemContext.Provider, {
			value: item,
			get children() {
				return element(
					"Item",
					"li",
					local,
					mergeProps(() => itemAttrs(value(), !!tablist?.tabs), rest),
					NONE,
					{
						get children() {
							return resolve(local.children, item);
						},
					},
				);
			},
		});
	});
}

function createTrigger<S extends readonly Step[]>(scope: Scope<S>) {
	return polymorphic<"button">((props) => {
		const [local, rest] = splitProps(props, ["children", "as", "ref", "disabled", "onClick", "onclick"]);
		const { ui, register } = useRoot();
		// Read lazily in the handler: the item above already follows this step.
		const { flow } = scope.useShared();
		const item = useItem<S>();
		onMount(register);
		// Only steps blocked before the running move are natively `disabled`: see `triggerAttrs`.
		let blocked = item.disabled;
		const disabled = createMemo(() => {
			if (!item.pending) blocked = item.disabled;
			return !!local.disabled || blocked;
		});
		return element(
			"Trigger",
			"button",
			local,
			// A default only: with `as`, the type of your own element stands. A trigger is often a link.
			mergeProps(() => (local.as ? {} : { type: "button" }), rest),
			() => triggerAttrs(ui, item, disabled(), scope.steps.length),
			{
				onClick: (event: MouseEvent) => {
					call(local.onClick ?? local.onclick, event);
					if (!event.defaultPrevented && !item.pending) flow.goTo(item.step.id).catch(reportError);
				},
				get children() {
					return local.children;
				},
			},
			(node) => checkTrigger(node, item.step.id),
		);
	});
}

/** `Title` and `Description`: a `span` showing the same-named field of the step, unless you pass children. */
function createText(field: "title" | "description") {
	return polymorphic<"span">((props) => {
		const [local, rest] = splitProps(props, ["children", "as", "ref"]);
		const item = useContext(ItemContext);
		return element(
			field === "title" ? "Title" : "Description",
			"span",
			local,
			mergeProps({ "data-component": `stepper-${field}` }, rest),
			NONE,
			{
				get children() {
					// The fields are yours: whatever they hold is rendered, like any child.
					const step: { id: string; title?: JSX.Element; description?: JSX.Element } | undefined = item?.step;
					return local.children ?? step?.[field];
				},
			},
		);
	});
}

/** A decorative mark for the step: hidden from assistive technology, styled through `data-state`. */
const Indicator = polymorphic<"span">((props) => {
	const [local, rest] = splitProps(props, ["children", "as", "ref"]);
	const item = useItem();
	return element(
		"Indicator",
		"span",
		local,
		mergeProps(() => indicatorAttrs(item), rest),
		NONE,
		{
			get children() {
				return local.children;
			},
		},
	);
});

function createContent<S extends readonly Step[]>(scope: Scope<S>) {
	return polymorphic<"div", ContentOwnProps<S>>((props) => {
		const [local, rest] = splitProps(props, ["step", "forceMount", "children", "as", "ref"]);
		const { ui } = useRoot();
		const { view } = scope.useShared();
		// Evaluated now, not when shown: no step is ever current under an unknown id, so a typo would
		// otherwise render nothing, silently.
		const step = createMemo(
			() => scope.steps[scope.positions.get(local.step) ?? -1] ?? fail("SZ102", `Step "${local.step}" not found.`),
		);
		const active = createMemo(() => view().current.id === step().id);
		return createComponent(Mount, {
			get when() {
				return active() || !!local.forceMount;
			},
			get children() {
				return element(
					"Content",
					"div",
					local,
					mergeProps(() => contentAttrs(ui, step(), active()), rest),
					NONE,
					{
						get children() {
							return local.children;
						},
					},
				);
			},
		});
	});
}

/**
 * `Next` validates the current step and moves on; on the last step it finishes the
 * flow (`onFinish`) once. `Prev` goes back to the step you came from.
 */
function createNav<S extends readonly Step[]>(dir: "next" | "prev", scope: Scope<S>) {
	return polymorphic<"button">((props) => {
		const [local, rest] = splitProps(props, ["children", "as", "ref", "disabled", "onClick", "onclick"]);
		const { flow, view } = scope.useShared();
		const bits = createMemo(() => navBits(view(), dir));
		return element(
			dir === "next" ? "Next" : "Prev",
			"button",
			local,
			mergeProps(() => buttonType(local.as), rest),
			() => navAttrs(dir, bits(), !!local.disabled),
			{
				onClick: (event: MouseEvent) => {
					call(local.onClick ?? local.onclick, event);
					// Nothing awaits a click: a move that throws (a guard, a schema, a rejecting `onFinish`) is
					// reported like an error in any event listener. The flow is idle again, so the button works.
					if (!event.defaultPrevented && !navIdle(bits())) flow[dir]().catch(reportError);
				},
				get children() {
					return local.children;
				},
			},
		);
	});
}

const Title = createText("title");
const Description = createText("description");

export function createPrimitives<S extends readonly Step[]>(scope: Scope<S>): Primitives<S> {
	return {
		Root: createRoot(scope),
		List: createList(scope),
		Item: createItem(scope),
		Trigger: createTrigger(scope),
		Title,
		Description,
		Indicator,
		Content: createContent(scope),
		Prev: createNav("prev", scope),
		Next: createNav("next", scope),
		useItem,
	};
}
