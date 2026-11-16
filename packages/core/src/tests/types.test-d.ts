import { expectTypeOf } from "vitest";
import { createStepper } from "../stepper";
import type { Result, StandardSchemaV1 } from "../types";

declare const account: StandardSchemaV1<{ email: string }, { email: string; type: "personal" | "team" }>;
const steps = [
	{ id: "account", title: "Account", schema: account },
	{ id: "team", title: "Team" },
] as const;

const flow = createStepper(steps, {
	next: {
		account: (data) => {
			// Branches receive the schema's output.
			expectTypeOf(data).toEqualTypeOf<{ email: string; type: "personal" | "team" }>();
			return data.type === "team" ? "team" : "account";
		},
		team: (data) => {
			expectTypeOf(data).toEqualTypeOf<unknown>();
			return "account";
		},
	},
	guard: ({ from, to }) => {
		expectTypeOf(from.id).toEqualTypeOf<"account" | "team">();
		expectTypeOf(to).toEqualTypeOf<(typeof steps)[number] | null>();
	},
});

expectTypeOf(flow.current.id).toEqualTypeOf<"account" | "team">();
// Stored data is the schema's input; steps without a schema are unknown.
expectTypeOf(flow.data.account).toEqualTypeOf<{ email: string } | undefined>();
expectTypeOf(flow.data.team).toEqualTypeOf<unknown>();
expectTypeOf(flow.next()).resolves.toEqualTypeOf<Result<typeof steps>>();
flow.setData("account", { email: "ada@example.com" });
// @ts-expect-error the data must match the step's schema input
flow.setData("account", { email: 1 });
// @ts-expect-error unknown step id
flow.goTo("payment");
// @ts-expect-error a branch must return a known id
createStepper(steps, { next: { account: () => "nope" } });
// @ts-expect-error match is exhaustive
flow.match({ account: () => 1 });
expectTypeOf(
	flow.match({
		account: (step, data) => {
			expectTypeOf(step.title).toEqualTypeOf<"Account">();
			expectTypeOf(data).toEqualTypeOf<{ email: string } | undefined>();
			return 1;
		},
		team: () => 2,
	}),
).toEqualTypeOf<number>();
