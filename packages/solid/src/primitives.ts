import { fail, type Id, type Step, warn } from "@stepperize/core";
import {
	type Attrs,
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
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	type Ui,
} from "@stepperize/core/primitives";
import {
	type Accessor,
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
	useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { pickOptions, type Scope } from "./definition";
import type { ButtonProps, ContentProps, ItemProps, ListProps, RootProps, TextProps } from "./types";

/** Unstyled, accessible components bound to one flow, so `step` props are typed with its ids. */
export type Primitives<S extends readonly Step[]> = {
	Root: Component<RootProps<S>>;
	List: Component<ListProps<S>>;
	Item: Component<ItemProps<S>>;
	Trigger: Component<ButtonProps>;
	Title: Component<TextProps>;
	Description: Component<TextProps>;
	Indicator: Component<TextProps>;
	Content: Component<ContentProps<S>>;
	Prev: Component<ButtonProps>;
	Next: Component<ButtonProps>;
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

type Props = Record<string, any>;
type Handler<E extends Event> = JSX.EventHandlerUnion<HTMLElement, E> | undefined;

/** Solid handlers are a function or a `[function, data]` pair. */
function call<E extends Event>(handler: Handler<E>, event: E) {
	if (typeof handler === "function") (handler as (event: E) => void)(event);
	else if (handler) (handler[0] as (data: unknown, event: E) => void)(handler[1], event);
}

/**
 * Render the default tag, or what `as` names. `attrs` wins over what the caller
 * passed, except where a primitive only sets a default. In development, check
 * that an `as` component really put the props on an element.
 */
function element(
	name: string,
	tag: string,
	props: Props,
	rest: Props,
	attrs: Accessor<Attrs>,
	extra?: Props,
	check?: (node: Element) => void,
) {
	let node: Element | undefined;
	const ref = (value: Element) => {
		node = value;
		const forwarded = props.ref as ((value: Element) => void) | undefined;
		if (typeof forwarded === "function") forwarded(value);
	};
	if (DEV) {
		onMount(() => {
			if (node) check?.(node);
			else if (typeof props.as === "function") {
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
					return props.as ?? tag;
				},
			},
			rest,
			attrs,
			extra ?? {},
			{ ref },
		) as never,
	);
}

/** Children that may be a function of something the primitive knows. */
const resolve = <T>(children: unknown, value: T): JSX.Element =>
	typeof children === "function" ? (children as (value: T) => JSX.Element)(value) : (children as JSX.Element);

function createRoot<S extends readonly Step[]>(scope: Scope<S>): Component<RootProps<S>> {
	return (props) => {
		const [, local, rest] = splitProps(props as Props, OPTION_KEYS, ["orientation", "children", "ref"]);
		const shared = scope.useFlow(() => pickOptions<S>(props as Props));
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
			get tabs() {
				return !(props.linear ?? scope.defaults.linear) && (!mounted() || triggers() > 0);
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

		return createComponent(scope.FlowContext.Provider, {
			value: shared,
			get children() {
				return createComponent(UiContext.Provider, {
					value,
					get children() {
						return createComponent(
							Dynamic,
							mergeProps({ component: "div" }, () => rootAttrs(orientation(), status()), rest, {
								ref: (node: HTMLDivElement) => {
									root = node;
									if (typeof local.ref === "function") local.ref(node);
								},
								get children() {
									return [
										// The function only tracks what it reads, so a Root that ignores the stepper never updates for it.
										resolve(local.children, shared.stepper),
										createComponent(Dynamic, {
											component: "span",
											ref: (node: HTMLSpanElement) => {
												region = node;
											},
											"aria-live": "polite",
											style: HIDDEN,
										} as never),
									];
								},
							}) as never,
						);
					},
				});
			},
		});
	};
}

function createList<S extends readonly Step[]>(scope: Scope<S>): Component<ListProps<S>> {
	return (props) => {
		const [local, rest] = splitProps(props as Props, ["orientation", "children", "as", "ref", "onKeyDown"]);
		const { ui } = useRoot();
		// Read lazily in the handler so the List never updates on navigation.
		const { flow } = scope.useShared();
		const orientation = () => local.orientation ?? ui.orientation;
		return createComponent(TablistContext.Provider, {
			value: ui,
			get children() {
				return element("List", "ol", local, rest, () => listAttrs(ui, orientation()), {
					onKeyDown: (event: KeyboardEvent) => {
						call(local.onKeyDown, event);
						onListKeydown(event, event.currentTarget as HTMLElement, flow, ui, orientation());
					},
					get children() {
						const children = local.children;
						return typeof children === "function"
							? scope.steps.map((step, index) =>
									createComponent(IndexContext.Provider, {
										value: index,
										get children() {
											return (children as (step: S[number], index: number) => JSX.Element)(step, index);
										},
									}),
								)
							: children;
					},
				});
			},
		});
	};
}

function createItem<S extends readonly Step[]>(scope: Scope<S>): Component<ItemProps<S>> {
	return (props) => {
		const [local, rest] = splitProps(props as Props, ["step", "children", "as", "ref"]);
		const tablist = useContext(TablistContext);
		const auto = useContext(IndexContext);
		const { view } = scope.useShared();
		const index = () => (local.step === undefined ? auto : (scope.positions.get(local.step) ?? -1));
		const step = () =>
			(scope.steps[index()] as S[number] | undefined) ??
			fail(
				local.step === undefined ? "SZ101" : "SZ102",
				local.step === undefined
					? "Stepper.Item needs a `step` prop outside a Stepper.List function."
					: `Step "${local.step}" not found.`,
			);
		// One number per item, its trigger included: it only changes when what they show does.
		const bits = createMemo(() => itemBits(view(), step().id as Id<S>));
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
				return element("Item", "li", local, rest, () => itemAttrs(value(), !!tablist?.tabs), {
					get children() {
						return resolve(local.children, item);
					},
				});
			},
		});
	};
}

function createTrigger<S extends readonly Step[]>(scope: Scope<S>): Component<ButtonProps> {
	return (props) => {
		const [local, rest] = splitProps(props as Props, ["children", "as", "ref", "disabled", "onClick"]);
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
			// A default only: with `as`, the type of your own element stands.
			mergeProps(() => (local.as ? {} : { type: "button" }), rest),
			() => triggerAttrs(ui, item, disabled(), scope.steps.length),
			{
				onClick: (event: MouseEvent) => {
					call(local.onClick, event);
					if (!event.defaultPrevented && !item.pending) void flow.goTo(item.step.id as Id<S>);
				},
				get children() {
					return local.children;
				},
			},
			(node) => checkTrigger(node, item.step.id),
		);
	};
}

/** `Title` and `Description`: a `span` showing the same-named field of the step, unless you pass children. */
function createText(field: "title" | "description"): Component<TextProps> {
	return (props) => {
		const [local, rest] = splitProps(props as Props, ["children", "as", "ref"]);
		const item = useContext(ItemContext);
		return element(
			field === "title" ? "Title" : "Description",
			"span",
			local,
			mergeProps({ "data-component": `stepper-${field}` }, rest),
			() => ({}),
			{
				get children() {
					return local.children ?? (item?.step as Record<string, JSX.Element> | undefined)?.[field];
				},
			},
		);
	};
}

/** A decorative mark for the step: hidden from assistive technology, styled through `data-state`. */
const Indicator: Component<TextProps> = (props) => {
	const [local, rest] = splitProps(props as Props, ["children", "as", "ref"]);
	const item = useItem();
	return element(
		"Indicator",
		"span",
		local,
		mergeProps(() => indicatorAttrs(item), rest),
		() => ({}),
		{
			get children() {
				return local.children;
			},
		},
	);
};

function createContent<S extends readonly Step[]>(scope: Scope<S>): Component<ContentProps<S>> {
	return (props) => {
		const [local, rest] = splitProps(props as Props, ["step", "forceMount", "children", "as", "ref"]);
		const { ui } = useRoot();
		const { view } = scope.useShared();
		const active = createMemo(() => view().current.id === local.step);
		const step = () =>
			scope.steps[scope.positions.get(local.step) ?? -1] ?? fail("SZ102", `Step "${local.step}" not found.`);
		return createComponent(Show, {
			get when() {
				return active() || local.forceMount;
			},
			get children() {
				return element(
					"Content",
					"div",
					local,
					mergeProps(() => contentAttrs(ui, step(), active()), rest),
					() => ({}),
					{
						get children() {
							return local.children;
						},
					},
				);
			},
		} as never);
	};
}

/**
 * `Next` validates the current step and moves on; on the last step it finishes the
 * flow (`onFinish`) once. `Prev` goes back to the step you came from.
 */
function createNav<S extends readonly Step[]>(dir: "next" | "prev", scope: Scope<S>): Component<ButtonProps> {
	return (props) => {
		const [local, rest] = splitProps(props as Props, ["children", "as", "ref", "disabled", "onClick"]);
		const { flow, view } = scope.useShared();
		const bits = createMemo(() => navBits(view(), dir));
		return element(
			dir === "next" ? "Next" : "Prev",
			"button",
			local,
			mergeProps(() => (local.as ? {} : { type: "button" }), rest),
			() => navAttrs(dir, bits(), !!local.disabled),
			{
				onClick: (event: MouseEvent) => {
					call(local.onClick, event);
					// A rejecting `onFinish` rejects `next()`: the flow is not finished and the button works
					// again. The error belongs to `onFinish`, which reports it; nothing awaits this click.
					if (!event.defaultPrevented && !navIdle(bits())) flow[dir]().catch(() => {});
				},
				get children() {
					return local.children;
				},
			},
		);
	};
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
