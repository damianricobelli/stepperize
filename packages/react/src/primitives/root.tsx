import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import type { UseStepperOptions } from "../types";
import type { StepperScope } from "./context";
import type { PrimitiveComponent, RootProps } from "./types";

/**
 * Options forwarded from Root to the Provider. `satisfies` guarantees each
 * entry is a real option, and `_exhaustive` fails to compile if an option is
 * added to `UseStepperOptions` without being listed here.
 */
const STATE_KEYS = [
	"defaultStep",
	"defaultCompleted",
	"step",
	"onStepChange",
	"onInvalidStep",
	"defaultData",
	"data",
	"onDataChange",
	"completed",
	"onCompletedChange",
	"linear",
	"beforeStepChange",
] as const satisfies readonly (keyof UseStepperOptions<readonly Step[]>)[];
type Missing = Exclude<keyof UseStepperOptions<readonly Step[]>, (typeof STATE_KEYS)[number]>;
const _exhaustive: [Missing] extends [never] ? true : { missingKeys: Missing } = true;
void _exhaustive;

export function createRoot<Steps extends readonly Step[]>(
	Provider: (props: React.PropsWithChildren<any>) => React.ReactElement,
	scope: StepperScope<Steps>,
): PrimitiveComponent<RootProps<Steps>> {
	function Inner({
		children,
		orientation = "horizontal",
		...rest
	}: Omit<RootProps<Steps>, (typeof STATE_KEYS)[number]>) {
		// Only the render-prop form needs the live stepper.
		const stepper = scope.useSelector<Stepper<Steps> | null>((s) => (typeof children === "function" ? s : null));
		return (
			<scope.OrientationContext.Provider value={orientation}>
				{/* biome-ignore lint/a11y/useSemanticElements: fieldset would change layout semantics */}
				<div data-component="stepper" data-orientation={orientation} role="group" aria-label="Stepper" {...rest}>
					{typeof children === "function" ? children({ stepper: stepper as never }) : children}
				</div>
			</scope.OrientationContext.Provider>
		);
	}

	return function Root(props: RootProps<Steps>) {
		const state: Record<string, unknown> = {};
		const dom: Record<string, unknown> = {};
		for (const key in props) {
			((STATE_KEYS as readonly string[]).includes(key) ? state : dom)[key] = props[key as keyof RootProps<Steps>];
		}
		return (
			<Provider {...state}>
				<Inner {...(dom as Omit<RootProps<Steps>, (typeof STATE_KEYS)[number]>)} />
			</Provider>
		);
	};
}
