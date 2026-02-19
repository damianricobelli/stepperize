import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defineStepper } from "../define-stepper";

const steps = [
  { id: "first", title: "First" },
  { id: "second", title: "Second" },
  { id: "third", title: "Third" },
] as const;

describe("defineStepper", () => {
  it("returns steps, Scoped, useStepper, Stepper", () => {
    const result = defineStepper(...steps);
    expect(result.steps).toEqual(steps);
    expect(result.Scoped).toBeDefined();
    expect(typeof result.useStepper).toBe("function");
    expect(result.Stepper).toBeDefined();
    expect(result.Stepper.Root).toBeDefined();
    expect(result.Stepper.List).toBeDefined();
    expect(result.Stepper.Item).toBeDefined();
    expect(result.Stepper.Trigger).toBeDefined();
    expect(result.Stepper.Content).toBeDefined();
    expect(result.Stepper.Prev).toBeDefined();
    expect(result.Stepper.Next).toBeDefined();
  });

  it("useStepper returns stepper with state, navigation, lookup, flow, metadata, lifecycle", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const stepper = result.current;
    expect(stepper.state.all).toEqual(steps);
    expect(stepper.state.current.data).toEqual(steps[0]);
    expect(stepper.state.current.index).toBe(0);
    expect(stepper.state.current.status).toBe("active");
    expect(stepper.state.isFirst).toBe(true);
    expect(stepper.state.isLast).toBe(false);
    expect(stepper.navigation.next).toBeDefined();
    expect(stepper.navigation.prev).toBeDefined();
    expect(stepper.navigation.goTo).toBeDefined();
    expect(stepper.navigation.reset).toBeDefined();
    expect(stepper.lookup.get("second")).toEqual(steps[1]);
    expect(typeof stepper.flow.is).toBe("function");
    expect(stepper.flow.is("first")).toBe(true);
    expect(stepper.flow.is("second")).toBe(false);
    expect(stepper.metadata.get("first")).toBeNull();
    expect(stepper.lifecycle.onBeforeTransition).toBeDefined();
    expect(stepper.lifecycle.onAfterTransition).toBeDefined();
  });

  it("useStepper with initialStep starts at that step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper({ initialStep: "third" }));
    expect(result.current.state.current.data.id).toBe("third");
    expect(result.current.state.current.index).toBe(2);
    expect(result.current.state.isLast).toBe(true);
  });

  it("useStepper with initialMetadata seeds metadata per step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() =>
      useStepper({
        initialMetadata: { first: { saved: true }, second: { count: 2 } },
      }),
    );
    expect(result.current.metadata.get("first")).toEqual({ saved: true });
    expect(result.current.metadata.get("second")).toEqual({ count: 2 });
    expect(result.current.metadata.get("third")).toBeNull();
  });

  it("navigation.next advances step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    expect(result.current.state.current.data.id).toBe("first");
    act(() => {
      result.current.navigation.next();
    });
    expect(result.current.state.current.data.id).toBe("second");
    act(() => {
      result.current.navigation.next();
    });
    expect(result.current.state.current.data.id).toBe("third");
  });

  it("navigation.prev goes back", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper({ initialStep: "third" }));
    act(() => {
      result.current.navigation.prev();
    });
    expect(result.current.state.current.data.id).toBe("second");
    act(() => {
      result.current.navigation.prev();
    });
    expect(result.current.state.current.data.id).toBe("first");
  });

  it("navigation.goTo jumps to step by id", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    act(() => {
      result.current.navigation.goTo("third");
    });
    expect(result.current.state.current.data.id).toBe("third");
    act(() => {
      result.current.navigation.goTo("first");
    });
    expect(result.current.state.current.data.id).toBe("first");
  });

  it("navigation.goTo throws if step id not found", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    expect(() => {
      act(() => {
        result.current.navigation.goTo("not-exist" as any);
      });
    }).toThrow(/not found/);
  });

  it("navigation boundaries throw even with lifecycle callbacks or payload metadata", () => {
    const { useStepper } = defineStepper(...steps);

    const first = renderHook(() => useStepper());
    act(() => {
      first.result.current.lifecycle.onBeforeTransition(() => {});
    });
    expect(() => {
      act(() => {
        void first.result.current.navigation.prev();
      });
    }).toThrow(/first step/);

    const last = renderHook(() => useStepper({ initialStep: "third" }));
    act(() => {
      last.result.current.lifecycle.onAfterTransition(() => {});
    });
    expect(() => {
      act(() => {
        void last.result.current.navigation.next({ metadata: { third: { x: 1 } } });
      });
    }).toThrow(/last step/);
  });

  it("navigation.reset restores initial step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper({ initialStep: "second" }));
    act(() => {
      result.current.navigation.next();
    });
    expect(result.current.state.current.data.id).toBe("third");
    act(() => {
      result.current.navigation.reset();
    });
    expect(result.current.state.current.data.id).toBe("second");
  });

  it("flow.switch returns result for current step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const out = result.current.flow.switch({
      first: (s) => s.title,
      second: (s) => s.title,
      third: (s) => s.title,
    });
    expect(out).toBe("First");
    act(() => result.current.navigation.next());
    const out2 = result.current.flow.switch({
      first: (s) => s.title,
      second: (s) => s.title,
      third: (s) => s.title,
    });
    expect(out2).toBe("Second");
  });

  it("metadata.set and get persist per step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    act(() => {
      result.current.metadata.set("first", { draft: true });
    });
    expect(result.current.metadata.get("first")).toEqual({ draft: true });
    act(() => result.current.navigation.next());
    expect(result.current.metadata.get("second")).toBeNull();
    expect(result.current.metadata.get("first")).toEqual({ draft: true });
  });

  it("state.current.metadata get/set for current step", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    expect(result.current.state.current.metadata.get()).toBeNull();
    act(() => {
      result.current.state.current.metadata.set({ count: 1 });
    });
    expect(result.current.state.current.metadata.get()).toEqual({ count: 1 });
  });

  it("Scoped provides same stepper to children via useStepper", () => {
    const { Scoped, useStepper } = defineStepper(...steps);
    let childStepper: ReturnType<typeof useStepper> | null = null;
    function Child() {
      childStepper = useStepper();
      return (
        <span data-testid="child">{childStepper.state.current.data.id}</span>
      );
    }
    render(
      <Scoped>
        <Child />
      </Scoped>,
    );
    expect(childStepper).not.toBeNull();
    expect(childStepper!.state.current.data.id).toBe("first");
    expect(screen.getByTestId("child").textContent).toBe("first");
  });

  it("Scoped with initialStep provides that step to children", () => {
    const { Scoped, useStepper } = defineStepper(...steps);
    let childStepper: ReturnType<typeof useStepper> | null = null;
    function Child() {
      childStepper = useStepper();
      return (
        <span data-testid="child">{childStepper!.state.current.data.id}</span>
      );
    }
    render(
      <Scoped initialStep="second">
        <Child />
      </Scoped>,
    );
    expect(childStepper!.state.current.data.id).toBe("second");
    expect(screen.getByTestId("child").textContent).toBe("second");
  });

  it("flow.when returns whenFn when step matches, elseFn otherwise", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    expect(
      result.current.flow.when(
        "first",
        (s) => s.title,
        () => "else",
      ),
    ).toBe("First");
    expect(
      result.current.flow.when(
        "second",
        () => "when",
        () => "else",
      ),
    ).toBe("else");
    act(() => result.current.navigation.next());
    expect(
      result.current.flow.when(
        "second",
        (s) => s.title,
        () => "else",
      ),
    ).toBe("Second");
  });

  it("flow.match returns result for given state id", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const out = result.current.flow.match("second", {
      first: (s) => s.title,
      second: (s) => s.title,
      third: (s) => s.title,
    });
    expect(out).toBe("Second");
    expect(result.current.flow.match("missing" as any, {})).toBeNull();
  });

  it("metadata.reset clears metadata; keepInitialMetadata restores initial", () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() =>
      useStepper({ initialMetadata: { first: { x: 1 } } }),
    );
    act(() => result.current.metadata.set("second", { y: 2 }));
    expect(result.current.metadata.get("first")).toEqual({ x: 1 });
    expect(result.current.metadata.get("second")).toEqual({ y: 2 });
    act(() => result.current.metadata.reset(false));
    expect(result.current.metadata.get("first")).toBeNull();
    expect(result.current.metadata.get("second")).toBeNull();
    act(() => result.current.metadata.set("first", { x: 1 }));
    act(() => result.current.metadata.set("second", { y: 2 }));
    act(() => result.current.metadata.reset(true));
    expect(result.current.metadata.get("first")).toEqual({ x: 1 });
    expect(result.current.metadata.get("second")).toBeNull();
  });

  it("Stepper.Root provides stepper to children render prop", () => {
    const { Stepper, useStepper } = defineStepper(...steps);
    type StepperInstance = ReturnType<typeof useStepper>;
    let receivedStepper: StepperInstance | null = null;
    render(
      <Stepper.Root>
        {({ stepper }) => {
          receivedStepper = stepper;
          return (
            <span data-testid="root-child">
              {stepper.state.current.data.id}
            </span>
          );
        }}
      </Stepper.Root>,
    );
    expect(receivedStepper).not.toBeNull();
    expect(receivedStepper!.state.current.data.id).toBe("first");
    expect(screen.getByTestId("root-child").textContent).toBe("first");
  });

  it("onBeforeTransition return false cancels transition", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const onBefore = vi.fn().mockResolvedValue(false);
    act(() => {
      result.current.lifecycle.onBeforeTransition(onBefore);
    });
    await act(async () => {
      await result.current.navigation.next();
    });
    expect(onBefore).toHaveBeenCalled();
    expect(result.current.state.current.data.id).toBe("first");
  });

  it("onAfterTransition is called after transition", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const onAfter = vi.fn().mockResolvedValue(undefined);
    act(() => {
      result.current.lifecycle.onAfterTransition(onAfter);
    });
    await act(async () => {
      result.current.navigation.next();
    });
    expect(onAfter).toHaveBeenCalledTimes(1);
    expect(onAfter.mock.calls[0][0].from.id).toBe("first");
    expect(onAfter.mock.calls[0][0].to.id).toBe("second");
    expect(onAfter.mock.calls[0][0].direction).toBe("next");
  });

  it("multiple onBeforeTransition callbacks run in order; false cancels", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(false);
    act(() => {
      result.current.lifecycle.onBeforeTransition(first);
      result.current.lifecycle.onBeforeTransition(second);
    });
    await act(async () => {
      await result.current.navigation.next();
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current.state.current.data.id).toBe("first");
  });

  it("onBeforeTransition returns unsubscribe", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const onBefore = vi.fn().mockResolvedValue(undefined);
    let unsubscribe: () => void;
    act(() => {
      unsubscribe = result.current.lifecycle.onBeforeTransition(onBefore);
    });
    unsubscribe!();
    await act(async () => {
      await result.current.navigation.next();
    });
    expect(onBefore).not.toHaveBeenCalled();
    expect(result.current.state.current.data.id).toBe("second");
  });

  it("next(payload) merges metadata into ctx and persists", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    let seenMetadata: Record<string, unknown> = {};
    act(() => {
      result.current.lifecycle.onBeforeTransition((ctx) => {
        seenMetadata = { ...ctx.metadata };
      });
    });
    await act(async () => {
      await result.current.navigation.next({
        metadata: { first: { url: "https://example.com" }, second: { foo: 1 } },
      });
    });
    expect(seenMetadata.first).toEqual({ url: "https://example.com" });
    expect(seenMetadata.second).toEqual({ foo: 1 });
    expect(result.current.metadata.get("first")).toEqual({
      url: "https://example.com",
    });
    expect(result.current.metadata.get("second")).toEqual({ foo: 1 });
  });

  it("onBeforeTransition cancel does not call onAfterTransition", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const onBefore = vi.fn().mockResolvedValue(false);
    const onAfter = vi.fn();

    act(() => {
      result.current.lifecycle.onBeforeTransition(onBefore);
      result.current.lifecycle.onAfterTransition(onAfter);
    });

    await act(async () => {
      await result.current.navigation.next();
    });

    expect(onBefore).toHaveBeenCalledTimes(1);
    expect(onAfter).not.toHaveBeenCalled();
    expect(result.current.state.current.data.id).toBe("first");
  });

  it("lifecycle ctx is correct for prev and goTo transitions", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper({ initialStep: "second" }));

    const before = vi.fn();
    const after = vi.fn();

    act(() => {
      result.current.lifecycle.onBeforeTransition(before);
      result.current.lifecycle.onAfterTransition(after);
    });

    await act(async () => {
      await result.current.navigation.prev();
    });

    expect(before).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        direction: "prev",
        fromIndex: 1,
        toIndex: 0,
      }),
    );
    expect(before.mock.calls[0]?.[0]?.statuses).toEqual({
      first: "success",
      second: "active",
      third: "inactive",
    });
    expect(after).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        direction: "prev",
        fromIndex: 1,
        toIndex: 0,
      }),
    );
    expect(after.mock.calls[0]?.[0]?.statuses).toEqual({
      first: "active",
      second: "inactive",
      third: "inactive",
    });

    await act(async () => {
      await result.current.navigation.goTo("third");
    });

    expect(before).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        direction: "goTo",
        fromIndex: 0,
        toIndex: 2,
      }),
    );
    expect(after).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        direction: "goTo",
        fromIndex: 0,
        toIndex: 2,
      }),
    );
    expect(result.current.state.current.data.id).toBe("third");
  });

  it("onAfterTransition returns unsubscribe and removes callback", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    const onAfter = vi.fn();

    let unsubscribe: () => void;
    act(() => {
      unsubscribe = result.current.lifecycle.onAfterTransition(onAfter);
    });

    await act(async () => {
      await result.current.navigation.next();
    });
    expect(onAfter).toHaveBeenCalledTimes(1);

    unsubscribe!();

    await act(async () => {
      await result.current.navigation.prev();
    });
    expect(onAfter).toHaveBeenCalledTimes(1);
  });

  it("isTransitioning is true during async lifecycle callbacks", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());

    let releaseBefore: (() => void) | undefined;
    const beforeGate = new Promise<void>((resolve) => {
      releaseBefore = resolve;
    });

    act(() => {
      result.current.lifecycle.onBeforeTransition(async () => {
        await beforeGate;
      });
    });

    act(() => {
      void result.current.navigation.next();
    });

    expect(result.current.state.isTransitioning).toBe(true);
    expect(result.current.state.current.data.id).toBe("first");

    releaseBefore?.();

    await act(async () => {
      await beforeGate;
    });

    expect(result.current.state.current.data.id).toBe("second");
    expect(result.current.state.isTransitioning).toBe(false);
  });

  it("payload metadata is visible in onBefore ctx but not persisted when transition is canceled", async () => {
    const { useStepper } = defineStepper(...steps);
    const { result } = renderHook(() => useStepper());
    let seenMetadata: Record<string, unknown> = {};

    act(() => {
      result.current.lifecycle.onBeforeTransition((ctx) => {
        seenMetadata = { ...ctx.metadata };
        return false;
      });
    });

    await act(async () => {
      await result.current.navigation.next({
        metadata: { first: { draft: true }, second: { foo: 1 } },
      });
    });

    expect(seenMetadata.first).toEqual({ draft: true });
    expect(seenMetadata.second).toEqual({ foo: 1 });
    expect(result.current.metadata.get("first")).toBeNull();
    expect(result.current.metadata.get("second")).toBeNull();
    expect(result.current.state.current.data.id).toBe("first");
  });
});
