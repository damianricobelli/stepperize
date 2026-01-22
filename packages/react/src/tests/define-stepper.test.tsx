import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defineStepper } from "../define-stepper";

const steps = [
  { id: "first", label: "Step 1" },
  { id: "second", label: "Step 2" },
  { id: "third", label: "Step 3" },
];

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
