import type { Step } from "@stepperize/core";
import type { StepperScope } from "./context";
import type { ItemsProps, PrimitiveComponent } from "./types";

/**
 * Does not subscribe to the stepper: it only depends on the static step list,
 * so a navigation never re-invokes the render prop and items can bail out.
 */
export function createItems<Steps extends readonly Step[]>(
	steps: Steps,
	scope: StepperScope<Steps>,
): PrimitiveComponent<ItemsProps<Steps>> {
	const entries = steps.map((step, index) => ({ step, index }));
	return function Items(props: ItemsProps<Steps>) {
		return entries.map((value) => (
			<scope.AutoContext.Provider key={value.step.id} value={value}>
				{props.children(value.step as Steps[number], value.index)}
			</scope.AutoContext.Provider>
		));
	};
}
