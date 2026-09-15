import type { Step } from "@stepperize/core";
import React from "react";
import type { StepperStore } from "./store";
import type { UseStepperOptions } from "./types";

export const identity = <T>(value: T): T => value;
export const useCommitEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
export type StoreView<Steps extends readonly Step[]> = Pick<
	StepperStore<Steps>,
	"subscribe" | "getSnapshot" | "getServerSnapshot"
>;

/** One cached view per owner render, shared by all of its consumers. */
export function useStoreView<Steps extends readonly Step[]>(
	store: StepperStore<Steps>,
	options: UseStepperOptions<Steps>,
): StoreView<Steps> {
	const { step, data, completed, linear } = options;
	return React.useMemo(() => {
		const view = { step, data, completed, linear };
		const reader = (read: typeof store.getSnapshot) => {
			let source: ReturnType<typeof read> | undefined;
			let projected: ReturnType<typeof read>;
			return () => {
				const next = read();
				if (next !== source) {
					projected = store.project(next, view, projected);
					source = next;
				}
				return projected;
			};
		};
		return {
			subscribe: store.subscribe,
			getSnapshot: reader(store.getSnapshot),
			getServerSnapshot: reader(store.getServerSnapshot),
		};
	}, [store, step, data, completed, linear]);
}

/** Cache each selection against its immutable snapshot, including object/array results. */
export function useStoreSelector<Steps extends readonly Step[], Selected>(
	store: StoreView<Steps>,
	selector: (value: ReturnType<typeof store.getSnapshot>) => Selected,
	isEqual: (previous: Selected, next: Selected) => boolean = Object.is,
): Selected {
	const [getSnapshot, getServerSnapshot] = React.useMemo(() => {
		if (selector === identity && isEqual === Object.is)
			return [store.getSnapshot as () => Selected, store.getServerSnapshot as () => Selected];
		let initialized = false;
		let previous: ReturnType<typeof store.getSnapshot>;
		let selected: Selected;
		const select = (snapshot: typeof previous) => {
			if (initialized && previous === snapshot) return selected;
			const next = selector(snapshot);
			previous = snapshot;
			if (!initialized || !isEqual(selected, next)) selected = next;
			initialized = true;
			return selected;
		};
		return [() => select(store.getSnapshot()), () => select(store.getServerSnapshot())];
	}, [store, selector, isEqual]);
	return React.useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot);
}
