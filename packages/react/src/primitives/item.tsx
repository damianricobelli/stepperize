import type { Get, Step, StepMap, StepStatus } from "@stepperize/core";
import React from "react";
import { fail } from "../dev";
import type { StepItemValue, StepperScope } from "./context";
import { primitive, renderPrimitive, useDevRef } from "./render";
import type { ItemProps, PrimitiveComponent } from "./types";

const STATUS: StepStatus[] = ["upcoming", "previous", "active"];

export function createItem<Steps extends readonly Step[]>(
	map: StepMap<Steps>,
	scope: StepperScope<Steps>,
): PrimitiveComponent<ItemProps<Steps>> {
	const count = map.steps.length;
	return primitive<ItemProps<Steps>, HTMLLIElement>("Item", (props, forwardedRef) => {
		const { step, render, children, ...rest } = props;
		const auto = React.useContext(scope.AutoContext);
		const inTablist = React.useContext(scope.ListContext);
		const ref = useDevRef("Item", render, forwardedRef);
		const index = step === undefined ? (auto?.index ?? -1) : map.indexOf(step);
		const data = map.steps[index] as Get.StepById<Steps, Get.Id<Steps>> | undefined;
		if (!data) {
			if (step === undefined) fail("SZ103", "Stepper.Item needs a `step` prop or must be used inside Stepper.Items.");
			fail("SZ102", `Step "${step}" not found.`);
		}
		const id = data.id as Get.Id<Steps>;

		// One subscription per item, packed into a number so `Object.is` is the
		// equality check: bits 0-1 status, 2 complete, 3 active, 4 canGoTo.
		// Position comes from the static index: every item runs this on every change.
		const bits = scope.useSelector<number>((s) => {
			const current = s.index;
			return (
				(current === index ? 10 : index < current ? 1 : 0) |
				(s.completed.length && s.isComplete(id) ? 4 : 0) |
				(s.canGoTo(id) ? 16 : 0)
			);
		});
		const status = STATUS[bits & 3] as StepStatus;
		const complete = !!(bits & 4);

		const value = React.useMemo<StepItemValue<typeof data>>(
			() => ({ data, index, count, status, complete, isActive: !!(bits & 8), canGoTo: !!(bits & 16) }),
			[data, index, bits],
		);

		const domProps = {
			"data-component": "stepper-item",
			"data-status": status,
			"data-complete": complete ? "" : undefined,
			"data-disabled": bits & 16 ? undefined : "",
			// A tablist owns tabs directly: the wrapping <li> must not expose a listitem in between.
			role: inTablist ? ("presentation" as const) : undefined,
			...rest,
			ref,
			children,
		};

		return (
			<scope.ItemContext.Provider value={value}>{renderPrimitive("li", domProps, render)}</scope.ItemContext.Provider>
		);
	});
}
