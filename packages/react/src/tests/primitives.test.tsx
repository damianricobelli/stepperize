import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defineStepper } from "../define-stepper";
import { useStepItemContext } from "../primitives";

const steps = [
  { id: "first", title: "First" },
  { id: "second", title: "Second" },
] as const;

describe("primitives", () => {
  it("Stepper.Item render prop renders custom node and keeps item context", () => {
    const { Stepper } = defineStepper(...steps);

    function ItemStatus() {
      const item = useStepItemContext();
      return (
        <span data-testid={`status-${item.data.id}`}>{item.status}</span>
      );
    }

    render(
      <Stepper.Root>
        {({ stepper }) => (
          <Stepper.List>
            {stepper.state.all.map((step) => (
              <Stepper.Item
                key={step.id}
                step={step.id}
                render={(props) => (
                  <li {...props} data-testid={`item-${step.id}`}>
                    <ItemStatus />
                  </li>
                )}
              />
            ))}
          </Stepper.List>
        )}
      </Stepper.Root>,
    );

    expect(screen.getByTestId("item-first")).toBeTruthy();
    expect(screen.getByTestId("item-second")).toBeTruthy();
    expect(screen.getByTestId("status-first").textContent).toBe("active");
    expect(screen.getByTestId("status-second").textContent).toBe("inactive");
  });

  it("Stepper.Trigger respects preventDefault in onClick", () => {
    const { Stepper } = defineStepper(...steps);

    render(
      <Stepper.Root>
        {({ stepper }) => (
          <>
            <span data-testid="current">{stepper.state.current.data.id}</span>
            <Stepper.List>
              {stepper.state.all.map((step) => (
                <Stepper.Item key={step.id} step={step.id}>
                  <Stepper.Trigger
                    onClick={(e) => {
                      if (step.id === "second") e.preventDefault();
                    }}
                  >
                    {step.title}
                  </Stepper.Trigger>
                </Stepper.Item>
              ))}
            </Stepper.List>
          </>
        )}
      </Stepper.Root>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Second" }));
    expect(screen.getByTestId("current").textContent).toBe("first");
  });

  it("Stepper.Next and Stepper.Prev respect preventDefault in onClick", () => {
    const { Stepper } = defineStepper(...steps);

    render(
      <Stepper.Root initialStep="second">
        {({ stepper }) => (
          <>
            <span data-testid="current">{stepper.state.current.data.id}</span>
            <Stepper.Prev onClick={(e) => e.preventDefault()}>Prev</Stepper.Prev>
            <Stepper.Next onClick={(e) => e.preventDefault()}>Next</Stepper.Next>
          </>
        )}
      </Stepper.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(screen.getByTestId("current").textContent).toBe("second");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("current").textContent).toBe("second");
  });

  it("Stepper.List respects preventDefault in onKeyDown", () => {
    const { Stepper } = defineStepper(...steps);

    render(
      <Stepper.Root>
        {({ stepper }) => (
          <>
            <span data-testid="current">{stepper.state.current.data.id}</span>
            <Stepper.List onKeyDown={(e) => e.preventDefault()}>
              {stepper.state.all.map((step) => (
                <Stepper.Item key={step.id} step={step.id}>
                  <Stepper.Trigger>{step.title}</Stepper.Trigger>
                </Stepper.Item>
              ))}
            </Stepper.List>
          </>
        )}
      </Stepper.Root>,
    );

    const firstTrigger = screen.getByRole("tab", { name: "First" });
    firstTrigger.focus();
    fireEvent.keyDown(firstTrigger, { key: "ArrowRight" });

    expect(screen.getByTestId("current").textContent).toBe("first");
  });
});
