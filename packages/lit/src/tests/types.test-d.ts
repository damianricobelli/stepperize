import type { Flow, Stepper } from "@stepperize/core";
import type { LitElement } from "lit";
import { expectTypeOf } from "vitest";
import { defineStepper as defineHeadless, type StepperController } from "../headless";
import { defineStepper, type ItemValue, type PartResult, type StepperPrimitives } from "../index";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
const flow = defineStepper(steps, { next: { cart: () => "review" } });
declare const host: LitElement;

expectTypeOf(flow.create()).toEqualTypeOf<Flow<typeof steps>>();

const stepper = flow.controller(host, () => ({ linear: true }));
expectTypeOf(stepper).toEqualTypeOf<StepperPrimitives<typeof steps>>();
expectTypeOf(stepper.value).toEqualTypeOf<Stepper<typeof steps>>();
expectTypeOf(stepper.flow).toEqualTypeOf<Flow<typeof steps>>();
expectTypeOf(stepper.at("cart")).toEqualTypeOf<ItemValue<typeof steps>>();
expectTypeOf(stepper.at("cart").step.id).toEqualTypeOf<"cart" | "review">();
expectTypeOf(stepper.content("cart")).toEqualTypeOf<PartResult>();
expectTypeOf(stepper.list({ orientation: "vertical" })).toEqualTypeOf<PartResult>();
// A controller can follow a flow instead of owning one.
flow.controller(host, flow.create());

// Step ids are typed with the steps of the definition, in every directive.
// @ts-expect-error unknown step id
stepper.content("payment");
// @ts-expect-error unknown step id
stepper.item("payment");
// @ts-expect-error unknown step id
stepper.trigger("payment");
// @ts-expect-error not an orientation
stepper.list({ orientation: "diagonal" });

// The headless entry has the same flow API and a controller without directives.
const headless = defineHeadless(steps).controller(host);
expectTypeOf(headless).toEqualTypeOf<StepperController<typeof steps>>();
expectTypeOf(headless.value).toEqualTypeOf<Stepper<typeof steps>>();
// @ts-expect-error no primitives in the headless entry
headless.root;
