import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import {
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
	updateStepIndex,
} from "@stepperize/core";
import * as React from "react";
import { createStepperPrimitives } from "./primitives/create-stepper-primitives";
import type { StepStatus } from "./primitives/types";
import type { StepperReturn, TransitionContext, TransitionMethods } from "./types";

function getStatuses<Steps extends Step[]>(
	steps: Steps,
	currentIndex: number,
): Record<Get.Id<Steps>, StepStatus> {
	return steps.reduce(
		(acc, step, i) => {
			acc[step.id as Get.Id<Steps>] =
				i < currentIndex ? "success" : i === currentIndex ? "active" : "inactive";
			return acc;
		},
		{} as Record<Get.Id<Steps>, StepStatus>,
	);
}

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<(Stepper<Steps> & TransitionMethods<Steps>) | null>(null);

	const utils = generateStepperUtils(...steps);

	const useStepper = (config?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => {
		const { initialStep, initialMetadata } = config ?? {};
		const initialStepIndex = React.useMemo(() => getInitialStepIndex(steps, initialStep), [initialStep]);

		const [stepIndex, setStepIndex] = React.useState(initialStepIndex);
		const [metadata, setMetadata] = React.useState(() => getInitialMetadata(steps, initialMetadata));

		const onBeforeRef = React.useRef<(ctx: TransitionContext<Steps>) => void | Promise<void | false>>(
			undefined,
		);
		const onAfterRef = React.useRef<(ctx: TransitionContext<Steps>) => void | Promise<void>>(undefined);

		const performTransition = React.useCallback(
			async (fromIndex: number, toIndex: number, direction: "next" | "prev" | "goTo") => {
				const from = steps[fromIndex];
				const to = steps[toIndex];
				const ctx: TransitionContext<Steps> = {
					from,
					to,
					metadata,
					statuses: getStatuses(steps, fromIndex),
					direction,
					fromIndex,
					toIndex,
				};
				const proceed = await onBeforeRef.current?.(ctx);
				if (proceed === false) return;
				setStepIndex(toIndex);
				const ctxAfter: TransitionContext<Steps> = {
					...ctx,
					statuses: getStatuses(steps, toIndex),
				};
				await onAfterRef.current?.(ctxAfter);
			},
			[metadata],
		);

		const stepper = React.useMemo(() => {
			const current = steps[stepIndex];
			const isLast = stepIndex === steps.length - 1;
			const isFirst = stepIndex === 0;

			return {
				all: steps,
				current,
				isLast,
				isFirst,
				metadata,
				setMetadata(id, data) {
					setMetadata((prev) => {
						if (prev[id] === data) return prev;
						return { ...prev, [id]: data };
					});
				},
				getMetadata(id) {
					return metadata[id];
				},
				resetMetadata(keepInitialMetadata) {
					setMetadata(getInitialMetadata(steps, keepInitialMetadata ? initialMetadata : undefined));
				},
				next() {
					const toIndex = stepIndex + 1;
					if (onBeforeRef.current != null || onAfterRef.current != null) {
						if (toIndex >= steps.length) return;
						return performTransition(stepIndex, toIndex, "next");
					}
					updateStepIndex(steps, toIndex, setStepIndex);
				},
				prev() {
					const toIndex = stepIndex - 1;
					if (onBeforeRef.current != null || onAfterRef.current != null) {
						if (toIndex < 0) return;
						return performTransition(stepIndex, toIndex, "prev");
					}
					updateStepIndex(steps, toIndex, setStepIndex);
				},
				get(id) {
					return steps.find((step) => step.id === id);
				},
				goTo(id) {
					const toIndex = steps.findIndex((s) => s.id === id);
					if (toIndex === -1) throw new Error(`Step with id "${id}" not found.`);
					if (toIndex === stepIndex) return;
					if (onBeforeRef.current != null || onAfterRef.current != null) {
						return performTransition(stepIndex, toIndex, "goTo");
					}
					setStepIndex(toIndex);
				},
				reset() {
					updateStepIndex(steps, getInitialStepIndex(steps, initialStep), (newIndex) => {
						setStepIndex(newIndex);
					});
				},
				onBeforeTransition(cb: (ctx: TransitionContext<Steps>) => void | Promise<void | false>) {
					onBeforeRef.current = cb;
				},
				onAfterTransition(cb: (ctx: TransitionContext<Steps>) => void | Promise<void>) {
					onAfterRef.current = cb;
				},
				...generateCommonStepperUseFns(steps, current, stepIndex),
			} as Stepper<Steps> & TransitionMethods<Steps>;
		}, [stepIndex, metadata, performTransition]);

		return stepper;
	};

	const Stepper = createStepperPrimitives(
		Context as React.Context<Stepper<Steps> | null>,
		utils,
	);

	return {
		steps,
		utils,
		Scoped: ({ initialStep, initialMetadata, children }) =>
			React.createElement(
				Context.Provider,
				{ value: useStepper({ initialStep, initialMetadata }) },
				children,
			),
		useStepper: (props = {}) => React.useContext(Context) ?? useStepper(props),
		Stepper,
	};
};