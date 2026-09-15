import { expectTypeOf } from "vitest";
import { defineStepper, type NavigationResult, type StandardSchemaV1 } from "../index";
import type * as PrimitiveExports from "../primitives";

type Draft = { quantity: string };
type Parsed = { quantity: number };
const schema: StandardSchemaV1<Draft, Parsed> = {
	"~standard": {
		version: 1,
		vendor: "contract-fixture",
		validate: (value) => ({ value: { quantity: Number((value as Draft).quantity) } }),
	},
};
const flow = defineStepper([
	{ id: "cart", title: "Cart", schema },
	{ id: "review", title: "Review" },
]);
type Api = ReturnType<typeof flow.useStepper>;
declare const api: Api;

expectTypeOf(api.data.get("cart")).toEqualTypeOf<Draft | undefined>();
expectTypeOf(api.data.get("review")).toEqualTypeOf<unknown>();
api.data.set("cart", { quantity: "2" });
// @ts-expect-error Schema input is a string quantity, not its parsed output.
api.data.set("cart", { quantity: 2 });
// @ts-expect-error Step identifiers are inferred from the definition.
api.data.set("missing", {});
api.data.update("cart", (previous) => {
	expectTypeOf(previous).toEqualTypeOf<Draft | undefined>();
	return { quantity: String(Number(previous?.quantity ?? 0) + 1) };
});
// @ts-expect-error Updaters must return the schema input.
api.data.update("cart", () => ({ quantity: 2 }));

const matched = api.match({
	cart: (step, data) => {
		expectTypeOf(step.id).toEqualTypeOf<"cart">();
		expectTypeOf(data).toEqualTypeOf<Draft | undefined>();
		return data?.quantity ?? "";
	},
	review: (step, data) => {
		expectTypeOf(step.id).toEqualTypeOf<"review">();
		expectTypeOf(data).toEqualTypeOf<unknown>();
		return "review";
	},
});
expectTypeOf(matched).toEqualTypeOf<string>();
// @ts-expect-error Match must cover every step.
api.match({ cart: () => "cart" });

async function navigationContract() {
	const result = await api.next({ data: { quantity: "2" }, complete: true });
	expectTypeOf(result).toEqualTypeOf<NavigationResult<"cart" | "review">>();
	if (result.accepted) {
		expectTypeOf(result.from).toEqualTypeOf<"cart" | "review">();
		expectTypeOf(result.to).toEqualTypeOf<"cart" | "review">();
		// @ts-expect-error Success has no rejection reason.
		result.reason;
	} else {
		expectTypeOf(result.reason).toEqualTypeOf<
			"guard" | "policy" | "pending" | "boundary" | "same-step" | "invalid-step" | "cancelled"
		>();
		// @ts-expect-error A rejection does not claim a destination.
		result.to;
	}
	const validated = await api.validate("cart");
	if (validated.success) expectTypeOf(validated.data).toEqualTypeOf<Parsed>();
}
void navigationContract;
api.goTo("review", { bypassPolicy: true, complete: true });
api.reset({ keepData: true, keepCompleted: true });
// @ts-expect-error Policy bypass is specifically a goTo option.
api.next({ bypassPolicy: true });
// @ts-expect-error Removed reset payload is not silently accepted.
api.reset({ data: {} });

function useContextContract() {
	expectTypeOf(flow.useStepperContext()).toEqualTypeOf<Api>();
	const selected = flow.useStepperContext(
		(s) => ({ id: s.id }),
		(left, right) => {
			expectTypeOf(left.id).toEqualTypeOf<"cart" | "review">();
			expectTypeOf(right).toEqualTypeOf<typeof left>();
			return left.id === right.id;
		},
	);
	expectTypeOf(selected).toEqualTypeOf<{ id: "cart" | "review" }>();
}
void useContextContract;
// @ts-expect-error The primitive factory is an implementation detail in v8.
export type Factory = typeof PrimitiveExports.createStepperPrimitives;

// The lightweight entry preserves inference without claiming to expose primitives.
import { defineStepper as defineHeadless, type StepperDefinition as HeadlessDefinition } from "../headless";

const headless = defineHeadless(flow.steps);
expectTypeOf(headless).toEqualTypeOf<HeadlessDefinition<typeof headless.steps>>();
expectTypeOf(headless.validate("cart", {})).toEqualTypeOf<ReturnType<typeof flow.validate<"cart">>>();
expectTypeOf<ReturnType<typeof headless.useStepper>>().toEqualTypeOf<Api>();
// @ts-expect-error The headless entry has no generated UI primitives.
headless.Stepper;
// @ts-expect-error The headless entry keeps duplicate-id validation.
defineHeadless([{ id: "same" }, { id: "same" }]);
