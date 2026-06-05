import type {
	Get,
	NavigationPayload,
	Step,
	StepChangeContext,
	StepMatcher,
	Stepper,
	StepperData,
} from "@stepperize/core";
import {
	createStepMap,
	getInitialData,
	getInitialStepIndex,
	getStepStatuses,
	matchStep,
	parseStep as resolveStepId,
	validateStep,
} from "@stepperize/core";
import React from "react";
import { createStepperPrimitives } from "./primitives/create-stepper-primitives";
import type { DefineStepperOptions, ProviderProps, StepperDefinition, UseStepperOptions } from "./types";

function hasDataPayload(payload: NavigationPayload | undefined) {
	return payload ? "data" in payload : false;
}

type IsBroadString<T extends string> = string extends T ? true : false;

type DuplicateStepId<Steps extends readonly Step[], Seen extends string = never> = Steps extends readonly [
	infer Head,
	...infer Tail,
]
	? Head extends Step
		? IsBroadString<Head["id"]> extends true
			? Tail extends readonly Step[]
				? DuplicateStepId<Tail, Seen>
				: never
			: Head["id"] extends Seen
				? Head["id"]
				: Tail extends readonly Step[]
					? DuplicateStepId<Tail, Seen | Head["id"]>
					: never
		: never
	: never;

type UniqueStepIds<Steps extends readonly Step[]> = [DuplicateStepId<Steps>] extends [never]
	? Steps
	: `Duplicate step id: ${DuplicateStepId<Steps>}`;

function assertValidSteps(steps: readonly Step[]) {
	if (steps.length === 0) {
		throw new Error("defineStepper requires at least one step.");
	}

	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const step of steps) {
		if (seen.has(step.id)) {
			duplicates.add(step.id);
		}
		seen.add(step.id);
	}

	if (duplicates.size > 0) {
		throw new Error(`defineStepper requires unique step ids. Duplicate id(s): ${Array.from(duplicates).join(", ")}.`);
	}
}

/**
 * Define a typed stepper flow.
 *
 * Pass an ordered array of step objects. Each step needs a unique `id`; any
 * additional fields are preserved and inferred on `stepper.current`, match
 * handlers, primitives, and step access helpers. Add a `schema` to a step to
 * type its flow data and enable `validate()`.
 *
 * @example
 * ```tsx
 * const checkout = defineStepper([
 *   { id: "shipping", title: "Shipping" },
 *   { id: "payment", title: "Payment" },
 * ]);
 * ```
 */
export function defineStepper<const Steps extends readonly Step[]>(
	steps: UniqueStepIds<Steps>,
	options: DefineStepperOptions<Steps> = {},
): StepperDefinition<Steps> {
	const typedSteps = steps as Steps;
	assertValidSteps(typedSteps);
	const stepMap = createStepMap(typedSteps);
	const Context = React.createContext<Stepper<Steps> | null>(null);

	const useStepperState = (config: UseStepperOptions<Steps> = {}): Stepper<Steps> => {
		const initialStep = config.defaultStep ?? options.defaultStep;
		const initialIndex = React.useMemo(() => getInitialStepIndex(typedSteps, initialStep), [initialStep]);
		const initialData = React.useMemo(
			() => getInitialData(config.defaultData ?? options.defaultData),
			[config.defaultData],
		);

		const [uncontrolledId, setUncontrolledId] = React.useState(typedSteps[initialIndex]?.id as Get.Id<Steps>);
		const [internalData, setInternalData] = React.useState(initialData);
		const [internalCompleted, setInternalCompleted] = React.useState<Get.Id<Steps>[]>(() => [
			...(config.completed ?? options.defaultCompleted ?? []),
		]);
		const [isPending, setIsPending] = React.useState(false);

		const isControlled = config.step !== undefined;
		const isValidControlledStep = isControlled && stepMap.has(config.step as string);
		const fallbackId = (typedSteps[initialIndex]?.id ?? typedSteps[0]?.id) as Get.Id<Steps>;
		const currentId = isControlled
			? isValidControlledStep
				? (config.step as Get.Id<Steps>)
				: fallbackId
			: uncontrolledId;
		const currentIndex = Math.max(0, stepMap.indexOf(currentId));
		const current = typedSteps[currentIndex] ?? typedSteps[0];

		// A controlled `step` arriving from external state (router, URL, persisted
		// snapshot) may not be a known step id. Recover to the fallback step and
		// notify, without running the step-change guard: external changes are
		// authoritative and cannot be cancelled from render.
		React.useEffect(() => {
			if (isControlled && !isValidControlledStep) {
				config.onInvalidStep?.(config.step);
			}
		}, [isControlled, isValidControlledStep, config.step, config.onInvalidStep]);

		const data = config.data ?? internalData;
		const completed = config.completed ?? internalCompleted;
		const linear = config.linear ?? options.linear ?? false;

		const commitData = React.useCallback(
			(nextData: typeof data) => {
				if (config.data === undefined) {
					setInternalData(nextData);
				}
				config.onDataChange?.(nextData);
			},
			[config.data, config.onDataChange],
		);

		const commitCompleted = React.useCallback(
			(nextCompleted: Get.Id<Steps>[]) => {
				if (config.completed === undefined) {
					setInternalCompleted(nextCompleted);
				}
				config.onCompletedChange?.(nextCompleted);
			},
			[config.completed, config.onCompletedChange],
		);

		const createChangeContext = React.useCallback(
			(
				fromIndex: number,
				toIndex: number,
				direction: StepChangeContext<Steps>["direction"],
				nextData: typeof data,
			): StepChangeContext<Steps> => {
				const from = typedSteps[fromIndex] ?? typedSteps[0];
				const validate = ((target?: Get.Id<Steps> | Steps[number]) => {
					const id = (typeof target === "object" && target !== null ? target.id : target ?? from.id) as Get.Id<Steps>;
					return validateStep(typedSteps, id, nextData[id]);
				}) as StepChangeContext<Steps>["validate"];

				return {
					from,
					to: typedSteps[toIndex] ?? typedSteps[0],
					fromIndex,
					toIndex,
					direction,
					data: nextData,
					validate,
					statuses: getStepStatuses(typedSteps, fromIndex),
				} as StepChangeContext<Steps>;
			},
			[],
		);

		const buildNextData = React.useCallback(
			(payload?: NavigationPayload) => {
				if (!hasDataPayload(payload)) return data;
				return {
					...data,
					[current.id as Get.Id<Steps>]: payload?.data,
				};
			},
			[current.id, data],
		);

		// Policy gate for `canGoTo` and trigger primitives only. Imperative
		// navigation (`next`/`prev`/`goTo`/`reset`) is intentionally not gated by
		// this, so branching flows can jump anywhere via `goTo`.
		const canGoTo = React.useCallback(
			(id: Get.Id<Steps>) => {
				const targetIndex = stepMap.indexOf(id);
				if (targetIndex === -1) return false;
				if (isPending) return false;
				if (!linear) return true;
				return targetIndex <= currentIndex + 1;
			},
			[currentIndex, isPending, linear],
		);

		const goToIndex = React.useCallback(
			async (
				toIndex: number,
				direction: StepChangeContext<Steps>["direction"],
				payload?: NavigationPayload,
			): Promise<boolean> => {
				if (toIndex < 0 || toIndex >= typedSteps.length) return false;
				if (isPending) return false;
				if (toIndex === currentIndex && !hasDataPayload(payload)) return false;

				const to = typedSteps[toIndex];
				if (!to) return false;

				const nextData = buildNextData(payload);
				const beforeContext = createChangeContext(currentIndex, toIndex, direction, nextData);

				setIsPending(true);
				try {
					if (config.beforeStepChange) {
						const result = await config.beforeStepChange(beforeContext);
						if (result === false) return false;
					}

					if (nextData !== data) {
						commitData(nextData);
					}

					const afterContext: StepChangeContext<Steps> = {
						...beforeContext,
						statuses: getStepStatuses(typedSteps, toIndex),
					};

					if (config.step === undefined) {
						setUncontrolledId(to.id as Get.Id<Steps>);
					}
					config.onStepChange?.(to.id as Get.Id<Steps>, afterContext);

					return true;
				} finally {
					setIsPending(false);
				}
			},
			[buildNextData, commitData, config, createChangeContext, currentIndex, isPending, data],
		);

		const match = React.useMemo(
			() =>
				(<Result>(handlers: Get.Match<Steps, Result>) =>
					matchStep(typedSteps, current.id as Get.Id<Steps>, handlers)) as StepMatcher<Steps>,
			[current.id],
		);

		const dataApi = React.useMemo(
			() =>
				({
					get: ((id?: Get.Id<Steps>) => data[(id ?? current.id) as Get.Id<Steps>]) as StepperData<Steps>["get"],
					set: ((...args: [unknown] | [Get.Id<Steps>, unknown]) => {
						const nextData = { ...data };
						if (args.length === 1) {
							nextData[current.id as Get.Id<Steps>] = args[0];
						} else {
							nextData[args[0]] = args[1];
						}
						commitData(nextData);
					}) as StepperData<Steps>["set"],
					all: () => data,
					clear: (id?: Get.Id<Steps>) => {
						if (id === undefined) {
							commitData({});
							return;
						}
						if (!(id in data)) return;
						const nextData = { ...data };
						delete nextData[id];
						commitData(nextData);
					},
					reset: () => commitData(initialData),
				}) satisfies StepperData<Steps>,
			[commitData, current.id, initialData, data],
		);

		const validate = React.useCallback(
			((id?: Get.Id<Steps>) => {
				const target = (id ?? current.id) as Get.Id<Steps>;
				return validateStep(typedSteps, target, data[target]);
			}) as Stepper<Steps>["validate"],
			[current.id, data],
		);

		const count = typedSteps.length;
		const isFirst = currentIndex === 0;
		const isLast = currentIndex === count - 1;
		const canPrev = !isFirst && !isPending;
		const canNext = !isLast && !isPending;
		const progress = count <= 1 ? 1 : currentIndex / (count - 1);

		return React.useMemo(
			() => ({
				steps: typedSteps,
				current,
				id: current.id as Get.Id<Steps>,
				index: currentIndex,
				count,
				completed,
				progress,
				isFirst,
				isLast,
				canPrev,
				canNext,
				isPending,
				data: dataApi,
				status: (id) => getStepStatuses(typedSteps, currentIndex)[id],
				setComplete: (id = current.id as Get.Id<Steps>, value = true) => {
					const isAlready = completed.includes(id);
					if (value && !isAlready) {
						commitCompleted([...completed, id]);
					} else if (!value && isAlready) {
						commitCompleted(completed.filter((stepId) => stepId !== id));
					}
				},
				isComplete: (id = current.id as Get.Id<Steps>) => completed.includes(id),
				validate,
				canGoTo,
				is: (id) => current.id === id,
				match,
				next: (payload) => goToIndex(currentIndex + 1, "next", payload),
				prev: (payload) => goToIndex(currentIndex - 1, "prev", payload),
				goTo: (id, payload) => goToIndex(stepMap.indexOf(id), "goto", payload),
				reset: (payload) => goToIndex(initialIndex, "reset", payload),
			}),
			[
				canGoTo,
				canNext,
				canPrev,
				commitCompleted,
				completed,
				count,
				current,
				currentIndex,
				dataApi,
				goToIndex,
				initialIndex,
				isFirst,
				isLast,
				isPending,
				progress,
				match,
				validate,
			],
		) as Stepper<Steps>;
	};

	const Provider = ({ children, ...props }: ProviderProps<Steps>) =>
		React.createElement(Context.Provider, { value: useStepperState(props) }, children);

	const Stepper = createStepperPrimitives(Context, Provider);

	return {
		steps: typedSteps,
		useStepper: (config = {}) => {
			const fromContext = React.useContext(Context);
			const localStepper = useStepperState(config);
			return fromContext ?? localStepper;
		},
		Provider,
		Stepper,
		get: stepMap.get,
		at: stepMap.at,
		parseStep: (value: unknown) => resolveStepId(typedSteps, value),
		validate: (id, value) => validateStep(typedSteps, id, value),
	};
}
