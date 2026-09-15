import { createStepMap, parseStep, type Step, type Stepper, validateStep } from "@stepperize/core";
import React from "react";
import { createStepperContext } from "./context";
import { createStepperStore } from "./store";
import type { DefineStepperOptions, HeadlessStepperDefinition, ProviderProps, UseStepperOptions } from "./types";
import { identity, useCommitEffect, useStoreView } from "./utils";

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

export type UniqueStepIds<Steps extends readonly Step[]> = [DuplicateStepId<Steps>] extends [never]
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

/** Define an immutable, typed step list. Instances are created by useStepper, Provider or Stepper.Root. */
export function createDefinition<const Steps extends readonly Step[]>(
	steps: UniqueStepIds<Steps>,
	options: DefineStepperOptions<Steps> = {},
) {
	const typedSteps = steps as Steps;
	assertValidSteps(typedSteps);
	const map = createStepMap(typedSteps);
	const scope = createStepperContext<Steps>();

	function useOwnedStore(config: UseStepperOptions<Steps>, onSnapshot?: (snapshot: Stepper<Steps>) => void) {
		const [store] = React.useState(() => createStepperStore(typedSteps, options, config, map));
		// Only install committed options/lifetime here: no notifications or React state updates.
		// This runs before descendant layout effects, including StrictMode's layout replay.
		React.useInsertionEffect(() => {
			store.activate();
			if (onSnapshot) store.subscribe(() => onSnapshot(store.getSnapshot()));
			return () => store.dispose();
		}, [store, onSnapshot]);
		React.useInsertionEffect(() => store.stageOptions(config), [store, config]);
		useCommitEffect(() => store.configure(config), [store, config]);
		return store;
	}

	function useStepper(config: UseStepperOptions<Steps> = {}) {
		// A local instance has one reader. Queue immutable snapshots through React state.
		const [updatedSnapshot, setSnapshot] = React.useState<Stepper<Steps>>();
		const store = useOwnedStore(config, setSnapshot);
		const snapshot = updatedSnapshot ?? store.getServerSnapshot();
		const { step, data, completed, linear } = config;
		return React.useMemo(
			() => store.project(snapshot, { step, data, completed, linear }),
			[store, snapshot, step, data, completed, linear],
		);
	}

	function Provider({ children, ...config }: ProviderProps<Steps>) {
		const store = useOwnedStore(config);
		const id = React.useId();
		const view = useStoreView(store, config);
		const value = React.useMemo(() => ({ store, id, view }), [store, id, view]);
		return React.createElement(scope.Context.Provider, { value, children });
	}

	const useStepperContext = (<Selected = Stepper<Steps>>(
		selector: (value: Stepper<Steps>) => Selected = identity as (value: Stepper<Steps>) => Selected,
		isEqual?: (previous: Selected, next: Selected) => boolean,
	) => scope.useSelector(selector, isEqual)) as HeadlessStepperDefinition<Steps>["useStepperContext"];

	const definition: HeadlessStepperDefinition<Steps> = {
		steps: typedSteps,
		useStepper,
		useStepperContext,
		Provider,
		get: map.get,
		at: map.at,
		parseStep: (value) => parseStep(typedSteps, value),
		validate: (id, value) => validateStep(typedSteps, id, value),
	};
	return { definition, map, scope };
}
