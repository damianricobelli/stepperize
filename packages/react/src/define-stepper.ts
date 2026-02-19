import type {
  Get,
  Metadata,
  Step,
  Stepper,
  StepStatus,
  TransitionPayload,
} from "@stepperize/core";
import {
  generateCommonStepperUseFns,
  generateStepperUtils,
  getInitialMetadata,
  getInitialStepIndex,
  updateStepIndex,
} from "@stepperize/core";
import React from "react";
import { createStepperPrimitives } from "./primitives/create-stepper-primitives";
import type { ScopedProps, StepperReturn, TransitionContext } from "./types";
import { getStatuses } from "./utils";

type BeforeCb<Steps extends Step[]> = (
  ctx: TransitionContext<Steps>,
) => false | void | Promise<void | false>;
type AfterCb<Steps extends Step[]> = (
  ctx: TransitionContext<Steps>,
) => void | Promise<void>;

function registerCallback<CB>(list: CB[], cb: CB) {
  list.push(cb);
  return () => {
    const i = list.indexOf(cb);
    if (i !== -1) list.splice(i, 1);
  };
}

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(
  ...steps: Steps
): StepperReturn<Steps> => {
  const Context = React.createContext<Stepper<Steps> | null>(null);

  const useStepper = (config?: {
    initialStep?: Get.Id<Steps>;
    initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
  }) => {
    const { initialStep, initialMetadata } = config ?? {};
    const initialStepIndex = React.useMemo(
      () => getInitialStepIndex(steps, initialStep),
      [initialStep],
    );

    const [stepIndex, setStepIndex] = React.useState(initialStepIndex);
    const [metadata, setMetadata] = React.useState(() =>
      getInitialMetadata(steps, initialMetadata),
    );
    const [isTransitioning, setIsTransitioning] = React.useState(false);

    const resetMetadata = React.useCallback(
      (keepInitialMetadata?: boolean) =>
        getInitialMetadata(
          steps,
          keepInitialMetadata ? initialMetadata : undefined,
        ),
      [initialMetadata],
    );

    const beforeCallbacksRef = React.useRef<BeforeCb<Steps>[]>([]);
    const afterCallbacksRef = React.useRef<AfterCb<Steps>[]>([]);

    const performTransition = React.useCallback(
      async (
        fromIndex: number,
        toIndex: number,
        direction: "next" | "prev" | "goTo",
        payload?: TransitionPayload<Steps>,
      ) => {
        setIsTransitioning(true);
        try {
          const from = steps[fromIndex];
          const to = steps[toIndex];
          const effectiveMetadata = {
            ...metadata,
            ...(payload?.metadata ?? {}),
          } as Record<Get.Id<Steps>, Metadata>;
          const ctx: TransitionContext<Steps> = {
            from,
            to,
            metadata: effectiveMetadata,
            statuses: getStatuses(steps, fromIndex),
            direction,
            fromIndex,
            toIndex,
          };
          for (const cb of beforeCallbacksRef.current) {
            const proceed = await cb(ctx);
            if (proceed === false) return;
          }
          if (payload?.metadata) {
            setMetadata((prev) => ({ ...prev, ...payload.metadata }));
          }
          setStepIndex(toIndex);
          const ctxAfter: TransitionContext<Steps> = {
            ...ctx,
            statuses: getStatuses(steps, toIndex),
          };
          for (const cb of afterCallbacksRef.current) {
            await cb(ctxAfter);
          }
        } finally {
          setIsTransitioning(false);
        }
      },
      [metadata],
    );

    const stepper = React.useMemo(() => {
      const current = steps[stepIndex];
      const isLast = stepIndex === steps.length - 1;
      const isFirst = stepIndex === 0;
      const status: StepStatus = "active";
      const hasLifecycle = () =>
        beforeCallbacksRef.current.length > 0 ||
        afterCallbacksRef.current.length > 0;

      const next = (payload?: TransitionPayload<Steps>) => {
        const toIndex = stepIndex + 1;
        if (toIndex >= steps.length) {
          updateStepIndex(steps, toIndex, setStepIndex);
          return;
        }
        if (hasLifecycle() || payload?.metadata) {
          return performTransition(stepIndex, toIndex, "next", payload);
        }
        updateStepIndex(steps, toIndex, setStepIndex);
      };
      const prev = (payload?: TransitionPayload<Steps>) => {
        const toIndex = stepIndex - 1;
        if (toIndex < 0) {
          updateStepIndex(steps, toIndex, setStepIndex);
          return;
        }
        if (hasLifecycle() || payload?.metadata) {
          return performTransition(stepIndex, toIndex, "prev", payload);
        }
        updateStepIndex(steps, toIndex, setStepIndex);
      };
      const goTo = (id: Get.Id<Steps>, payload?: TransitionPayload<Steps>) => {
        const toIndex = steps.findIndex((s) => s.id === id);
        if (toIndex === -1) throw new Error(`Step "${id}" not found.`);
        if (toIndex === stepIndex) return;
        if (hasLifecycle() || payload?.metadata) {
          return performTransition(stepIndex, toIndex, "goTo", payload);
        }
        setStepIndex(toIndex);
      };
      const reset = () => {
        updateStepIndex(
          steps,
          getInitialStepIndex(steps, initialStep),
          setStepIndex,
        );
      };

      return {
        state: {
          all: steps,
          current: {
            data: current,
            index: stepIndex,
            status,
            metadata: {
              get: () => metadata[current.id as Get.Id<Steps>],
              set: (values) => {
                setMetadata((prev) =>
                  prev[current.id as Get.Id<Steps>] === values
                    ? prev
                    : { ...prev, [current.id as Get.Id<Steps>]: values },
                );
              },
              reset: (keepInitialMetadata?: boolean) => {
                setMetadata(resetMetadata(keepInitialMetadata));
              },
            },
          },
          isLast,
          isFirst,
          isTransitioning,
        },
        navigation: { next, prev, goTo, reset },
        lookup: generateStepperUtils(...steps),
        flow: generateCommonStepperUseFns(steps, current, stepIndex),
        metadata: {
          get values() {
            return metadata;
          },
          set: (id, values) => {
            setMetadata((prev) =>
              prev[id] === values ? prev : { ...prev, [id]: values },
            );
          },
          get: (id) => metadata[id],
          reset: (keepInitialMetadata?: boolean) => {
            setMetadata(resetMetadata(keepInitialMetadata));
          },
        },
        lifecycle: {
          onBeforeTransition(cb: BeforeCb<Steps>) {
            return registerCallback(beforeCallbacksRef.current, cb);
          },
          onAfterTransition(cb: AfterCb<Steps>) {
            return registerCallback(afterCallbacksRef.current, cb);
          },
        },
      } as Stepper<Steps>;
    }, [
      stepIndex,
      metadata,
      isTransitioning,
      initialStep,
      performTransition,
      resetMetadata,
    ]);

    return stepper;
  };

  const ScopedProvider = ({
    initialStep,
    initialMetadata,
    children,
  }: ScopedProps<Steps>) =>
    React.createElement(
      Context.Provider,
      { value: useStepper({ initialStep, initialMetadata }) },
      children,
    );

  const Stepper = createStepperPrimitives(
    Context as React.Context<Stepper<Steps> | null>,
    ScopedProvider,
  );

  return {
    steps,
    Scoped: ScopedProvider,
    useStepper: (props = {}) => {
      const fromContext = React.useContext(Context);
      const fromHook = useStepper(props);
      return fromContext ?? fromHook;
    },
    Stepper,
  };
};
