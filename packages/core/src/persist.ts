import type {
	Get,
	PersistConfig,
	PersistStorage,
	PersistedState,
	Step,
	StepMetadata,
	StepStatuses,
} from "./types";

// =============================================================================
// STORAGE ADAPTERS
// =============================================================================

/**
 * Check if we're in a browser environment with localStorage available.
 */
function hasLocalStorage(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const testKey = "__stepperize_test__";
		window.localStorage.setItem(testKey, testKey);
		window.localStorage.removeItem(testKey);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if we're in a browser environment with sessionStorage available.
 */
function hasSessionStorage(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const testKey = "__stepperize_test__";
		window.sessionStorage.setItem(testKey, testKey);
		window.sessionStorage.removeItem(testKey);
		return true;
	} catch {
		return false;
	}
}

/**
 * Default localStorage adapter.
 * Falls back to no-op in non-browser environments.
 */
export const localStorageAdapter: PersistStorage = {
	getItem: (key) => {
		if (!hasLocalStorage()) return null;
		return window.localStorage.getItem(key);
	},
	setItem: (key, value) => {
		if (!hasLocalStorage()) return;
		window.localStorage.setItem(key, value);
	},
	removeItem: (key) => {
		if (!hasLocalStorage()) return;
		window.localStorage.removeItem(key);
	},
};

/**
 * SessionStorage adapter.
 * Falls back to no-op in non-browser environments.
 */
export const sessionStorageAdapter: PersistStorage = {
	getItem: (key) => {
		if (!hasSessionStorage()) return null;
		return window.sessionStorage.getItem(key);
	},
	setItem: (key, value) => {
		if (!hasSessionStorage()) return;
		window.sessionStorage.setItem(key, value);
	},
	removeItem: (key) => {
		if (!hasSessionStorage()) return;
		window.sessionStorage.removeItem(key);
	},
};

/**
 * In-memory storage adapter.
 * Useful for testing or when persistent storage is not needed.
 */
export function createMemoryStorage(): PersistStorage {
	const store = new Map<string, string>();

	return {
		getItem: (key) => store.get(key) ?? null,
		setItem: (key, value) => {
			store.set(key, value);
		},
		removeItem: (key) => {
			store.delete(key);
		},
	};
}

// =============================================================================
// PERSISTENCE MANAGER
// =============================================================================

/**
 * Result of loading persisted state.
 */
export type LoadResult<Steps extends Step[]> =
	| { success: true; state: PersistedState<Steps> }
	| { success: false; reason: "not_found" | "expired" | "invalid" | "error"; error?: unknown };

/**
 * Create a persistence manager for a stepper.
 *
 * @param config - The persistence configuration.
 * @returns An object with methods to save, load, and clear persisted state.
 *
 * @example
 * ```ts
 * const persist = createPersistManager({
 *   key: "checkout-stepper",
 *   storage: localStorage,
 *   ttl: 24 * 60 * 60 * 1000, // 24 hours
 * });
 *
 * // Save state
 * await persist.save({
 *   stepId: "payment",
 *   metadata: { shipping: { address: "..." } },
 *   statuses: { shipping: "success" },
 * });
 *
 * // Load state
 * const result = await persist.load();
 * if (result.success) {
 *   // Use result.state
 * }
 *
 * // Clear state
 * await persist.clear();
 * ```
 */
export function createPersistManager<Steps extends Step[]>(
	config: PersistConfig<Steps>,
): PersistManager<Steps> {
	const {
		key,
		storage = localStorageAdapter,
		ttl,
		serialize = JSON.stringify,
		deserialize = JSON.parse,
		partialize,
	} = config;

	return {
		/**
		 * Save state to storage.
		 */
		async save(state: Omit<PersistedState<Steps>, "timestamp">): Promise<void> {
			try {
				const fullState: PersistedState<Steps> = {
					...state,
					timestamp: Date.now(),
				};

				const toSave = partialize
					? { ...fullState, ...partialize(fullState) }
					: fullState;

				const serialized = serialize(toSave as PersistedState<Steps>);
				await storage.setItem(key, serialized);
			} catch (error) {
				// Silently fail on save errors (quota exceeded, etc.)
				console.warn("[stepperize] Failed to persist state:", error);
			}
		},

		/**
		 * Load state from storage.
		 */
		async load(): Promise<LoadResult<Steps>> {
			try {
				const serialized = await storage.getItem(key);

				if (serialized === null) {
					return { success: false, reason: "not_found" };
				}

				const state = deserialize(serialized);

				// Validate basic structure
				if (!isValidPersistedState(state)) {
					return { success: false, reason: "invalid" };
				}

				// Check TTL
				if (ttl !== undefined) {
					const age = Date.now() - state.timestamp;
					if (age > ttl) {
						// Clean up expired state
						await storage.removeItem(key);
						return { success: false, reason: "expired" };
					}
				}

				return { success: true, state };
			} catch (error) {
				return { success: false, reason: "error", error };
			}
		},

		/**
		 * Clear persisted state.
		 */
		async clear(): Promise<void> {
			try {
				await storage.removeItem(key);
			} catch (error) {
				console.warn("[stepperize] Failed to clear persisted state:", error);
			}
		},

		/**
		 * Check if there is persisted state.
		 */
		async has(): Promise<boolean> {
			try {
				const serialized = await storage.getItem(key);
				return serialized !== null;
			} catch {
				return false;
			}
		},
	};
}

/**
 * Persistence manager interface.
 */
export type PersistManager<Steps extends Step[]> = {
	/** Save state to storage. */
	save: (state: Omit<PersistedState<Steps>, "timestamp">) => Promise<void>;
	/** Load state from storage. */
	load: () => Promise<LoadResult<Steps>>;
	/** Clear persisted state. */
	clear: () => Promise<void>;
	/** Check if there is persisted state. */
	has: () => Promise<boolean>;
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Type guard to validate persisted state structure.
 */
function isValidPersistedState<Steps extends Step[]>(
	value: unknown,
): value is PersistedState<Steps> {
	if (typeof value !== "object" || value === null) return false;

	const obj = value as Record<string, unknown>;

	// Required fields
	if (typeof obj.stepId !== "string") return false;
	if (typeof obj.timestamp !== "number") return false;
	if (typeof obj.metadata !== "object" || obj.metadata === null) return false;
	if (typeof obj.statuses !== "object" || obj.statuses === null) return false;

	return true;
}

// =============================================================================
// HELPERS FOR REACT INTEGRATION
// =============================================================================

/**
 * Initial state format returned by persistedStateToInitialState.
 * Matches the InitialState type from types.ts but with required fields.
 */
export type PersistedInitialState<Steps extends Step[]> = {
	step: Get.Id<Steps>;
	metadata: Partial<StepMetadata<Steps>>;
	statuses: Partial<StepStatuses<Steps>>;
};

/**
 * Convert persisted state to initial state format.
 * This is used when hydrating from storage.
 *
 * @param state - The persisted state.
 * @returns Initial state format for the stepper.
 */
export function persistedStateToInitialState<Steps extends Step[]>(
	state: PersistedState<Steps>,
): PersistedInitialState<Steps> {
	// We need to cast through unknown because TypeScript can't verify
	// the full StepMetadata<Steps> is assignable to Partial<StepMetadata<Steps>>
	// at compile time (even though it always is at runtime).
	return {
		step: state.stepId,
		metadata: state.metadata as unknown as Partial<StepMetadata<Steps>>,
		statuses: state.statuses as unknown as Partial<StepStatuses<Steps>>,
	};
}

/**
 * Create persisted state from current stepper state.
 *
 * @param stepId - Current step ID.
 * @param metadata - Current metadata.
 * @param statuses - Current statuses.
 * @returns Persisted state object (without timestamp - added on save).
 */
export function createPersistedState<Steps extends Step[]>(
	stepId: Get.Id<Steps>,
	metadata: StepMetadata<Steps>,
	statuses: StepStatuses<Steps>,
): Omit<PersistedState<Steps>, "timestamp"> {
	return {
		stepId,
		metadata,
		statuses,
	};
}
