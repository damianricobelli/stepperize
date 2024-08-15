import type { Step } from "./stepper";

/**
 * Helper function to create steps with const assertion
 */
export function createSteps<T extends readonly Step[]>(steps: T): T {
	return steps;
}
