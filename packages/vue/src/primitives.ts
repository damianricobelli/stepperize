import { fail, type Id, type Step, warn } from "@stepperize/core";
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
	liveRegion,
	navAttrs,
	navBits,
	navIdle,
	type Orientation,
	onListKeydown,
	panelId,
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	type Ui,
} from "@stepperize/core/primitives";
import {
	Comment,
	type ComputedRef,
	cloneVNode,
	computed,
	defineComponent,
	Fragment,
	getCurrentInstance,
	h,
	type InjectionKey,
	inject,
	isVNode,
	mergeProps,
	onMounted,
	onUnmounted,
	onUpdated,
	type PropType,
	provide,
	type Ref,
	ref,
	type ShallowRef,
	shallowRef,
	Text,
	useId,
	type VNode,
	type VNodeChild,
	watch,
} from "vue";
import { optionProps, pickOptions, type Scope } from "./definition";
import type {
	ButtonProps,
	ContentProps,
	ItemProps,
	ItemSlots,
	ListProps,
	ListSlots,
	PrimitiveProps,
	RootProps,
	RootSlots,
	StepperComponent,
} from "./types";

type TextSlots = { default?: () => VNodeChild };

/** Unstyled, accessible components bound to one flow, so `step` props are typed with its ids. */
export type Primitives<S extends readonly Step[]> = {
	Root: StepperComponent<RootProps<S>, RootSlots<S>, HTMLDivElement>;
	List: StepperComponent<ListProps, ListSlots<S>, HTMLOListElement>;
	Item: StepperComponent<ItemProps<S>, ItemSlots<S>, HTMLLIElement>;
	Trigger: StepperComponent<ButtonProps, TextSlots, HTMLButtonElement>;
	Title: StepperComponent<PrimitiveProps, TextSlots, HTMLSpanElement>;
	Description: StepperComponent<PrimitiveProps, TextSlots, HTMLSpanElement>;
	Indicator: StepperComponent<PrimitiveProps, TextSlots, HTMLSpanElement>;
	/** While its step is not current (and without `force-mount`) it renders nothing: `$el` is a placeholder comment. */
	Content: StepperComponent<ContentProps<S>, TextSlots, HTMLDivElement | Comment>;
	Prev: StepperComponent<ButtonProps, TextSlots, HTMLButtonElement>;
	Next: StepperComponent<ButtonProps, TextSlots, HTMLButtonElement>;
	/** The enclosing `Stepper.Item`: its step, index, state and whether it can be reached. */
	useItem: () => ComputedRef<ItemValue<S>>;
};

const UiKey: InjectionKey<ComputedRef<Ui>> = Symbol("stepperize.ui");
const ItemKey: InjectionKey<ComputedRef<ItemValue>> = Symbol("stepperize.item");
/** The step index the `item` slot of a List is rendering, so its Item needs no `step` prop. */
const IndexKey: InjectionKey<number> = Symbol("stepperize.index");
/** `true` inside a tablist: its items are presentational. */
const TablistKey: InjectionKey<ComputedRef<boolean>> = Symbol("stepperize.tablist");
/** How many triggers the Root has mounted. Tabs need triggers. */
const TriggersKey: InjectionKey<Ref<number>> = Symbol("stepperize.triggers");
/** A Content tells its Root it mounted, in case focus waits for its panel. */
const ArrivedKey: InjectionKey<(step: string) => void> = Symbol("stepperize.arrived");

const useUi = () => inject(UiKey, null) ?? fail("SZ100", "Missing Stepper.Root. Render the primitives inside it.");

function useItem<S extends readonly Step[]>(): ComputedRef<ItemValue<S>> {
	const item = inject(ItemKey, null);
	return (item ?? fail("SZ101", "Missing Stepper.Item. Render this primitive inside a Stepper.Item.")) as never;
}

type Props = Record<string, unknown>;

/** The real nodes of a slot, fragments flattened: comments and whitespace are not. */
function real(nodes: unknown, out: VNode[] = []): VNode[] {
	for (const node of Array.isArray(nodes) ? nodes : []) {
		if (Array.isArray(node)) real(node, out);
		else if (!isVNode(node)) {
			if ((typeof node === "string" && node.trim()) || typeof node === "number") out.push(h(Text, String(node)));
		} else if (node.type === Fragment) real(node.children, out);
		else if (node.type !== Comment && !(node.type === Text && !String(node.children).trim())) out.push(node);
	}
	return out;
}

const empty = (children: unknown) =>
	children == null ||
	(Array.isArray(children) ? !real(children).length : typeof children === "object" && !Object.keys(children).length);

// ShapeFlags: a component, and the three kinds of children.
const COMPONENT = 2 | 4;
const TEXT_CHILDREN = 8;
const ARRAY_CHILDREN = 16;
const SLOTS_CHILDREN = 32;

/**
 * Give an empty child `content` as its children: an empty `<h3 />` under `Title` shows the
 * title, an empty `<nav />` under `List` holds the items. `node` is our clone, so it can change:
 * its scoped-style id, directives, transition and ref stay. Its block data from the caller's
 * template is dropped, so Vue diffs the new children in full.
 */
function fill(node: VNode, content: VNodeChild): VNode {
	if (content == null || typeof content === "boolean" || !empty(node.children)) return node;
	(node as { dynamicChildren?: unknown }).dynamicChildren = null;
	node.shapeFlag &= ~(TEXT_CHILDREN | ARRAY_CHILDREN | SLOTS_CHILDREN);
	if (node.shapeFlag & COMPONENT) {
		node.children = { default: () => content };
		node.shapeFlag |= SLOTS_CHILDREN;
	} else if (typeof content === "string" || typeof content === "number") {
		node.children = String(content);
		node.shapeFlag |= TEXT_CHILDREN;
	} else {
		node.children = (Array.isArray(content) ? content : [content]) as VNode[];
		node.shapeFlag |= ARRAY_CHILDREN;
	}
	return node;
}

/**
 * Render the default tag, or hand every prop to the element the caller put in the slot.
 * `content` is what the primitive shows when nobody says otherwise: the step's title, or a
 * List's items. `required` content (the items) is lost if your element brings its own.
 */
function element(
	name: string,
	tag: string,
	asChild: boolean,
	props: Props,
	slot?: () => unknown,
	content?: () => VNodeChild,
	required = false,
) {
	if (!asChild) {
		const own = slot?.();
		return h(tag, props, (content && !real(own).length ? content() : own) as never);
	}
	const [child, ...rest] = real(slot?.());
	if (process.env.NODE_ENV !== "production") {
		if (rest.length) {
			warn(
				"SZ001",
				`Stepper.${name} received \`as-child\` with more than one node in its default slot. Only the first receives the props; the others are not rendered. Wrap them in one element.`,
			);
		}
		if (required && content && child && !empty(child.children)) {
			warn(
				"SZ001",
				`Stepper.${name} received \`as-child\` and an \`item\` slot, but its element is not empty, so the items are not rendered. Leave the element empty: the items fill it.`,
			);
		}
	}
	if (child && child.type !== Text) return fill(cloneVNode(child, props, true), content?.());
	if (process.env.NODE_ENV !== "production") {
		warn(
			"SZ001",
			`Stepper.${name} received \`as-child\` without an element in its default slot, so ARIA attributes and handlers are missing.`,
		);
	}
	return child;
}

/**
 * Development only: with `as-child`, check that the element on the page received the props. A
 * component that declares `inheritAttrs: false` and does not bind `$attrs` drops them silently.
 */
function useAsChildCheck(name: string, asChild: () => boolean) {
	if (process.env.NODE_ENV === "production") return;
	const instance = getCurrentInstance();
	const expected = `stepper-${name.toLowerCase()}`;
	const check = () => {
		const el = instance?.subTree.el as Node | null | undefined;
		// Nothing rendered (an inactive Content), or text and fragments, which Vue reports itself.
		if (!asChild() || !(el instanceof Element) || el.getAttribute("data-component") === expected) return;
		warn(
			"SZ001",
			`Stepper.${name} received \`as-child\`, but the element it rendered (<${el.localName}>) did not receive its props, so ARIA attributes and handlers are missing. A component in the slot must pass its attributes to its root element: with \`inheritAttrs: false\`, bind \`v-bind="$attrs"\`.`,
		);
	};
	onMounted(check);
	onUpdated(check);
}

/** Focus is in a panel of this Root for another step, still on the page, and the panel of `step` is not. */
function waiting(root: Element, ui: Ui, step: string): boolean {
	const scope = root.getRootNode() as Document;
	if (scope.getElementById(panelId(ui, step))) return false;
	const CONTENT = '[data-component="stepper-content"]';
	// The closest panel of this Root: a nested stepper's panels are not it.
	for (let node = scope.activeElement?.closest(CONTENT); node && root.contains(node); ) {
		const id = node.getAttribute("data-step") ?? "";
		if (node.id === panelId(ui, id)) return id !== step && !node.closest("[hidden]");
		node = node.parentElement?.closest(CONTENT);
	}
	return false;
}

/** A template ref on a component is its instance: the element is what the primitives need. */
const node = <E extends Element>(target: ShallowRef<unknown>) =>
	((target.value as { $el?: E } | null)?.$el ?? target.value) as E | null;

const asChild = { type: Boolean, default: false };
/** A default only: with `as-child`, the type of your own element stands. */
const BUTTON = { type: "button" };

function createRoot<S extends readonly Step[]>(scope: Scope<S>) {
	return defineComponent({
		name: "StepperRoot",
		inheritAttrs: false,
		props: { ...optionProps, orientation: String as PropType<Orientation> },
		setup(props, { attrs, slots }) {
			const shared = scope.useFlow(() => pickOptions<S>(props));
			provide(scope.FlowKey, shared);
			// `useId` is the same on the server and the client. The dash keeps one Root's prefix from starting another's.
			const id = `${useId()}-`;
			// Tabs need triggers. Assume them (server HTML and the usual layout never change),
			// then count the ones that actually mounted.
			const triggers = ref(0);
			const mounted = ref(false);
			provide(TriggersKey, triggers);
			onMounted(() => {
				mounted.value = true;
			});
			// On its own, so `ui` only becomes a new object when the answer changes, not on every count.
			const tabs = computed(() => !(props.linear ?? scope.defaults.linear) && (!mounted.value || triggers.value > 0));
			const ui = computed<Ui>(() => ({
				id,
				orientation: props.orientation ?? "horizontal",
				tabs: tabs.value,
			}));
			provide(UiKey, ui);
			const status = computed(() => statusBits(shared.view.value));

			const root = shallowRef<HTMLDivElement | null>(null);
			const region = shallowRef<HTMLSpanElement | null>(null);
			onMounted(() => {
				// Server HTML carries the style as an attribute, which a strict Content Security Policy
				// blocks, and hydration does not set it again. Set it through the CSSOM then.
				const span = region.value;
				if (span && !span.style.position) span.style.cssText = liveRegion(span.ownerDocument).style.cssText;
			});
			const index = () => shared.view.value.index;
			// Read before Vue touches the DOM: was focus in this stepper?
			let inside = false;
			// The step whose panel focus waits for: it mounts after the change (`<Transition mode="out-in">`).
			let owed: string | undefined;
			watch(
				index,
				() => {
					inside = focusInside(root.value);
				},
				{ flush: "sync" },
			);
			watch(
				index,
				() => {
					const step = shared.flow.current;
					owed = undefined;
					// Focus sits in the panel that is leaving and the new one is not there yet: announcing now
					// and focusing later would say the step twice, so both wait for the new panel.
					if (inside && root.value && waiting(root.value, ui.value, step.id)) owed = step.id;
					else stepChanged(root.value, region.value, step, ui.value, inside);
				},
				{ flush: "post" },
			);
			provide(ArrivedKey, (step) => {
				const el = root.value;
				if (step !== owed || !el) return;
				owed = undefined;
				// The old panel is gone, and focus with it, to <body>. Focus somewhere else on the page was
				// moved there on purpose and stays.
				const active = (el.getRootNode() as Document).activeElement;
				const lost = !active || active === el.ownerDocument.body || el.contains(active);
				stepChanged(el, region.value, shared.flow.current, ui.value, lost);
			});

			return () =>
				h("div", mergeProps(rootAttrs(ui.value.orientation, status.value), attrs, { ref: root }), [
					// The slot only tracks what it reads, so a Root that ignores the stepper never re-renders for it.
					slots.default?.(shared.stepper),
					h("span", { ref: region, "aria-live": "polite", style: HIDDEN }),
				]);
		},
	});
}

/** Tells the Items of one iteration of the `item` slot which step they are. */
const IndexScope = defineComponent({
	name: "StepperIndex",
	props: { index: { type: Number, required: true } },
	setup(props, { slots }) {
		provide(IndexKey, props.index);
		return () => slots.default?.();
	},
});

function createList<S extends readonly Step[]>(scope: Scope<S>) {
	return defineComponent({
		name: "StepperList",
		inheritAttrs: false,
		props: { orientation: String as PropType<Orientation>, asChild },
		setup(props, { attrs, slots }) {
			const ui = useUi();
			// Read lazily in the handler so the List never re-renders on navigation.
			const { flow } = scope.useShared();
			provide(
				TablistKey,
				computed(() => ui.value.tabs),
			);
			useAsChildCheck("List", () => props.asChild);
			return () => {
				const orientation = props.orientation ?? ui.value.orientation;
				const item = slots.item;
				const items =
					item &&
					(() =>
						scope.steps.map((step, index) => h(IndexScope, { key: step.id, index }, () => item({ step, index }))));
				return element(
					"List",
					"ol",
					props.asChild,
					// Listeners run in order: the caller's `@keydown` first, so it can `preventDefault()`.
					mergeProps(listAttrs(ui.value, orientation), attrs, {
						onKeydown: (event: KeyboardEvent) =>
							onListKeydown(event, event.currentTarget as HTMLElement, flow, ui.value, orientation),
					}),
					// With `as-child`, the default slot holds your element and the items fill it.
					items && !props.asChild ? undefined : slots.default,
					items,
					true,
				);
			};
		},
	});
}

function createItem<S extends readonly Step[]>(scope: Scope<S>) {
	return defineComponent({
		name: "StepperItem",
		inheritAttrs: false,
		props: { step: String as PropType<Id<S>>, asChild },
		setup(props, { attrs, slots }) {
			const tablist = inject(TablistKey, null);
			const auto = inject(IndexKey, -1);
			const { view } = scope.useShared();
			const index = computed(() => (props.step === undefined ? auto : (scope.positions.get(props.step) ?? -1)));
			const step = computed(
				() =>
					(scope.steps[index.value] as S[number] | undefined) ??
					fail(
						props.step === undefined ? "SZ101" : "SZ102",
						props.step === undefined
							? "Stepper.Item needs a `step` prop outside the `item` slot of a Stepper.List."
							: `Step "${props.step}" not found.`,
					),
			);
			// One dependency per item, its trigger included: a number only changes when what they show does.
			const bits = computed(() => itemBits(view.value, step.value.id as Id<S>));
			const item = computed(() => itemValue<S>(step.value, index.value, bits.value));
			provide(ItemKey, item);
			useAsChildCheck("Item", () => props.asChild);
			return () =>
				element("Item", "li", props.asChild, mergeProps(itemAttrs(item.value, !!tablist?.value), attrs), () =>
					slots.default?.(item.value),
				);
		},
	});
}

function createTrigger<S extends readonly Step[]>(scope: Scope<S>) {
	return defineComponent({
		name: "StepperTrigger",
		inheritAttrs: false,
		props: { asChild, disabled: { type: Boolean, default: false } },
		setup(props, { attrs, slots }) {
			const ui = useUi();
			const { flow } = scope.useShared();
			const item = useItem<S>();
			const target = shallowRef<unknown>(null);
			const triggers = inject(TriggersKey, null);
			onMounted(() => {
				if (triggers) triggers.value++;
				const button = node(target);
				// `as-child` on a component with several roots gives a text node, not an element.
				if (button instanceof Element) checkTrigger(button, item.value.step.id);
			});
			onUnmounted(() => {
				if (triggers) triggers.value--;
			});
			useAsChildCheck("Trigger", () => props.asChild);
			// Only steps blocked before the running move are natively `disabled`: see `triggerAttrs`.
			let blocked = item.value.disabled;
			return () => {
				const { pending, step } = item.value;
				if (!pending) blocked = item.value.disabled;
				return element(
					"Trigger",
					"button",
					props.asChild,
					mergeProps(
						props.asChild ? {} : BUTTON,
						attrs,
						triggerAttrs(ui.value, item.value, props.disabled || blocked, scope.steps.length),
						{
							ref: target,
							onClick: (event: MouseEvent) => {
								if (!event.defaultPrevented && !pending) void flow.goTo(step.id as Id<S>);
							},
						},
					),
					slots.default,
				);
			};
		},
	});
}

/**
 * `Title` and `Description`: a `span` showing the same-named field of the step, unless you fill
 * the slot. With `as-child`, an empty child shows the field too.
 */
function createText(field: "title" | "description") {
	const name = field === "title" ? "Title" : "Description";
	return defineComponent({
		name: `Stepper${name}`,
		inheritAttrs: false,
		props: { asChild },
		setup(props, { attrs, slots }) {
			const item = inject(ItemKey, null);
			useAsChildCheck(name, () => props.asChild);
			return () =>
				element(
					name,
					"span",
					props.asChild,
					mergeProps({ "data-component": `stepper-${field}` }, attrs),
					slots.default,
					() => (item?.value.step as Record<string, VNodeChild> | undefined)?.[field],
				);
		},
	});
}

/** A decorative mark for the step: hidden from assistive technology, styled through `data-state`. */
const Indicator = defineComponent({
	name: "StepperIndicator",
	inheritAttrs: false,
	props: { asChild },
	setup(props, { attrs, slots }) {
		const item = useItem();
		useAsChildCheck("Indicator", () => props.asChild);
		return () =>
			element("Indicator", "span", props.asChild, mergeProps(indicatorAttrs(item.value), attrs), slots.default);
	},
});

function createContent<S extends readonly Step[]>(scope: Scope<S>) {
	return defineComponent({
		name: "StepperContent",
		inheritAttrs: false,
		props: {
			step: { type: String as unknown as PropType<Id<S>>, required: true },
			forceMount: { type: Boolean, default: false },
			asChild,
		},
		setup(props, { attrs, slots }) {
			const ui = useUi();
			const { view } = scope.useShared();
			const active = computed(() => view.value.current.id === props.step);
			const arrived = inject(ArrivedKey, null);
			onMounted(() => arrived?.(props.step));
			useAsChildCheck("Content", () => props.asChild);
			return () => {
				if (!active.value && !props.forceMount) return null;
				const step =
					scope.steps[scope.positions.get(props.step) ?? -1] ?? fail("SZ102", `Step "${props.step}" not found.`);
				return element(
					"Content",
					"div",
					props.asChild,
					mergeProps(contentAttrs(ui.value, step, active.value), attrs),
					slots.default,
				);
			};
		},
	});
}

/**
 * `Next` validates the current step and moves on; on the last step it finishes the
 * flow (`onFinish`) once. `Prev` goes back to the step you came from.
 */
function createNav<S extends readonly Step[]>(dir: "next" | "prev", scope: Scope<S>) {
	const name = dir === "next" ? "Next" : "Prev";
	return defineComponent({
		name: `Stepper${name}`,
		inheritAttrs: false,
		props: { asChild, disabled: { type: Boolean, default: false } },
		setup(props, { attrs, slots }) {
			const { flow, view } = scope.useShared();
			const bits = computed(() => navBits(view.value, dir));
			useAsChildCheck(name, () => props.asChild);
			return () =>
				element(
					name,
					"button",
					props.asChild,
					mergeProps(props.asChild ? {} : BUTTON, attrs, navAttrs(dir, bits.value, props.disabled), {
						onClick: (event: MouseEvent) => {
							// A rejecting `onFinish` rejects `next()`: the flow is not finished and the button works
							// again. The error belongs to `onFinish`, which reports it; nothing awaits this click.
							if (!event.defaultPrevented && !navIdle(bits.value)) flow[dir]().catch(() => {});
						},
					}),
					slots.default,
				);
		},
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
	} as never;
}
