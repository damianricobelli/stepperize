// =============================================================================
// HEADLESS STEPPER PRIMITIVES
// =============================================================================
//
// These primitives provide unstyled, accessible building blocks for creating
// custom stepper UIs. They expose data attributes for styling with CSS and
// support render props for complete control over the rendered elements.
//
// @example Basic usage
// ```tsx
// import { Stepper } from "@stepperize/react/primitives";
//
// const { useStepper } = defineStepper(
//   { id: "shipping", title: "Shipping" },
//   { id: "payment", title: "Payment" },
//   { id: "review", title: "Review" }
// );
//
// function MyStepper() {
//   const stepper = useStepper();
//
//   return (
//     <Stepper.Root stepper={stepper}>
//       <Stepper.List>
//         {stepper.steps.map((stepInfo) => (
//           <Stepper.Item key={step.id} step={step.id}>
//             <Stepper.Trigger>
//               <Stepper.Indicator />
//               <Stepper.Title>{step.title}</Stepper.Title>
//             </Stepper.Trigger>
//             <Stepper.Separator />
//           </Stepper.Item>
//         ))}
//       </Stepper.List>
//
//       {stepper.switch({
//         shipping: () => <Stepper.Content>Shipping form...</Stepper.Content>,
//         payment: () => <Stepper.Content>Payment form...</Stepper.Content>,
//         review: () => <Stepper.Content>Review order...</Stepper.Content>,
//       })}
//
//       <Stepper.Actions>
//         <Stepper.Prev>Previous</Stepper.Prev>
//         <Stepper.Next>Next</Stepper.Next>
//       </Stepper.Actions>
//     </Stepper.Root>
//   );
// }
// ```
//
// @example Styling with data attributes
// ```css
// [data-status="active"] { background: blue; }
// [data-status="success"] { background: green; }
// [data-status="inactive"] { opacity: 0.5; }
// [data-status="error"] { background: red; }
// [data-status="loading"] { animation: pulse 1s infinite; }
// [data-disabled="true"] { pointer-events: none; }
// [data-orientation="vertical"] { flex-direction: column; }
// ```

// Re-export types
export type {
	// Primitive props
	ActionsProps,
	CommonDataAttributes,
	ContentProps,
	DescriptionProps,
	IndicatorProps,
	ItemProps,
	ListProps,
	NextProps,
	Orientation,
	PrevProps,
	PrimitiveConfig,
	PrimitiveContextValue,
	PrimitiveProps,
	RenderProp,
	RenderProps,
	RootProps,
	SeparatorProps,
	StepDataAttributes,
	StepItemContextValue,
	TitleProps,
	TriggerProps,
} from "./types";

// Export context hooks (for advanced usage)
export {
	useMaybeStepItemContext,
	usePrimitiveContext,
	useStepItemContext,
} from "./context";

// Export primitive components
export { Actions } from "./actions";
export { Content } from "./content";
export { Description } from "./description";
export { Indicator } from "./indicator";
export { Item } from "./item";
export { List } from "./list";
export { Next } from "./next";
export { Prev } from "./prev";
export { Root } from "./root";
export { Separator } from "./separator";
export { Title } from "./title";
export { Trigger } from "./trigger";

// =============================================================================
// STEPPER NAMESPACE EXPORT
// =============================================================================
//
// For convenient dot-notation usage: <Stepper.Root>, <Stepper.List>, etc.

import { Actions } from "./actions";
import { Content } from "./content";
import { Description } from "./description";
import { Indicator } from "./indicator";
import { Item } from "./item";
import { List } from "./list";
import { Next } from "./next";
import { Prev } from "./prev";
import { Root } from "./root";
import { Separator } from "./separator";
import { Title } from "./title";
import { Trigger } from "./trigger";

/**
 * Stepper namespace containing all primitive components.
 * Use with dot notation for cleaner JSX.
 *
 * @example
 * ```tsx
 * import { Stepper } from "@stepperize/react/primitives";
 *
 * <Stepper.Root stepper={stepper}>
 *   <Stepper.List>...</Stepper.List>
 * </Stepper.Root>
 * ```
 */
export const Stepper = {
	Root,
	List,
	Item,
	Trigger,
	Indicator,
	Separator,
	Title,
	Description,
	Content,
	Actions,
	Prev,
	Next,
} as const;
