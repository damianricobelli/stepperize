import type { TitleProps } from "./types";

export function createTitle() {
  return function Title(props: TitleProps) {
    const { render, children, ...rest } = props;
    const domProps = {
      "data-component": "stepper-title",
      ...rest,
    };
    if (render) return render(domProps);
    return <h4 {...domProps}>{children}</h4>;
  };
}
