import type { Get, Step, Stepper } from "@stepperize/core";
import React from "react";
import type { ListProps, PrimitiveComponent } from "./types";

const ARROW_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] as const;

export function createList<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
): PrimitiveComponent<ListProps> {
	return function List(props: ListProps) {
		const { orientation = "horizontal", render, children, onKeyDown, ...rest } = props;
		const stepper = React.useContext(StepperContext);

		const handleKeyDown = React.useCallback(
			(e: React.KeyboardEvent<HTMLOListElement>) => {
				onKeyDown?.(e);
				if (e.defaultPrevented) return;
				if (!ARROW_KEYS.includes(e.key as (typeof ARROW_KEYS)[number])) return;
				const target = e.target as HTMLElement;
				if (target.getAttribute?.("role") !== "tab") return;

				const steps = stepper?.steps;
				if (!stepper || !steps?.length) return;

				const currentIndex = stepper.index;
				const isHorizontal = orientation === "horizontal";
				const isNext = (isHorizontal && e.key === "ArrowRight") || (!isHorizontal && e.key === "ArrowDown");
				const isPrev = (isHorizontal && e.key === "ArrowLeft") || (!isHorizontal && e.key === "ArrowUp");
				const isHome = e.key === "Home";
				const isEnd = e.key === "End";

				if (!isNext && !isPrev && !isHome && !isEnd) return;

				e.preventDefault();

				let nextIndex: number;
				if (isHome) nextIndex = 0;
				else if (isEnd) nextIndex = steps.length - 1;
				else if (isNext) nextIndex = Math.min(currentIndex + 1, steps.length - 1);
				else nextIndex = Math.max(currentIndex - 1, 0);

				if (nextIndex === currentIndex) return;

				const targetStep = steps[nextIndex];
				const targetId = targetStep.id as Get.Id<Steps>;
				if (!stepper.canGoTo(targetId)) return;

				void Promise.resolve(stepper.goTo(targetId)).then((changed) => {
					if (!changed) return;
					document.getElementById(`step-${targetStep.id}`)?.focus();
				});
			},
			[stepper, orientation, onKeyDown],
		);

		const domProps = {
			"data-component": "stepper-list",
			"data-orientation": orientation,
			role: "tablist" as const,
			"aria-orientation": orientation,
			...rest,
			onKeyDown: handleKeyDown,
		};

		if (render) return render(domProps);
		return <ol {...domProps}>{children}</ol>;
	};
}
