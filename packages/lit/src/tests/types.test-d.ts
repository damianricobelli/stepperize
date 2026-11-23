import type { Flow, StepOf, Stepper } from "@stepperize/core";
import type { LitElement } from "lit";
import { expectTypeOf } from "vitest";
import { defineStepper as defineHeadless, type StepperController } from "../headless";
import { defineStepper, type PartResult, type StepItem, type StepperPrimitives } from "../index";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
type Steps = typeof steps;
const flow = defineStepper(steps, { next: { cart: () => "review" } });
declare const host: LitElement;

expectTypeOf(flow.create()).toEqualTypeOf<Flow<Steps>>();

const stepper = flow.controller(host, () => ({ linear: true }));
expectTypeOf(stepper).toEqualTypeOf<StepperPrimitives<Steps>>();
expectTypeOf(stepper.value).toEqualTypeOf<Stepper<Steps>>();
expectTypeOf(stepper.flow).toEqualTypeOf<Flow<Steps>>();
expectTypeOf(stepper.at("cart")).toEqualTypeOf<StepItem<Steps, "cart">>();
// `at` narrows the step to the id asked for.
expectTypeOf(stepper.at("cart").step).toEqualTypeOf<StepOf<Steps, "cart">>();
expectTypeOf(stepper.at("cart").step.title).toEqualTypeOf<"Cart">();
expectTypeOf(stepper.content("cart")).toEqualTypeOf<PartResult>();
expectTypeOf(stepper.list({ orientation: "vertical" })).toEqualTypeOf<PartResult>();
expectTypeOf(stepper.destroy).toEqualTypeOf<() => void>();

// A controller can follow a flow instead of owning one: given, or read before every render.
flow.controller(host, flow.create());
declare const consumed: Flow<Steps> | undefined;
flow.controller(host, () => consumed);
// A flow of another definition is not one to follow.
// @ts-expect-error other steps
flow.controller(host, defineStepper([{ id: "other" }]).create());

// Step ids are typed with the steps of the definition, in every directive.
// @ts-expect-error unknown step id
stepper.content("payment");
// @ts-expect-error unknown step id
stepper.item("payment");
// @ts-expect-error unknown step id
stepper.trigger("payment");
// @ts-expect-error unknown step id
stepper.at("payment");
// @ts-expect-error not an orientation
stepper.list({ orientation: "diagonal" });

// What the directives and the controller use internally is not part of the API.
// @ts-expect-error private
stepper._attach;
// @ts-expect-error private
stepper.host;
// @ts-expect-error private
stepper.options;
// @ts-expect-error private
stepper.defaults;

// The headless entry has the same flow API and a controller without directives.
const headless = defineHeadless(steps).controller(host);
expectTypeOf(headless).toEqualTypeOf<StepperController<Steps>>();
expectTypeOf(headless.value).toEqualTypeOf<Stepper<Steps>>();
// @ts-expect-error no primitives in the headless entry
headless.root;
