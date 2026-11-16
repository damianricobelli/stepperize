import { fail, type Step, warn } from "@stepperize/core";
import React from "react";
import type { Component, ItemValue, Orientation, RenderProp } from "./types";

type AnyRef = React.Ref<any> | undefined;

/** Set by `Stepper.Root`, read by every primitive below it. */
export type Ui = {
	/** Prefix that keeps DOM ids unique per Root. */
	id: string;
	orientation: Orientation;
	/**
	 * Tabs (a tablist with roving focus) or a list of step buttons. A linear flow
	 * is not a set of tabs, and neither is a flow without triggers.
	 */
	tabs: boolean;
};

export const UiContext = React.createContext<Ui | null>(null);
export const ItemContext = React.createContext<ItemValue | null>(null);
/** The step index a `Stepper.List` function is rendering, so its Item needs no `step` prop. */
export const IndexContext = React.createContext(-1);

export const useUi = () =>
	React.useContext(UiContext) ?? fail("SZ100", "Missing Stepper.Root. Render the primitives inside it.");

export function useItem<S extends readonly Step[]>(): ItemValue<S> {
	const item = React.useContext(ItemContext);
	return (item ?? fail("SZ101", "Missing Stepper.Item. Render this primitive inside a Stepper.Item.")) as ItemValue<S>;
}

export const triggerId = (ui: Ui, step: string) => `${ui.id}trigger-${step}`;
export const panelId = (ui: Ui, step: string) => `${ui.id}panel-${step}`;

/** One callback ref that feeds both refs. Returns the only ref as-is when there is one. */
export function composeRefs(a: AnyRef, b: AnyRef): AnyRef {
	if (!a || !b) return a || b;
	return (value: unknown) => {
		for (const ref of [a, b]) {
			if (typeof ref === "function") ref(value);
			else (ref as { current: unknown }).current = value;
		}
	};
}

/** Render the default tag, or hand every prop (including `ref` and `children`) to the user's function. */
export function element<E extends keyof React.JSX.IntrinsicElements>(
	tag: E,
	props: Record<string, unknown>,
	render: RenderProp<E> | undefined,
): React.ReactNode {
	return render ? render(props as never) : React.createElement(tag, props);
}

/** What every element primitive needs: a forwarded ref (React 18) and a DevTools name. */
export function primitive<Props, E extends Element = Element>(
	name: string,
	render: (props: Props, ref: React.ForwardedRef<E>) => React.ReactNode,
): Component<Props> {
	const component = React.forwardRef(render as never) as React.NamedExoticComponent;
	if (process.env.NODE_ENV !== "production") component.displayName = `Stepper.${name}`;
	return component as unknown as Component<Props>;
}

type DevRef = <T extends Element>(name: string, render: unknown, ref: AnyRef, check?: (element: T) => void) => AnyRef;

/**
 * In development, compose an internal ref to verify the element really mounted
 * (a render function that forgets to spread its props loses ARIA and handlers)
 * and run extra checks on it. In production this is the identity: no hooks, no cost.
 */
export const useDevRef: DevRef =
	process.env.NODE_ENV !== "production"
		? function useDevRef<T extends Element>(name: string, render: unknown, ref: AnyRef, check?: (element: T) => void) {
				const node = React.useRef<T | null>(null);
				const composed = React.useMemo(() => composeRefs(ref, node), [ref]);
				const latest = React.useRef({ check, render });
				latest.current = { check, render };
				React.useEffect(() => {
					if (node.current) latest.current.check?.(node.current);
					else if (latest.current.render) {
						warn(
							"SZ001",
							`Stepper.${name} received a render function that did not spread its props (including \`ref\`) onto an element, so ARIA attributes and handlers are missing.`,
						);
					}
				}, []);
				return composed;
			}
		: (_name, _render, ref) => ref;
