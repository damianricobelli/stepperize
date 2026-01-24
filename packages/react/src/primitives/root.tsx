import type { Step } from "@stepperize/core";
import * as React from "react";
import type { StepperInstance } from "../types";
import {
	DEFAULT_CONFIG,
	PrimitiveProvider,
	Slot,
} from "./context";
import type { PrimitiveContextValue, RootProps } from "./types";

/**
 * Root primitive that provides context for all other primitives.
 *
 * @example
 * ```tsx
 * // Using with TypedRoot (automatically gets stepper from Scoped context)
 * // No need to pass stepper prop - it's obtained automatically from Scoped
 * const { Stepper } = defineStepper(...);
 *
 * <Stepper.Provider>
 *   <Stepper.Root orientation="horizontal">
 *     {({ stepper }) => (
 *       <Stepper.List>
 *         {stepper.steps.map((stepInfo) => (
 *           <Stepper.Item key={stepInfo.data.id} step={stepInfo.data.id}>
 *             <Stepper.Trigger>{stepInfo.data.title}</Stepper.Trigger>
 *           </Stepper.Item>
 *         ))}
 *       </Stepper.List>
 *     )}
 *   </Stepper.Root>
 * </Stepper.Provider>
 *
 * // Using with Root directly (requires stepper prop)
 * const { useStepper } = defineStepper(...);
 *
 * function MyStepper() {
 *   const stepper = useStepper();
 *   return (
 *     <Root stepper={stepper} orientation="horizontal">
 *       <List>...</List>
 *       <Content />
 *     </Root>
 *   );
 * }
 * ```
 */
const Root = React.forwardRef<HTMLDivElement, RootProps>(
	(
		{
			stepper: stepperProp,
			stepperContext,
			orientation = DEFAULT_CONFIG.orientation,
			tracking = DEFAULT_CONFIG.tracking,
			asChild,
			render,
			children,
			...props
		},
		ref,
	) => {
		// Get stepper from context if provided, otherwise use prop
		const stepperFromContext = stepperContext
			? React.useContext(stepperContext)
			: null;
		const stepper = stepperFromContext ?? stepperProp;

		if (!stepper) {
			throw new Error(
				"[@stepperize/react] Root: stepper prop is required, or use stepperContext prop to get stepper from Scoped context.",
			);
		}

		const contextValue = React.useMemo<PrimitiveContextValue>(
			() => ({
				stepper: stepper as StepperInstance<Step[]>,
				config: {
					orientation,
					tracking,
				},
			}),
			[stepper, orientation, tracking],
		);

		const dataAttributes = {
			"data-orientation": orientation,
			"data-stepper-root": "",
		};

		const elementProps = {
			...dataAttributes,
			...props,
			ref,
		};

		let element: React.ReactElement;

		if (render) {
			element = render(elementProps) ?? <div {...elementProps}>{children}</div>;
		} else if (asChild) {
			element = <Slot {...elementProps}>{children}</Slot>;
		} else {
			element = <div {...elementProps}>{children}</div>;
		}

		return (
			<PrimitiveProvider value={contextValue}>{element}</PrimitiveProvider>
		);
	},
);

Root.displayName = "Stepper.Root";

export { Root };
