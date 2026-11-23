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
	navAttrs,
	navBits,
	navIdle,
	type Orientation,
	onListKeydown,
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
	h,
	type InjectionKey,
	inject,
	mergeProps,
	onMounted,
	onUnmounted,
	type PropType,
	provide,
	type Ref,
	ref,
	type ShallowRef,
	type Slots,
	shallowRef,
	Text,
	useId,
	type VNode,
	watch,
} from "vue";
import { optionProps, pickOptions, type Scope } from "./definition";
import type {
	ButtonProps,
	Component,
	ContentProps,
	ItemProps,
	ItemSlots,
	ListProps,
	ListSlots,
	PrimitiveProps,
	RootProps,
	RootSlots,
} from "./types";

/** Unstyled, accessible components bound to one flow, so `step` props are typed with its ids. */
export type Primitives<S extends readonly Step[]> = {
	Root: Component<RootProps<S>, RootSlots<S>, HTMLDivElement>;
	List: Component<ListProps, ListSlots<S>, HTMLOListElement>;
	Item: Component<ItemProps<S>, ItemSlots<S>, HTMLLIElement>;
	Trigger: Component<ButtonProps, { default?: () => unknown }, HTMLButtonElement>;
	Title: Component<PrimitiveProps, { default?: () => unknown }, HTMLSpanElement>;
	Description: Component<PrimitiveProps, { default?: () => unknown }, HTMLSpanElement>;
	Indicator: Component<PrimitiveProps, { default?: () => unknown }, HTMLSpanElement>;
	Content: Component<ContentProps<S>, { default?: () => unknown }, HTMLDivElement>;
	Prev: Component<ButtonProps, { default?: () => unknown }, HTMLButtonElement>;
	Next: Component<ButtonProps, { default?: () => unknown }, HTMLButtonElement>;
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

const useUi = () => inject(UiKey, null) ?? fail("SZ100", "Missing Stepper.Root. Render the primitives inside it.");

function useItem<S extends readonly Step[]>(): ComputedRef<ItemValue<S>> {
	const item = inject(ItemKey, null);
	return (item ?? fail("SZ101", "Missing Stepper.Item. Render this primitive inside a Stepper.Item.")) as never;
}

type Props = Record<string, unknown>;

/** The first real node of a slot: comments and whitespace are not it. */
function only(nodes: VNode[] | undefined): VNode | undefined {
	for (const node of nodes ?? []) {
		if (node.type === Comment || (node.type === Text && !String(node.children).trim())) continue;
		if (node.type === Fragment) {
			const inner = only(node.children as VNode[]);
			if (inner) return inner;
		} else return node;
	}
}

/** Render the default tag, or hand every prop to the element the caller put in the slot. */
function element(name: string, tag: string, asChild: boolean, props: Props, slots: Slots, fallback?: unknown) {
	if (!asChild) return h(tag, props, slots.default?.() ?? (fallback as string | undefined));
	const child = only(slots.default?.());
	if (child && child.type !== Text) return cloneVNode(child, props, true);
	if (process.env.NODE_ENV !== "production") {
		warn(
			"SZ001",
			`Stepper.${name} received \`as-child\` without an element in its default slot, so ARIA attributes and handlers are missing.`,
		);
	}
	return child;
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
			const index = () => shared.view.value.index;
			// Read before Vue touches the DOM: was focus in this stepper?
			let inside = false;
			watch(
				index,
				() => {
					inside = focusInside(root.value);
				},
				{ flush: "sync" },
			);
			watch(index, () => stepChanged(root.value, region.value, shared.flow.current, ui.value, inside), {
				flush: "post",
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
			return () => {
				const orientation = props.orientation ?? ui.value.orientation;
				const item = slots.item;
				const content = item
					? {
							default: () =>
								scope.steps.map((step, index) => h(IndexScope, { key: step.id, index }, () => item({ step, index }))),
						}
					: slots;
				return element(
					"List",
					"ol",
					props.asChild,
					// Listeners run in order: the caller's `@keydown` first, so it can `preventDefault()`.
					mergeProps(listAttrs(ui.value, orientation), attrs, {
						onKeydown: (event: KeyboardEvent) =>
							onListKeydown(event, event.currentTarget as HTMLElement, flow, ui.value, orientation),
					}),
					content as Slots,
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
			return () =>
				element("Item", "li", props.asChild, mergeProps(itemAttrs(item.value, !!tablist?.value), attrs), {
					default: () => slots.default?.(item.value),
				} as Slots);
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
					slots,
				);
			};
		},
	});
}

/** `Title` and `Description`: a `span` showing the same-named field of the step, unless you fill the slot. */
function createText(field: "title" | "description") {
	const name = field === "title" ? "Title" : "Description";
	return defineComponent({
		name: `Stepper${name}`,
		inheritAttrs: false,
		props: { asChild },
		setup(props, { attrs, slots }) {
			const item = inject(ItemKey, null);
			return () =>
				element(
					name,
					"span",
					props.asChild,
					mergeProps({ "data-component": `stepper-${field}` }, attrs),
					slots,
					(item?.value.step as Record<string, unknown> | undefined)?.[field],
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
		return () => element("Indicator", "span", props.asChild, mergeProps(indicatorAttrs(item.value), attrs), slots);
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
			return () => {
				if (!active.value && !props.forceMount) return null;
				const step =
					scope.steps[scope.positions.get(props.step) ?? -1] ?? fail("SZ102", `Step "${props.step}" not found.`);
				return element(
					"Content",
					"div",
					props.asChild,
					mergeProps(contentAttrs(ui.value, step, active.value), attrs),
					slots,
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
					slots,
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
