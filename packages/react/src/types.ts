import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import type { StepperPrimitives } from "./primitives/create-stepper-primitives";
import type { StepStatus } from "./primitives/types";

export type TransitionDirection = "next" | "prev" | "goTo";

export type TransitionContext<Steps extends Step[]> = {
  readonly from: Steps[number];
  readonly to: Steps[number];
  readonly metadata: Record<Get.Id<Steps>, Metadata>;
  readonly statuses: Record<Get.Id<Steps>, StepStatus>;
  readonly direction: TransitionDirection;
  readonly fromIndex: number;
  readonly toIndex: number;
};

export type ScopedProps<Steps extends Step[]> = React.PropsWithChildren<{
  /** The initial step to display. */
  initialStep?: Get.Id<Steps>;
  /** The initial metadata. */
  initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
}>;

export type StepperReturn<Steps extends Step[]> = {
  /** The steps of the stepper. */
  steps: Steps;
  /**
   * `Scoped` component is a wrapper that provides the stepper context to its children.
   * It uses the `Context` to pass the stepper instance to the children.
   *
   * @param props - The props object containing `initialStep` and `children`.
   * @param props.initialStep - The ID of the step to start with (optional).
   * @param props.initialMetadata - The initial metadata (optional).
   * @param props.children - The child elements to be wrapped by the `Scoped` component.
   * @returns A React element that wraps the children with the stepper context.
   */
  Scoped: (props: ScopedProps<Steps>) => React.ReactElement;
  /**
   * `useStepper` hook returns an object that manages the current step in the stepper.
   * You can use this hook to get the current step, navigate to the next or previous step,
   * and reset the stepper to the initial state.
   *
   * @param initialStep - The ID of the step to start with (optional).
   * @param initialMetadata - The initial metadata (optional).
   * @returns An object containing properties and methods to interact with the stepper.
   */
  useStepper: (props?: {
    initialStep?: Get.Id<Steps>;
    initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
  }) => Stepper<Steps>;
  /**
   * Type-safe primitive components (Root, List, Item, Trigger, Title, Description, Indicator, Separator, Content, Actions, Prev, Next).
   * Use within Scoped. Root children can be a function receiving `{ stepper }`.
   */
  Stepper: StepperPrimitives<Steps>;
};
