import { defineStepper, type StandardSchemaV1 } from "../../lib/index";

export const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
] as const;
export const flow = defineStepper(steps);
export const { Stepper } = flow;
export type Api = ReturnType<typeof flow.useStepper>;

const schema = {
	"~standard": {
		version: 1 as const,
		vendor: "test",
		validate: (value: unknown) => (value === "ok" ? { value } : { issues: [{ message: "Required" }] }),
	},
};
export const checked = defineStepper([
	{ id: "a", title: "A", schema },
	{ id: "b", title: "B" },
]);
export const other = defineStepper([{ id: "x" }]);
export const outer = defineStepper(steps);

/** Typed both ways: a name goes in, its length comes out. */
const name: StandardSchemaV1<string, number> = {
	"~standard": {
		version: 1,
		vendor: "test",
		validate: (value) =>
			typeof value === "string" && value ? { value: value.length } : { issues: [{ message: "Required" }] },
	},
};
export const typed = defineStepper([
	{ id: "name", title: "Name", schema: name },
	{ id: "done", title: "Done", icon: "check" },
]);
