import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@stepperize/core";
import { defineStepper, isStepperReady, useWaitForAsyncInit } from "../define-stepper";

const steps = [
  { id: "first", label: "Step 1" },
  { id: "second", label: "Step 2" },
  { id: "third", label: "Step 3" },
] as const;

describe("defineStepper", () => {
  const stepperDef = defineStepper(...steps);

  it("initializes in the first step by default", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    expect(result.current.current.id).toBe("first");
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
  });

  it("allows initializing in a custom step", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialStep: "second" })
    );

    expect(result.current.current.id).toBe("second");
  });

  it("advances with next()", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    act(() => result.current.next());

    expect(result.current.current.id).toBe("second");
    expect(result.current.isFirst).toBe(false);
  });

  it("goes back with prev()", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialStep: "third" })
    );

    act(() => result.current.prev());

    expect(result.current.current.id).toBe("second");
  });

  it("goes to a specific step with goTo()", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    act(() => result.current.goTo("third"));

    expect(result.current.current.id).toBe("third");
    expect(result.current.isLast).toBe(true);
  });

  it("throws an error if goTo receives an inexistent id", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    expect(() => result.current.goTo("not-exist" as any)).toThrowError(
      'Step with id "not-exist" not found.'
    );
  });

  it("resets to the initial step with reset()", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialStep: "second" })
    );

    act(() => {
      result.current.next();
      result.current.reset();
    });

    expect(result.current.current.id).toBe("second");
  });

  it("handles metadata with set/get/reset", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialMetadata: { first: { foo: "bar" } } })
    );

    expect(result.current.getMetadata("first")).toEqual({ foo: "bar" });

    act(() => result.current.setMetadata("first", { foo: "baz" }));

    expect(result.current.getMetadata("first")).toEqual({ foo: "baz" });

    act(() => result.current.resetMetadata(true));

    expect(result.current.getMetadata("first")).toEqual({ foo: "bar" });
  });

  it("executes callback in beforeNext and navigates if true", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn().mockReturnValue(true);

    expect(result.current.current.id).toBe("first");

    await act(async () => {
      await result.current.beforeNext(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.id).toBe("second");
  });

  it("executes callback in beforeNext and does not navigate if false", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn().mockReturnValue(false);

    expect(result.current.current.id).toBe("first");

    await act(async () => {
      await result.current.beforeNext(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.id).toBe("first"); // Did not navigate
  });

  it("executes callback in afterNext after navigating", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn();

    expect(result.current.current.id).toBe("first");

    await act(async () => {
      await result.current.afterNext(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.id).toBe("second");
  });

  it("executes callback in beforePrev and navigates if true", async () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialStep: "second" })
    );
    const cb = vi.fn().mockReturnValue(true);

    expect(result.current.current.id).toBe("second");

    await act(async () => {
      await result.current.beforePrev(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.id).toBe("first");
  });

  it("executes callback in afterPrev after navigating", async () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialStep: "second" })
    );
    const cb = vi.fn();

    expect(result.current.current.id).toBe("second");

    await act(async () => {
      await result.current.afterPrev(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.id).toBe("first");
  });

  it("executes callbacks in beforeGoTo/afterGoTo", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn();

    await act(async () => {
      await result.current.beforeGoTo("third", cb);
    });

    expect(cb).toHaveBeenCalled();

    await act(async () => {
      await result.current.afterGoTo("third", cb);
    });

    expect(result.current.current.id).toBe("third");
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("isFirst and isLast are updated correctly", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);

    act(() => result.current.goTo("second"));
    expect(result.current.isFirst).toBe(false);
    expect(result.current.isLast).toBe(false);

    act(() => result.current.goTo("third"));
    expect(result.current.isLast).toBe(true);
  });

  it("get returns a step by id", () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const step = result.current.get("second");

    expect(step).toEqual({ id: "second", label: "Step 2" });
  });

  it("resetMetadata with keepInitialMetadata=false clears metadata", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initialMetadata: { first: { foo: "bar" } } })
    );

    act(() => result.current.resetMetadata(false));

    expect(result.current.getMetadata("first")).toBeNull();
  });

  it("Scoped provides context to the children", () => {
    const { result } = renderHook(() => stepperDef.useStepper(), {
      wrapper: ({ children }) => (
        <stepperDef.Scoped initialStep="third">{children}</stepperDef.Scoped>
      ),
    });

    expect(result.current.current.id).toBe("third");
  });
});

// =============================================================================
// ASYNC INITIALIZATION TESTS
// =============================================================================

describe("defineStepper - async initialization", () => {
  it("starts with pending status when getInitialState is configured", () => {
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => ({ step: "second" }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    expect(result.current.asyncInit.status).toBe("pending");
    expect(result.current.asyncInit.isLoading).toBe(true);
    expect(result.current.asyncInit.isSuccess).toBe(false);
    expect(result.current.asyncInit.isError).toBe(false);
  });

  it("resolves async initial step", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { step: "second" };
      },
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    // Initially pending
    expect(result.current.asyncInit.isLoading).toBe(true);

    // Wait for async init to complete
    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Step should be updated
    expect(result.current.current.id).toBe("second");
  });

  it("merges async metadata with sync initial metadata", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      initialMetadata: { first: { syncValue: "sync" } },
      getInitialState: async () => ({
        metadata: { second: { asyncValue: "async" } },
      }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Both sync and async metadata should be present
    expect(result.current.getMetadata("first")).toEqual({ syncValue: "sync" });
    expect(result.current.getMetadata("second")).toEqual({ asyncValue: "async" });
  });

  it("async metadata takes precedence over sync metadata", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      initialMetadata: { first: { value: "sync" } },
      getInitialState: async () => ({
        metadata: { first: { value: "async" } },
      }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Async value should override sync value
    expect(result.current.getMetadata("first")).toEqual({ value: "async" });
  });

  it("handles async initialization errors", async () => {
    const testError = new Error("Test error");
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => {
        throw testError;
      },
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isError).toBe(true);
    });

    expect(result.current.asyncInit.error?.error).toBe(testError);
    expect(result.current.asyncInit.isLoading).toBe(false);
    expect(result.current.asyncInit.isSuccess).toBe(false);
  });

  it("retry re-runs async initialization", async () => {
    let callCount = 0;
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("First attempt fails");
        }
        return { step: "third" };
      },
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    // First attempt should fail
    await waitFor(() => {
      expect(result.current.asyncInit.isError).toBe(true);
    });

    expect(callCount).toBe(1);

    // Retry
    act(() => {
      result.current.asyncInit.retry();
    });

    // Should succeed on retry
    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    expect(callCount).toBe(2);
    expect(result.current.current.id).toBe("third");
  });

  it("merges async statuses with sync initial statuses", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      initialStatuses: { first: "success" },
      getInitialState: async () => ({
        statuses: { second: "success" },
      }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Both sync and async statuses should be present
    expect(result.current.getStatus("first")).toBe("success");
    expect(result.current.getStatus("second")).toBe("success");
    expect(result.current.getStatus("third")).toBe("idle");
  });

  it("supports synchronous getInitialState", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: () => ({ step: "second" }), // Sync function
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    expect(result.current.current.id).toBe("second");
  });

  it("without getInitialState, asyncInit starts as success", () => {
    const syncStepperDef = defineStepper(...steps).config({
      initialStep: "second",
    });

    const { result } = renderHook(() => syncStepperDef.useStepper());

    expect(result.current.asyncInit.status).toBe("success");
    expect(result.current.asyncInit.isSuccess).toBe(true);
    expect(result.current.asyncInit.isLoading).toBe(false);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("isStepperReady", () => {
  it("returns true when async init is successful", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => ({ step: "second" }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    // Initially not ready
    expect(isStepperReady(result.current)).toBe(false);

    await waitFor(() => {
      expect(isStepperReady(result.current)).toBe(true);
    });
  });

  it("returns true when no async init is configured", () => {
    const syncStepperDef = defineStepper(...steps);
    const { result } = renderHook(() => syncStepperDef.useStepper());

    expect(isStepperReady(result.current)).toBe(true);
  });
});

describe("useWaitForAsyncInit", () => {
  it("returns [false, stepper] while loading", () => {
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { step: "second" };
      },
    });

    const { result } = renderHook(() => {
      const stepper = asyncStepperDef.useStepper();
      return useWaitForAsyncInit(stepper);
    });

    const [isReady, stepper] = result.current;
    expect(isReady).toBe(false);
    expect(stepper).toBeDefined();
  });

  it("returns [true, stepper] when ready", async () => {
    const asyncStepperDef = defineStepper(...steps).config({
      getInitialState: async () => ({ step: "second" }),
    });

    const { result } = renderHook(() => {
      const stepper = asyncStepperDef.useStepper();
      return useWaitForAsyncInit(stepper);
    });

    await waitFor(() => {
      const [isReady] = result.current;
      expect(isReady).toBe(true);
    });

    const [, stepper] = result.current;
    expect(stepper.current.id).toBe("second");
  });
});

// =============================================================================
// PERSISTENCE TESTS
// =============================================================================

describe("defineStepper - persistence", () => {
  it("loads state from storage on mount", async () => {
    const storage = createMemoryStorage();

    // Pre-populate storage with saved state
    storage.setItem(
      "test-stepper",
      JSON.stringify({
        stepId: "second",
        metadata: { first: { saved: true } },
        statuses: { first: "success", second: "idle", third: "idle" },
        timestamp: Date.now(),
      })
    );

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    // Wait for hydration
    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    expect(result.current.current.id).toBe("second");
    expect(result.current.getMetadata("first")).toEqual({ saved: true });
    expect(result.current.getStatus("first")).toBe("success");
  });

  it("auto-saves state changes to storage", async () => {
    const storage = createMemoryStorage();

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    // Wait for hydration
    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Navigate to second step
    act(() => {
      result.current.goTo("second");
    });

    // Check storage was updated
    await waitFor(() => {
      const saved = storage.getItem("test-stepper");
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved as string);
      expect(parsed.stepId).toBe("second");
    });
  });

  it("saves metadata changes to storage", async () => {
    const storage = createMemoryStorage();

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Set metadata
    act(() => {
      result.current.setMetadata("first", { name: "John" });
    });

    // Check storage was updated
    await waitFor(() => {
      const saved = storage.getItem("test-stepper");
      const parsed = JSON.parse(saved as string);
      expect(parsed.metadata.first).toEqual({ name: "John" });
    });
  });

  it("saves status changes to storage", async () => {
    const storage = createMemoryStorage();

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Set status
    act(() => {
      result.current.setStatus("first", "success");
    });

    // Check storage was updated
    await waitFor(() => {
      const saved = storage.getItem("test-stepper");
      const parsed = JSON.parse(saved as string);
      expect(parsed.statuses.first).toBe("success");
    });
  });

  it("clears storage on reset with clearPersisted option", async () => {
    const storage = createMemoryStorage();
    const clearSpy = vi.spyOn(storage, "removeItem");

    // Pre-populate storage
    storage.setItem(
      "test-stepper",
      JSON.stringify({
        stepId: "second",
        metadata: {},
        statuses: {},
        timestamp: Date.now(),
      })
    );

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Reset with clearPersisted
    act(() => {
      result.current.reset({ clearPersisted: true });
    });

    // Verify clear was called (storage might be re-populated by auto-save)
    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith("test-stepper");
    });

    // Step should be reset to first
    expect(result.current.current.id).toBe("first");
  });

  it("clearPersistedState clears storage", async () => {
    const storage = createMemoryStorage();

    storage.setItem(
      "test-stepper",
      JSON.stringify({
        stepId: "second",
        metadata: {},
        statuses: {},
        timestamp: Date.now(),
      })
    );

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Clear persisted state
    await act(async () => {
      await result.current.clearPersistedState();
    });

    expect(storage.getItem("test-stepper")).toBeNull();
  });

  it("respects TTL and discards expired state", async () => {
    const storage = createMemoryStorage();

    // Save state with old timestamp (expired)
    storage.setItem(
      "test-stepper",
      JSON.stringify({
        stepId: "third",
        metadata: {},
        statuses: {},
        timestamp: Date.now() - 10000, // 10 seconds ago
      })
    );

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
        ttl: 5000, // 5 second TTL
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Should NOT load expired state, should start at first step
    expect(result.current.current.id).toBe("first");
  });

  it("combines persistence with async getInitialState (async takes precedence)", async () => {
    const storage = createMemoryStorage();

    // Pre-populate storage
    storage.setItem(
      "test-stepper",
      JSON.stringify({
        stepId: "second",
        metadata: { first: { fromStorage: true } },
        statuses: { first: "success" },
        timestamp: Date.now(),
      })
    );

    const persistStepperDef = defineStepper(...steps).config({
      persist: {
        key: "test-stepper",
        storage,
      },
      // Async init takes precedence
      getInitialState: async () => ({
        step: "third",
        metadata: { first: { fromAsync: true } },
      }),
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.asyncInit.isSuccess).toBe(true);
    });

    // Async values should take precedence
    expect(result.current.current.id).toBe("third");
    expect(result.current.getMetadata("first")).toEqual({ fromAsync: true });
    // But status from storage should still be there (not overridden by async)
    expect(result.current.getStatus("first")).toBe("success");
  });
});
