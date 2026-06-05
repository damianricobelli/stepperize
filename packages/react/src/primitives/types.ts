import type { BeforeStepChange, FlowData, Get, Step, StepChangeContext, Stepper, StepStatus } from "@stepperize/core";
import type * as React from "react";

export type { StepStatus };

export type ControlledStep<Steps extends readonly Step[]> = Get.Id<Steps> | (string & {}) | null;

export type RenderProp<E extends React.ElementType = "div"> = (
	props: React.ComponentPropsWithoutRef<E>,
) => React.ReactNode;

export type PrimitiveComponent<Props> = (props: Props) => React.ReactNode;

export type PrimitiveProps<E extends React.ElementType = "div"> = Omit<React.ComponentPropsWithoutRef<E>, "children"> & {
	/**
	 * Spread the received props onto your element so ARIA, data attributes, and
	 * event handlers keep working.
	 */
	render?: RenderProp<E>;
	children?: React.ReactNode;
};

export type RootProps<Steps extends readonly Step[]> = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
	orientation?: "horizontal" | "vertical";
	defaultStep?: Get.Id<Steps>;
	/** Controlled current step id. Accepts raw external string values. */
	step?: ControlledStep<Steps>;
	onStepChange?: (step: Get.Id<Steps>, context: StepChangeContext<Steps>) => void;
	/** Called when a controlled `step` is not a known step id. */
	onInvalidStep?: (raw: unknown) => void;
	defaultData?: FlowData<Steps>;
	data?: FlowData<Steps>;
	onDataChange?: (data: FlowData<Steps>) => void;
	completed?: Get.Id<Steps>[];
	onCompletedChange?: (completed: Get.Id<Steps>[]) => void;
	linear?: boolean;
	/** Step-change guard for this root instance. Return `false` to cancel. */
	beforeStepChange?: BeforeStepChange<Steps>;
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
};

export type ActionsProps = PrimitiveProps<"div">;

export type PrevProps = PrimitiveProps<"button">;

export type NextProps = PrimitiveProps<"button">;
