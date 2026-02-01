import type { Get, Metadata, Step, Stepper, StepStatus } from "@stepperize/core";
import {
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
	updateStepIndex,
} from "@stepperize/core";
import * as React from "react";
import { createStepperPrimitives } from "./primitives/create-stepper-primitives";
import type { ScopedProps, StepperReturn, TransitionContext } from "./types";
import { getStatuses } from "./utils";

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const Context = React.createContext<
			Stepper<Steps> | null
		>(null);

	const useStepper = (config?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => {
		const { initialStep, initialMetadata } = config ?? {};
		const initialStepIndex = React.useMemo(() => getInitialStepIndex(steps, initialStep), [initialStep]);

		const [stepIndex, setStepIndex] = React.useState(initialStepIndex);
		const [metadata, setMetadata] = React.useState(() => getInitialMetadata(steps, initialMetadata));
		const [isTransitioning, setIsTransitioning] = React.useState(false);

		const onBeforeRef = React.useRef<(ctx: TransitionContext<Steps>) => void | Promise<void | false>>(
			undefined,
		);
		const onAfterRef = React.useRef<(ctx: TransitionContext<Steps>) => void | Promise<void>>(undefined);

		const performTransition = React.useCallback(
			async (fromIndex: number, toIndex: number, direction: "next" | "prev" | "goTo") => {
				setIsTransitioning(true);
				try {
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

			const next = () => {
				const toIndex = stepIndex + 1;
				if (onBeforeRef.current != null || onAfterRef.current != null) {
					if (toIndex >= steps.length) return;
					return performTransition(stepIndex, toIndex, "next");
				}
				updateStepIndex(steps, toIndex, setStepIndex);
			};
			const prev = () => {
				const toIndex = stepIndex - 1;
				if (onBeforeRef.current != null || onAfterRef.current != null) {
					if (toIndex < 0) return;
					return performTransition(stepIndex, toIndex, "prev");
				}
				updateStepIndex(steps, toIndex, setStepIndex);
			};
			const goTo = (id: Get.Id<Steps>) => {
				const toIndex = steps.findIndex((s) => s.id === id);
				if (toIndex === -1) throw new Error(`Step with id "${id}" not found.`);
				if (toIndex === stepIndex) return;
				if (onBeforeRef.current != null || onAfterRef.current != null) {
					return performTransition(stepIndex, toIndex, "goTo");
				}
				setStepIndex(toIndex);
			};
			const reset = () => {
				updateStepIndex(steps, getInitialStepIndex(steps, initialStep), setStepIndex);
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
								setMetadata(
									getInitialMetadata(steps, keepInitialMetadata ? initialMetadata : undefined),
								);
							},
						},
					},
					isLast,
					isFirst,
					isTransitioning,
				},
				navigation: { next, prev, goTo, reset },
				query: generateStepperUtils(...steps),
				flow: generateCommonStepperUseFns(steps, current, stepIndex),
				metadata: {
					get values() {
						return metadata;
					},
					set: (id, values) => {
						setMetadata((prev) => (prev[id] === values ? prev : { ...prev, [id]: values }));
					},
					get: (id) => metadata[id],
					reset: (keepInitialMetadata?: boolean) => {
						setMetadata(
							getInitialMetadata(steps, keepInitialMetadata ? initialMetadata : undefined),
						);
					},
				},
				lifecycle: {
					onBeforeTransition(cb) {
						onBeforeRef.current = cb;
					},
					onAfterTransition(cb) {
						onAfterRef.current = cb;
					},
				},
			} as Stepper<Steps>;
		}, [stepIndex, metadata, isTransitioning, performTransition]);

		return stepper;
	};

	const ScopedProvider = ({ initialStep, initialMetadata, children }: ScopedProps<Steps>) =>
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
		useStepper: (props = {}) => React.useContext(Context) ?? useStepper(props),
		Stepper,
	};
};