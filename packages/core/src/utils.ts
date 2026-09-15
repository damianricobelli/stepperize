import type { FlowData, Get, OutputOf, StandardSchemaV1, Step, StepMap, StepStatus, ValidationResult } from "./types";

// Step definitions are immutable. Cache only the index; never runtime flow state.
const indexes = new WeakMap<readonly Step[], Map<string, number>>();
function getIndex(steps: readonly Step[]) {
	let index = indexes.get(steps);
	if (!index) {
		index = new Map();
		for (let position = 0; position < steps.length; position++) {
			const id = steps[position].id;
			if (!index.has(id)) index.set(id, position);
		}
		indexes.set(steps, index);
	}
	return index;
}

/**
 * Create pure step access helpers without state, safe for Node, SSR,
 * validation code, tests, and framework adapters.
 */
export function createStepMap<const Steps extends readonly Step[]>(steps: Steps): StepMap<Steps> {
	const indexById = getIndex(steps);

	const indexOf = (id: string) => indexById.get(id) ?? -1;

	const at = <Index extends number>(index: Index) => steps[index];

	return {
		steps,
		ids: steps.map((step) => step.id) as Get.Id<Steps>[],
		get(id) {
			const index = indexOf(id);
			return (index === -1 ? undefined : steps[index]) as Get.StepById<Steps, typeof id> | undefined;
		},
		at,
		indexOf,
		has(id) {
			return indexById.has(id);
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
	const index = initial === undefined ? -1 : (getIndex(steps).get(initial) ?? -1);
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
	return typeof value === "string" && getIndex(steps).has(value) ? (value as Get.Id<Steps>) : undefined;
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
	const step = steps[getIndex(steps).get(id) ?? -1];
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
	const index = getIndex(steps).get(id) ?? -1;
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
		Object.create(null) as Record<Get.Id<Steps>, StepStatus>,
	);
}

/**
 * Run the handler for `id`. When `data` is provided, the handler receives that
 * step's flow data as a typed second argument.
 */
export function matchStep<const Steps extends readonly Step[], Result>(
	steps: Steps,
	id: Get.Id<Steps>,
	handlers: Get.Match<Steps, Result>,
	data?: FlowData<Steps>,
): Result {
	const step = steps[getIndex(steps).get(id) ?? -1];
	if (!step) {
		throw new Error(`Step "${id}" not found.`);
	}

	const handler = handlers[id as keyof typeof handlers];

	if (!handler) {
		throw new Error(`No match handler found for step "${id}".`);
	}

	return handler(step as never, data?.[id] as never);
}
