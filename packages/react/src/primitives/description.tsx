import type { DescriptionProps } from "./types";

export function createDescription() {
  return function Description(props: DescriptionProps) {
    const { render, children, ...rest } = props;
    const domProps = {
      "data-component": "stepper-description",
      ...rest,
    };
    if (render) return render(domProps);
    return <p {...domProps}>{children}</p>;
  };
}
