import { fail, type Step, warn } from "@stepperize/core";
import type { ItemValue, Ui } from "@stepperize/core/primitives";
import { DEV } from "esm-env";
import { getContext, setContext, tick } from "svelte";
import { createAttachmentKey } from "svelte/attachments";

const UI = Symbol("stepperize.ui");
const ITEM = Symbol("stepperize.item");
const INDEX = Symbol("stepperize.index");
const TABLIST = Symbol("stepperize.tablist");

/** Set by `Stepper.Root`, read by every primitive below it. */
export type RootContext = {
	/** Live: its fields follow the Root. */
	ui: Ui;
	/** Tabs need triggers: each one tells its Root while it is mounted. */
	register: () => () => void;
};

export const setRoot = (context: RootContext) => setContext(UI, context);
export const useRoot = () =>
	(getContext(UI) as RootContext | undefined) ??
	fail("SZ100", "Missing Stepper.Root. Render the primitives inside it.");

/** Live: its fields follow the enclosing Item. */
export const setItem = (item: ItemValue) => setContext(ITEM, item);
export const findItem = () => getContext(ITEM) as ItemValue | undefined;
export function useItem<S extends readonly Step[]>(): ItemValue<S> {
	return (findItem() ??
		fail("SZ101", "Missing Stepper.Item. Render this primitive inside a Stepper.Item.")) as ItemValue<S>;
}

/** The step index the `item` snippet of a List is rendering, so its Item needs no `step` prop. */
export const setIndex = (index: number) => setContext(INDEX, index);
export const useIndex = () => (getContext(INDEX) as number | undefined) ?? -1;

/**
 * A Root starts a new stepper: what an enclosing stepper set for its own items
 * must not reach the primitives of this one.
 */
export function isolate() {
	setContext(ITEM, undefined);
	setContext(INDEX, undefined);
	setContext(TABLIST, undefined);
}

/** `tabs` is true inside a tablist: its items are presentational. */
export const setTablist = (list: { readonly tabs: boolean }) => setContext(TABLIST, list);
export const inTablist = () => !!(getContext(TABLIST) as { tabs: boolean } | undefined)?.tabs;

/**
 * The element a primitive ended up on, whoever rendered it, handed to `ref`.
 * The attachment goes in the props, so it reaches the default tag and a
 * `child` snippet alike. In development, a `child` snippet that did not spread
 * its props is reported.
 */
export function useElement<E extends Element>(
	name: string,
	ref: (node: E | null) => void,
	custom: () => boolean,
	check?: (node: Element) => void,
) {
	let node: E | undefined;
	// One function for the life of the primitive: the attachment only runs again for a new element.
	const attach = {
		[createAttachmentKey()]: (element: E) => {
			node = element;
			ref(element);
			return () => {
				// When the element is replaced (the `child` snippet toggles), the new one may attach first.
				if (node !== element) return;
				node = undefined;
				ref(null);
			};
		},
	};
	if (!DEV) return attach;
	$effect(() => {
		const own = custom();
		void tick().then(() => {
			if (node) check?.(node);
			else if (own) {
				warn(
					"SZ001",
					`Stepper.${name} received a \`child\` snippet that did not spread its props onto an element, so ARIA attributes and handlers are missing.`,
				);
			}
		});
	});
	return attach;
}
