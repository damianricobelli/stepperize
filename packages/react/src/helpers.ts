import type { Step } from "./types";

export const defineSteps = <const T extends Step[]>(...steps: T) => steps;

export const getStepById = <
	Steps extends readonly Step[],
	T extends Steps[number]["id"],
>(
	steps: Steps,
	id: T,
): Extract<Steps[number], { id: T }> => {
	return steps.find((step) => step.id === id)! as Extract<
		Steps[number],
		{ id: T }
	>;
};
