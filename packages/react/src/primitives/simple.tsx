import type React from "react";
import { useContext } from "react";
import type { StepItemValue } from "./context";
import { renderPrimitive } from "./render";
import type { PrimitiveComponent, PrimitiveProps } from "./types";

type Extra = (item: StepItemValue | null, children: React.ReactNode) => Record<string, unknown>;

/** Factory for leaf primitives: a tag, a `data-component`, and optional item-derived props. */
export function createSimple<E extends keyof React.JSX.IntrinsicElements>(
	name: string,
	Tag: E,
	extra: Extra | undefined,
	requireItem: boolean,
	ItemContext: React.Context<StepItemValue | null>,
): PrimitiveComponent<PrimitiveProps<E>> {
	return function Simple(props: PrimitiveProps<E>) {
		const { render, children, ...rest } = props as PrimitiveProps<"div">;
		const item = useContext(ItemContext);
		if (requireItem && !item) throw new Error("Missing Stepper.Item.");
		const domProps = { "data-component": `stepper-${name}`, ...extra?.(item, children), ...rest } as Record<
			string,
			unknown
		>;
		if (render) return (render as (p: unknown) => React.ReactNode)(domProps);
		const content = "children" in domProps ? (domProps.children as React.ReactNode) : children;
		delete domProps.children;
		return renderPrimitive(Tag, domProps as React.ComponentPropsWithoutRef<E>, undefined, content);
	};
}

/** Text primitives fall back to the same-named field on the step. */
export const fromStep =
	(field: string): Extra =>
	(item, children) => ({
		children: children ?? (item?.data as Record<string, unknown> | undefined)?.[field],
	});

/** `hr` with orientation/status passthrough as data attributes. */
export function createSeparator(OrientationContext: React.Context<"horizontal" | "vertical">) {
	return function Separator(props: PrimitiveProps<"hr"> & { orientation?: string; "data-status"?: string }) {
		const inheritedOrientation = useContext(OrientationContext);
		const { orientation = inheritedOrientation, render, children: _c, ...rest } = props;
		const domProps = {
			"data-component": "stepper-separator",
			"data-orientation": orientation,
			"aria-hidden": true,
			tabIndex: -1,
			...rest,
		};
		return renderPrimitive("hr", domProps, render);
	};
}

export const withStatus: Extra = (item) => ({
	"data-status": item?.status,
	"data-complete": item?.complete ? "" : undefined,
	"aria-hidden": true,
});
