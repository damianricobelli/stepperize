import type { Step, Stepper } from "@stepperize/core";
import React from "react";
import type { StepperStore } from "./store";
import { type StoreView, useStoreSelector } from "./utils";

/** A context belongs to one definition, including when different flows are nested. */
export function createStepperContext<Steps extends readonly Step[]>() {
	const Context = React.createContext<{
		store: StepperStore<Steps>;
		id: string;
		view: StoreView<Steps>;
	} | null>(null);
	function useValue() {
		const value = React.useContext(Context);
		if (!value) throw new Error("Missing Stepper.Provider for this definition. Use its Provider or Stepper.Root.");
		return value;
	}

	return {
		Context,
		useValue,
		useSelector: <Selected>(
			selector: (stepper: Stepper<Steps>) => Selected,
			isEqual?: (a: Selected, b: Selected) => boolean,
		) => {
			const value = useValue();
			return useStoreSelector(value.view, selector, isEqual);
		},
	};
}

export type StepperContext<Steps extends readonly Step[]> = ReturnType<typeof createStepperContext<Steps>>;
