import type { Flow, Stepper } from "@stepperize/core";
import type { Component, ComponentProps } from "svelte";
import { expectTypeOf } from "vitest";
import { defineStepper as defineHeadless, fromFlow as fromHeadlessFlow } from "../lib/headless";
import { type ButtonChildProps, defineStepper, fromFlow, type ItemValue, type ListChildProps } from "../lib/index";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
const flow = defineStepper(steps, { next: { cart: () => "review" } });

expectTypeOf(flow.create()).toEqualTypeOf<Flow<typeof steps>>();
expectTypeOf(flow.useStepper).returns.toEqualTypeOf<Stepper<typeof steps>>();
expectTypeOf(flow.useStepper).toBeCallableWith(() => ({ linear: true }));
expectTypeOf(flow.useStepperContext).returns.toEqualTypeOf<Stepper<typeof steps>>();
expectTypeOf(flow.Stepper.useItem).returns.toEqualTypeOf<ItemValue<typeof steps>>();
expectTypeOf(flow.Stepper.useItem().step.id).toEqualTypeOf<"cart" | "review">();

// Components are typed with the step ids of their own definition.
expectTypeOf<ComponentProps<typeof flow.Stepper.Content>["step"]>().toEqualTypeOf<"cart" | "review">();
expectTypeOf<ComponentProps<typeof flow.Stepper.Item>["step"]>().toEqualTypeOf<"cart" | "review" | undefined>();
expectTypeOf<NonNullable<ComponentProps<typeof flow.Stepper.Root>["onFinish"]>>().parameter(0).toEqualTypeOf<{
	cart?: unknown;
	review?: unknown;
}>();
expectTypeOf(flow.Provider).toExtend<Component<{ linear?: boolean }>>();

// A flow from `create()` reads as the same reactive stepper, from either entry.
expectTypeOf(fromFlow(flow.create())).toEqualTypeOf<Stepper<typeof steps>>();
expectTypeOf(fromHeadlessFlow).toEqualTypeOf(fromFlow);

// `ref` is bindable and typed with the default element of each part.
expectTypeOf<ComponentProps<typeof flow.Stepper.Root>["ref"]>().toEqualTypeOf<HTMLDivElement | null | undefined>();
expectTypeOf<ComponentProps<typeof flow.Stepper.Next>["ref"]>().toEqualTypeOf<HTMLButtonElement | null | undefined>();
expectTypeOf<ComponentProps<typeof flow.Stepper.Title>["ref"]>().toEqualTypeOf<HTMLSpanElement | null | undefined>();
expectTypeOf(flow.Stepper.Content).toExtend<Component<any, any, "ref">>();

// `child` props carry callable handlers, typed for any element.
expectTypeOf<ButtonChildProps["onclick"]>().parameter(0).toExtend<MouseEvent>();
expectTypeOf<ListChildProps["onkeydown"]>().parameter(0).toExtend<KeyboardEvent>();

// The headless entry has the same flow API and no primitives.
const headless = defineHeadless(steps);
expectTypeOf(headless.useStepper).returns.toEqualTypeOf<Stepper<typeof steps>>();
// @ts-expect-error no primitives in the headless entry
headless.Stepper;
