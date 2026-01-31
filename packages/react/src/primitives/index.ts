/**
 * Stepper primitives – unstyled, accessible building blocks for custom stepper UIs.
 * They expose data attributes for styling and support render props for full control.
 *
 * Use via `defineStepper(...).Stepper` (Root, List, Item, Trigger, etc.) inside `<Scoped>`.
 * For item-level context (status, data) inside Stepper.Item, use `useStepItemContext()` from this entry.
 *
 * @example Basic usage
 * ```tsx
 * import { defineStepper, Get } from "@stepperize/react";
 * import { useStepItemContext } from "@stepperize/react/primitives";
 *
 * const { Stepper, Scoped, useStepper } = defineStepper(
 *   { id: "shipping", title: "Shipping" },
 *   { id: "payment", title: "Payment" },
 *   { id: "review", title: "Review" }
 * );
 *
 * function MyStepper() {
 *   return (
 *     <Scoped>
 *       <Stepper.Root>
 *         {({ stepper }) => (
 *           <>
 *             <Stepper.List>
 *               {stepper.all.map((stepData, index) => {
 *                 const currentIndex = stepper.all.findIndex((s) => s.id === stepper.current.id);
 *                 const status = index < currentIndex ? "success" : index === currentIndex ? "active" : "inactive";
 *                 return (
 *                   <React.Fragment key={stepData.id}>
 *                     <Stepper.Item step={stepData.id}>
 *                       <Stepper.Trigger render={(domProps) => <button {...domProps}><Stepper.Indicator /></button>} />
 *                       <Stepper.Title render={(domProps) => <h4 {...domProps}>{stepData.title}</h4>} />
 *                     </Stepper.Item>
 *                     {index < stepper.all.length - 1 && (
 *                       <Stepper.Separator orientation="horizontal" data-status={status} />
 *                     )}
 *                   </React.Fragment>
 *                 );
 *               })}
 *             </Stepper.List>
 *             {stepper.switch({
 *               shipping: () => <Stepper.Content step="shipping" render={(props) => <div {...props}>Shipping form...</div>} />,
 *               payment: () => <Stepper.Content step="payment" render={(props) => <div {...props}>Payment form...</div>} />,
 *               review: () => <Stepper.Content step="review" render={(props) => <div {...props}>Review...</div>} />,
 *             })}
 *             <Stepper.Actions>
 *               <Stepper.Prev render={(domProps) => <button {...domProps}>Previous</button>} />
 *               <Stepper.Next render={(domProps) => <button {...domProps}>Next</button>} />
 *             </Stepper.Actions>
 *           </>
 *         )}
 *       </Stepper.Root>
 *     </Scoped>
 *   );
 * }
 * ```
 *
 * @example Styling with data attributes
 * ```css
 * [data-status="active"] { background: blue; }
 * [data-status="success"] { background: green; }
 * [data-status="inactive"] { opacity: 0.5; }
 * [data-disabled="true"] { pointer-events: none; }
 * [data-orientation="vertical"] { flex-direction: column; }
 * ```
 */

export { useStepItemContext, StepItemProvider, StepItemContext } from "./context";
export type { StepItemValue } from "./context";

export type {
	StepStatus,
	StepInfo,
	RenderProp,
	PrimitiveProps,
	RootProps,
	ListProps,
	ItemProps,
	TriggerProps,
	TitleProps,
	DescriptionProps,
	IndicatorProps,
	SeparatorProps,
	ContentProps,
	ActionsProps,
	PrevProps,
	NextProps,
} from "./types";

export { createStepperPrimitives } from "./create-stepper-primitives";
export type { StepperPrimitives } from "./create-stepper-primitives";
