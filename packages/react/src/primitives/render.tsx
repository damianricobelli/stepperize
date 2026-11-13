import React from "react";
import { warn } from "../dev";
import type { PrimitiveComponent, RenderProp } from "./types";

type AnyRef = React.Ref<any> | undefined;

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
export function renderPrimitive<E extends keyof React.JSX.IntrinsicElements>(
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
): PrimitiveComponent<Props> {
	const Component = React.forwardRef(render as never) as React.NamedExoticComponent;
	if (process.env.NODE_ENV !== "production") Component.displayName = `Stepper.${name}`;
	return Component as unknown as PrimitiveComponent<Props>;
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
