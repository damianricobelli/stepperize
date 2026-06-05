import type { FlowData, Get, OutputOf, StandardSchemaV1, Step, StepMap, StepStatus, ValidationResult } from "./types";

/**
 * Create pure step access helpers without state, safe for Node, SSR,
 * validation code, tests, and framework adapters.
 */
export function createStepMap<const Steps extends readonly Step[]>(steps: Steps): StepMap<Steps> {
	const indexOf = (id: Get.Id<Steps>) => steps.findIndex((step) => step.id === id);

	const at = <Index extends number>(index: Index) => steps[index];

	return {
		steps,
		ids: steps.map((step) => step.id) as Get.Id<Steps>[],
		get(id) {
			return steps.find((step) => step.id === id) as Get.StepById<Steps, typeof id> | undefined;
		},
		at,
		indexOf,
		has(id) {
			return steps.some((step) => step.id === id);
		},
		first() {
			return at(0);
		},
		last() {
			return at(steps.length - 1);
		},
		next(id) {
			const index = indexOf(id);
			return index >= 0 ? at(index + 1) : undefined;
		},
		prev(id) {
			const index = indexOf(id);
			return index > 0 ? at(index - 1) : undefined;
		},
		neighbors(id) {
			const index = indexOf(id);
			return {
				prev: index > 0 ? at(index - 1) : undefined,
				next: index >= 0 && index < steps.length - 1 ? at(index + 1) : undefined,
			};
		},
	};
}

/**
 * Resolve the initial step index.
 *
 * Returns `0` when no initial id is provided or when the id is not found.
 */
export function getInitialStepIndex<Steps extends readonly Step[]>(steps: Steps, initial?: Get.Id<Steps>) {
	const index = steps.findIndex((step) => step.id === initial);
	return index === -1 ? 0 : index;
}

/**
 * Narrow an arbitrary value to a known step id.
 *
 * Useful at the boundary between Stepperize and external state such as URL
 * params, router state, or persisted flow snapshots.
 */
export function parseStep<const Steps extends readonly Step[]>(
	steps: Steps,
	value: unknown,
): Get.Id<Steps> | undefined {
	return steps.some((step) => step.id === value) ? (value as Get.Id<Steps>) : undefined;
}

export function getInitialData<Steps extends readonly Step[]>(data?: FlowData<Steps>) {
	return { ...(data ?? {}) } as FlowData<Steps>;
}

/**
 * Validate a value against a step's `schema` (any Standard Schema). Steps without
 * a schema always succeed with the value unchanged, so non-form steps stay
 * first-class. Always resolves to a {@link ValidationResult}.
 */
export async function validateStep<const Steps extends readonly Step[], Id extends Get.Id<Steps>>(
	steps: Steps,
	id: Id,
	value: unknown,
): Promise<ValidationResult<OutputOf<Steps, Id>>> {
	const step = steps.find((candidate) => candidate.id === id);
	if (!step) {
		throw new Error(`Step "${id}" not found.`);
	}

	const schema = (step as { schema?: StandardSchemaV1 }).schema;
	if (!schema) {
		return { success: true, data: value as OutputOf<Steps, Id> };
	}

	const result = await schema["~standard"].validate(value);
	if (result.issues) {
		return { success: false, issues: result.issues };
	}
	return { success: true, data: result.value as OutputOf<Steps, Id> };
}

/**
 * Get the positional status for one step id.
 *
 * This is based only on `currentIndex`; explicit completion is tracked by the
 * React stepper instance.
 */
export function getStepStatus<Steps extends readonly Step[]>(
	steps: Steps,
	currentIndex: number,
	id: Get.Id<Steps>,
): StepStatus {
	const index = steps.findIndex((step) => step.id === id);
	if (index === currentIndex) return "active";
	if (index >= 0 && index < currentIndex) return "previous";
	return "upcoming";
}

export function getStepStatuses<Steps extends readonly Step[]>(
	steps: Steps,
	currentIndex: number,
): Record<Get.Id<Steps>, StepStatus> {
	return steps.reduce(
		(acc, step) => {
			acc[step.id as Get.Id<Steps>] = getStepStatus(steps, currentIndex, step.id as Get.Id<Steps>);
			return acc;
		},
		{} as Record<Get.Id<Steps>, StepStatus>,
	);
}

export function matchStep<const Steps extends readonly Step[], Result>(
	steps: Steps,
	id: Get.Id<Steps>,
	handlers: Get.Match<Steps, Result>,
): Result;

export function matchStep<const Steps extends readonly Step[], Result>(
	steps: Steps,
	id: Get.Id<Steps>,
	handlers: Get.Match<Steps, Result>,
): Result {
	const step = steps.find((candidate) => candidate.id === id);
	if (!step) {
		throw new Error(`Step "${id}" not found.`);
	}

	const handler = handlers[id as keyof typeof handlers];

	if (!handler) {
		throw new Error(`No match handler found for step "${id}".`);
	}

	return handler(step as never);
}
