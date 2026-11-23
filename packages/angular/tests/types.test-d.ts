import type { Signal } from "@angular/core";
import {
	defineStepper,
	type ItemValue,
	type StepFor,
	type StepId,
	type StepperItem,
	type StepperRef,
	type StepperRoot,
	type StepperSource,
} from "@stepperize/angular";
import { defineStepper as defineHeadless } from "@stepperize/angular/headless";
import type { Flow, Step, Stepper } from "@stepperize/core";
import { expectTypeOf } from "vitest";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
const flow = defineStepper(steps, { next: { cart: () => "review" } });

expectTypeOf(flow.create()).toEqualTypeOf<Flow<typeof steps>>();
expectTypeOf(flow.injectStepper).returns.toEqualTypeOf<StepperRef<typeof steps>>();
expectTypeOf(flow.injectStepper).toBeCallableWith(() => ({ linear: true }));
expectTypeOf(flow.injectStepperContext).returns.toEqualTypeOf<StepperRef<typeof steps>>();

declare const stepper: StepperRef<typeof steps>;
// In TypeScript, and in template expressions, everything is typed by the definition.
expectTypeOf(stepper).toExtend<Signal<Stepper<typeof steps>>>();
expectTypeOf(stepper().current.id).toEqualTypeOf<"cart" | "review">();
expectTypeOf(stepper.steps).toEqualTypeOf<typeof steps>();
expectTypeOf(stepper.flow).toEqualTypeOf<Flow<typeof steps>>();
// @ts-expect-error unknown step id
stepper().goTo("payment");

// The directives are shared by every flow: the root takes the stepper of any definition. Without a
// `StepperRegistry`, step ids are strings, checked when they run; templates.test.ts covers the registry.
declare const root: StepperRoot;
expectTypeOf<StepId>().toEqualTypeOf<string>();
expectTypeOf<StepFor<"cart">>().toEqualTypeOf<Step>();
// An item bound to a step object types that step, fields included.
declare const item: StepperItem<(typeof steps)[1]>;
expectTypeOf(item.value()).toEqualTypeOf<ItemValue<readonly (typeof steps)[1][]>>();
expectTypeOf(item.value().step.title).toEqualTypeOf<"Review">();
expectTypeOf(root.orientation()).toEqualTypeOf<"horizontal" | "vertical">();
declare const source: StepperSource;
expectTypeOf(stepper).toExtend<typeof source>();

// The headless entry has the same flow API.
expectTypeOf(defineHeadless(steps).injectStepper).returns.toEqualTypeOf<StepperRef<typeof steps>>();
