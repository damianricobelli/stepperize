import type { Get, Step, Stepper, StepStatus } from "@stepperize/core";
import type * as React from "react";
import type { UseStepperOptions } from "../types";

export type { ControlledStep } from "../types";
export type { StepStatus };

export type RenderProp<E extends React.ElementType = "div"> = (
	props: React.ComponentPropsWithoutRef<E>,
) => React.ReactNode;

export type PrimitiveComponent<Props> = (props: Props) => React.ReactNode;

export type PrimitiveProps<E extends React.ElementType = "div"> = Omit<
	React.ComponentPropsWithoutRef<E>,
	"children"
> & {
	/**
	 * Spread the received props onto your element so ARIA, data attributes, and
	 * event handlers keep working.
	 */
	render?: RenderProp<E>;
	children?: React.ReactNode;
};

/**
 * `Stepper.Root` accepts every `useStepper` option plus `div` props. The state
 * options are derived from `UseStepperOptions` so the two can never drift.
 */
export type RootProps<Steps extends readonly Step[]> = Omit<React.ComponentPropsWithoutRef<"div">, "children"> &
	UseStepperOptions<Steps> & {
		orientation?: "horizontal" | "vertical";
		/** Content or render function receiving the current stepper. */
		children: React.ReactNode | ((props: { stepper: Stepper<Steps> }) => React.ReactNode);
	};

export type ListProps = PrimitiveProps<"ol"> & {
	orientation?: "horizontal" | "vertical";
};

export type ItemsProps<Steps extends readonly Step[]> = {
	children: (step: Steps[number], index: number) => React.ReactNode;
};

/**
 * Props for `Stepper.Item`.
 *
 * `step` is optional inside `Stepper.Items`; otherwise pass a step id explicitly.
 */
export type ItemProps<Steps extends readonly Step[]> = PrimitiveProps<"li"> & {
	step?: Get.Id<Steps>;
};

export type TriggerProps = PrimitiveProps<"button">;

export type TitleProps = PrimitiveProps<"h4">;

export type DescriptionProps = PrimitiveProps<"p">;

export type IndicatorProps = PrimitiveProps<"span">;

export type SeparatorProps = PrimitiveProps<"hr"> & {
	orientation?: "horizontal" | "vertical";
	"data-status"?: StepStatus;
};

export type ContentProps<Steps extends readonly Step[]> = PrimitiveProps<"div"> & {
	step: Get.Id<Steps>;
	/**
	 * Keep the panel mounted when its step is not active. It is rendered with
	 * `hidden` and `data-state="inactive"`, so form state inside survives
	 * navigating away and back.
	 */
	forceMount?: boolean;
};

export type ActionsProps = PrimitiveProps<"div">;

export type PrevProps = PrimitiveProps<"button">;

export type NextProps = PrimitiveProps<"button">;
