import type { Signal } from "@angular/core";
import { defineStepper, type StepperRef, type StepperRoot, type StepperSource } from "@stepperize/angular";
import { defineStepper as defineHeadless } from "@stepperize/angular/headless";
import type { Flow, Stepper } from "@stepperize/core";
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
expectTypeOf(stepper.linear).toEqualTypeOf<Signal<boolean>>();
// @ts-expect-error unknown step id
stepper().goTo("payment");

// The directives are shared by every flow: the root takes the stepper of any definition, and the
// step ids the others take are strings, checked when they run.
declare const root: StepperRoot;
expectTypeOf(root.orientation()).toEqualTypeOf<"horizontal" | "vertical">();
declare const source: StepperSource;
expectTypeOf(stepper).toExtend<typeof source>();

// The headless entry has the same flow API.
expectTypeOf(defineHeadless(steps).injectStepper).returns.toEqualTypeOf<StepperRef<typeof steps>>();
