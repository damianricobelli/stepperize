import type React from "react";
import { useStepItemContext } from "./context";
import type { IndicatorProps } from "./types";

export function createIndicator() {
  return function Indicator(props: IndicatorProps) {
    const { render, children, ...rest } = props;
    const item = useStepItemContext();
    const merged = {
      "data-component": "stepper-indicator",
      "data-status": item.status,
      ...rest,
    };
    const content = render
      ? render(merged as React.ComponentPropsWithoutRef<"span">)
      : children;
    return (
      <span aria-hidden={true} {...merged}>
        {content}
      </span>
    );
  };
}
