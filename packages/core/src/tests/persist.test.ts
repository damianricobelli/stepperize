import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMemoryStorage,
	createPersistManager,
	createPersistedState,
	persistedStateToInitialState,
} from "../persist";
import type { Step, StepMetadata, StepStatuses, PersistedState } from "../types";

const steps: Step[] = [
	{ id: "first", label: "Step 1" },
	{ id: "second", label: "Step 2" },
	{ id: "third", label: "Step 3" },
];

type Steps = typeof steps;

describe("createMemoryStorage", () => {
	it("creates a storage that persists data in memory", () => {
		const storage = createMemoryStorage();

		storage.setItem("key1", "value1");
		expect(storage.getItem("key1")).toBe("value1");
	});

	it("returns null for non-existent keys", () => {
		const storage = createMemoryStorage();
		expect(storage.getItem("nonexistent")).toBeNull();
	});

	it("removes items correctly", () => {
		const storage = createMemoryStorage();

		storage.setItem("key1", "value1");
		storage.removeItem("key1");
		expect(storage.getItem("key1")).toBeNull();
	});

	it("overwrites existing items", () => {
		const storage = createMemoryStorage();

		storage.setItem("key1", "value1");
		storage.setItem("key1", "value2");
		expect(storage.getItem("key1")).toBe("value2");
	});
});

describe("createPersistManager", () => {
	let storage: ReturnType<typeof createMemoryStorage>;

	beforeEach(() => {
		storage = createMemoryStorage();
	});

	it("saves state with timestamp", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
		});

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);

		const saved = await storage.getItem("test-key");
		expect(saved).toBeTruthy();

		const parsed = JSON.parse(saved!);
		expect(parsed.stepId).toBe("first");
		expect(parsed.timestamp).toBeTypeOf("number");
		expect(parsed.metadata).toBeDefined();
		expect(parsed.statuses).toBeDefined();
	});

	it("loads saved state", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
		});

		const state = createPersistedState(
			"second" as const,
			{ first: { foo: "bar" }, second: null, third: null },
			{ first: "success", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);
		const result = await manager.load();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.state.stepId).toBe("second");
			expect(result.state.metadata.first).toEqual({ foo: "bar" });
			expect(result.state.statuses.first).toBe("success");
		}
	});

	it("returns not_found when no state exists", async () => {
		const manager = createPersistManager<Steps>({
			key: "nonexistent-key",
			storage,
		});

		const result = await manager.load();
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("not_found");
		}
	});

	it("returns expired when TTL is exceeded", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
			ttl: 100, // 100ms
		});

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);

		// Wait for TTL to expire
		await new Promise((resolve) => setTimeout(resolve, 150));

		const result = await manager.load();
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("expired");
		}
	});

	it("does not expire when TTL is not exceeded", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
			ttl: 1000, // 1 second
		});

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);

		// Wait a bit but not enough to expire
		await new Promise((resolve) => setTimeout(resolve, 50));

		const result = await manager.load();
		expect(result.success).toBe(true);
	});

	it("returns invalid for malformed state", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
		});

		// Save invalid data
		await storage.setItem("test-key", JSON.stringify({ invalid: "data" }));

		const result = await manager.load();
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("invalid");
		}
	});

	it("clears persisted state", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
		});

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);
		await manager.clear();

		const result = await manager.load();
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("not_found");
		}
	});

	it("checks if state exists", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
		});

		expect(await manager.has()).toBe(false);

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);
		expect(await manager.has()).toBe(true);

		await manager.clear();
		expect(await manager.has()).toBe(false);
	});

	it("uses custom serializer and deserializer", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
			serialize: (state) => `custom:${JSON.stringify(state)}`,
			deserialize: (value) => JSON.parse(value.replace("custom:", "")),
		});

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);
		const result = await manager.load();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.state.stepId).toBe("first");
		}
	});

	it("uses partialize to filter state", async () => {
		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage,
			partialize: (state) => ({
				stepId: state.stepId,
				timestamp: state.timestamp,
				// Only persist stepId and timestamp, not metadata/statuses
				metadata: undefined,
				statuses: undefined,
			}),
		});

		const state = createPersistedState(
			"first" as const,
			{ first: { data: "test" }, second: null, third: null },
			{ first: "success", second: "incomplete", third: "incomplete" },
		);

		await manager.save(state);

		const saved = await storage.getItem("test-key");
		const parsed = JSON.parse(saved!);

		expect(parsed.stepId).toBe("first");
		expect(parsed.timestamp).toBeDefined();
		// Metadata and statuses should not be in saved state
		expect(parsed.metadata).toBeUndefined();
		expect(parsed.statuses).toBeUndefined();
	});

	it("handles storage errors gracefully", async () => {
		const errorStorage = {
			getItem: vi.fn().mockRejectedValue(new Error("Storage error")),
			setItem: vi.fn().mockRejectedValue(new Error("Storage error")),
			removeItem: vi.fn().mockRejectedValue(new Error("Storage error")),
		};

		const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const manager = createPersistManager<Steps>({
			key: "test-key",
			storage: errorStorage as any,
		});

		const state = createPersistedState(
			"first" as const,
			{ first: null, second: null, third: null },
			{ first: "incomplete", second: "incomplete", third: "incomplete" },
		);

		// Should not throw
		await manager.save(state);
		expect(consoleWarnSpy).toHaveBeenCalled();

		const result = await manager.load();
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("error");
		}

		await manager.clear();
		expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

		consoleWarnSpy.mockRestore();
	});
});

describe("createPersistedState", () => {
	it("creates persisted state without timestamp", () => {
		const metadata: StepMetadata<Steps> = {
			first: null,
			second: null,
			third: null,
		};
		const statuses: StepStatuses<Steps> = {
			first: "incomplete",
			second: "incomplete",
			third: "incomplete",
		};

		const state = createPersistedState("second" as const, metadata, statuses);

		expect(state.stepId).toBe("second");
		expect(state.metadata).toEqual(metadata);
		expect(state.statuses).toEqual(statuses);
		expect(state).not.toHaveProperty("timestamp");
	});
});

describe("persistedStateToInitialState", () => {
	it("converts persisted state to initial state format", () => {
		const persistedState: PersistedState<Steps> = {
			stepId: "second",
			timestamp: Date.now(),
			metadata: {
				first: { foo: "bar" },
				second: null,
				third: null,
			},
			statuses: {
				first: "success",
				second: "incomplete",
				third: "incomplete",
			},
		};

		const initialState = persistedStateToInitialState(persistedState);

		expect(initialState.step).toBe("second");
		expect(initialState.metadata).toEqual(persistedState.metadata);
		expect(initialState.statuses).toEqual(persistedState.statuses);
	});
});
