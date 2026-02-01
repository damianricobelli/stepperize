import type { Get, Metadata, Step, Stepper, StepStatus } from "@stepperize/core";
import * as React from "react";

export type StepInfo<S extends Step = Step> = {
	data: S;
	status: StepStatus;
};

/** Render function receiving DOM props. */
export type RenderProp<E extends React.ElementType = "div"> = (
	props: React.ComponentPropsWithoutRef<E>,
) => React.ReactNode;

export type PrimitiveProps<E extends React.ElementType = "div"> = Omit<
	React.ComponentPropsWithoutRef<E>,
	"children"
> & {
	/**
	 * Custom render function for complete control over the rendered element.
	 * Receives all props including data attributes, event handlers, and ARIA attributes.
	 */
	render?: RenderProp<E>;
	/**
	 * Children can be a ReactNode or a function receiving step info.
	 */
	children?: React.ReactNode;
};

export type RootProps<Steps extends Step[]> = Omit<
	React.ComponentPropsWithoutRef<"div">,
	"children"
> & {
	orientation?: "horizontal" | "vertical";
	/** Initial step (passed to Scoped internally). */
	initialStep?: Get.Id<Steps>;
	/** Initial metadata (passed to Scoped internally). */
	initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	children: React.ReactNode | ((props: { stepper: Stepper<Steps> }) => React.ReactNode);
};

export type ListProps = PrimitiveProps<"ol"> & {
	orientation?: "horizontal" | "vertical";
};

export type ItemProps<Steps extends Step[]> = PrimitiveProps<"li"> & {
	step: Get.Id<Steps>;
};

export type TriggerProps = PrimitiveProps<"button">;

export type TitleProps = PrimitiveProps<"h4">;
export type DescriptionProps = PrimitiveProps<"p">;
export type IndicatorProps = PrimitiveProps<"span">;

export type SeparatorProps = PrimitiveProps<"hr"> & {
	orientation?: "horizontal" | "vertical";
	"data-status"?: StepStatus;
};

export type ContentProps<Steps extends Step[]> = PrimitiveProps<"div"> & {
	step: Get.Id<Steps>;
};

export type ActionsProps = PrimitiveProps<"div">;
export type PrevProps = PrimitiveProps<"button">;
export type NextProps = PrimitiveProps<"button">;
