import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@stepperize/core";
import { defineStepper, isStepperReady } from "../define-stepper";

const steps = [
  { id: "first", label: "Step 1" },
  { id: "second", label: "Step 2" },
  { id: "third", label: "Step 3" },
] as const;

describe("defineStepper", () => {
  const stepperDef = defineStepper(steps);

  it("initializes in the first step by default", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    expect(result.current.current.data.id).toBe("first");
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
  });

  it("allows initializing in a custom step", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initial: { step: "second" } })
    );

    expect(result.current.current.data.id).toBe("second");
  });

  it("advances with next()", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    act(() => result.current.next());

    expect(result.current.current.data.id).toBe("second");
    expect(result.current.isFirst).toBe(false);
  });

  it("goes back with prev()", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initial: { step: "third" } })
    );

    act(() => result.current.prev());

    expect(result.current.current.data.id).toBe("second");
  });

  it("goes to a specific step with goTo()", () => {
    const { result } = renderHook(() => stepperDef.useStepper());

    act(() => result.current.goTo("third"));

    expect(result.current.current.data.id).toBe("third");
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
      stepperDef.useStepper({ initial: { step: "second" } })
    );

    act(() => {
      result.current.next();
      result.current.reset();
    });

    expect(result.current.current.data.id).toBe("second");
  });

  it("handles metadata with set/get/reset", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initial: { metadata: { first: { foo: "bar" } } } })
    );

    expect(result.current.step("first").metadata).toEqual({ foo: "bar" });

    act(() => result.current.step("first").setMetadata({ foo: "baz" }));

    expect(result.current.step("first").metadata).toEqual({ foo: "baz" });

    act(() => result.current.resetMetadata(true));

    expect(result.current.step("first").metadata).toEqual({ foo: "bar" });
  });

  it("executes callback in beforeNext and navigates if true", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn().mockReturnValue(true);

    expect(result.current.current.data.id).toBe("first");

    await act(async () => {
      await result.current.beforeNext(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.data.id).toBe("second");
  });

  it("executes callback in beforeNext and does not navigate if false", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn().mockReturnValue(false);

    expect(result.current.current.data.id).toBe("first");

    await act(async () => {
      await result.current.beforeNext(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.data.id).toBe("first"); // Did not navigate
  });

  it("executes callback in afterNext after navigating", async () => {
    const { result } = renderHook(() => stepperDef.useStepper());
    const cb = vi.fn();

    expect(result.current.current.data.id).toBe("first");

    await act(async () => {
      await result.current.afterNext(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.data.id).toBe("second");
  });

  it("executes callback in beforePrev and navigates if true", async () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initial: { step: "second" } })
    );
    const cb = vi.fn().mockReturnValue(true);

    expect(result.current.current.data.id).toBe("second");

    await act(async () => {
      await result.current.beforePrev(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.data.id).toBe("first");
  });

  it("executes callback in afterPrev after navigating", async () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initial: { step: "second" } })
    );
    const cb = vi.fn();

    expect(result.current.current.data.id).toBe("second");

    await act(async () => {
      await result.current.afterPrev(cb);
    });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result.current.current.data.id).toBe("first");
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

    expect(result.current.current.data.id).toBe("third");
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
    const step = result.current.step("second").data;

    expect(step).toEqual({ id: "second", label: "Step 2" });
  });

  it("resetMetadata with keepInitialMetadata=false clears metadata", () => {
    const { result } = renderHook(() =>
      stepperDef.useStepper({ initial: { metadata: { first: { foo: "bar" } } } })
    );

    act(() => result.current.resetMetadata(false));

    expect(result.current.step("first").metadata).toBeNull();
  });

  it("Scoped provides context to the children", () => {
    const { result } = renderHook(() => stepperDef.useStepper(), {
      wrapper: ({ children }) => (
        <stepperDef.Scoped initial={{ step: "third" }}>{children}</stepperDef.Scoped>
      ),
    });

    expect(result.current.current.data.id).toBe("third");
  });
});

// =============================================================================
// ASYNC INITIALIZATION TESTS
// =============================================================================

describe("defineStepper - async initialization", () => {
  it("starts with pending status when initial is async function", () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => ({ step: "second" }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    expect(result.current.initStatus).toBe("pending");
    expect(result.current.error).toBeNull();
  });

  it("resolves async initial step", async () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { step: "second" };
      },
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    // Initially pending
    expect(result.current.initStatus).toBe("pending");

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Step should be updated
    expect(result.current.current.data.id).toBe("second");
  });

  it("async initial overrides sync hook props", async () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => ({
        metadata: { second: { asyncValue: "async" } },
      }),
    });

    const { result } = renderHook(() =>
      asyncStepperDef.useStepper({ initial: { metadata: { first: { syncValue: "sync" } } } })
    );

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Both sync and async metadata should be present
    expect(result.current.step("first").metadata).toEqual({ syncValue: "sync" });
    expect(result.current.step("second").metadata).toEqual({ asyncValue: "async" });
  });

  it("async metadata takes precedence over sync metadata in same step", async () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => ({
        metadata: { first: { value: "async" } },
      }),
    });

    const { result } = renderHook(() =>
      asyncStepperDef.useStepper({ initial: { metadata: { first: { value: "sync" } } } })
    );

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Async value should override sync value
    expect(result.current.step("first").metadata).toEqual({ value: "async" });
  });

  it("handles async initialization errors", async () => {
    const testError = new Error("Test error");
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => {
        throw testError;
      },
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("error");
    });

    expect(result.current.error?.error).toBe(testError);
  });

  it("retry re-runs async initialization", async () => {
    let callCount = 0;
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => {
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
      expect(result.current.initStatus).toBe("error");
    });

    expect(callCount).toBe(1);

    // Retry
    act(() => {
      result.current.retry();
    });

    // Should succeed on retry
    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    expect(callCount).toBe(2);
    expect(result.current.current.data.id).toBe("third");
  });

  it("async statuses override sync initial statuses in same step", async () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => ({
        statuses: { second: "success" },
      }),
    });

    const { result } = renderHook(() =>
      asyncStepperDef.useStepper({ initial: { statuses: { first: "success" } } })
    );

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Both sync and async statuses should be present
    // Status is resolved: explicit statuses take priority, "incomplete" derives from position
    expect(result.current.step("first").status).toBe("success");
    expect(result.current.step("second").status).toBe("success");
    expect(result.current.step("third").status).toBe("inactive"); // idle + future = inactive
  });

  it("supports synchronous initial function", async () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: () => ({ step: "second" }), // Sync function
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    expect(result.current.current.data.id).toBe("second");
  });

  it("with sync initial object, status starts as success", () => {
    const syncStepperDef = defineStepper(steps, {
      initial: { step: "second" },
    });

    const { result } = renderHook(() => syncStepperDef.useStepper());

    expect(result.current.initStatus).toBe("success");
    expect(result.current.error).toBeNull();
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("isStepperReady", () => {
  it("returns true when initialization is successful", async () => {
    const asyncStepperDef = defineStepper(steps, {
      initial: async () => ({ step: "second" }),
    });

    const { result } = renderHook(() => asyncStepperDef.useStepper());

    // Initially not ready
    expect(isStepperReady(result.current)).toBe(false);

    await waitFor(() => {
      expect(isStepperReady(result.current)).toBe(true);
    });
  });

  it("returns true when no async initial is configured", () => {
    const syncStepperDef = defineStepper(steps);
    const { result } = renderHook(() => syncStepperDef.useStepper());

    expect(isStepperReady(result.current)).toBe(true);
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
        statuses: { first: "success", second: "incomplete", third: "incomplete" },
        timestamp: Date.now(),
      })
    );

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    // Wait for hydration
    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    expect(result.current.current.data.id).toBe("second");
    expect(result.current.step("first").metadata).toEqual({ saved: true });
    expect(result.current.step("first").status).toBe("success");
  });

  it("auto-saves state changes to storage", async () => {
    const storage = createMemoryStorage();

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    // Wait for hydration
    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
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

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Set metadata
    act(() => {
      result.current.step("first").setMetadata({ name: "John" });
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

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Set status
    act(() => {
      result.current.step("first").setStatus("success");
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

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
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
    expect(result.current.current.data.id).toBe("first");
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

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
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

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
        ttl: 5000, // 5 second TTL
      },
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Should NOT load expired state, should start at first step
    expect(result.current.current.data.id).toBe("first");
  });

  it("combines persistence with async initial (async takes precedence)", async () => {
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

    const persistStepperDef = defineStepper(steps, {
      persist: {
        key: "test-stepper",
        storage,
      },
      // async initial takes precedence
      initial: async () => ({
        step: "third",
        metadata: { first: { fromAsync: true } },
      }),
    });

    const { result } = renderHook(() => persistStepperDef.useStepper());

    await waitFor(() => {
      expect(result.current.initStatus).toBe("success");
    });

    // Async values should take precedence
    expect(result.current.current.data.id).toBe("third");
    expect(result.current.step("first").metadata).toEqual({ fromAsync: true });
    // But status from storage should still be there (not overridden by async)
    expect(result.current.step("first").status).toBe("success");
  });
});
