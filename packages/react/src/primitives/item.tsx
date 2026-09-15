import type { Get, Step, StepMap, StepStatus } from "@stepperize/core";
import React from "react";
import type { StepItemValue, StepperScope } from "./context";
import { renderPrimitive } from "./render";
import type { ItemProps, PrimitiveComponent } from "./types";

const STATUS: StepStatus[] = ["upcoming", "previous", "active"];

export function createItem<Steps extends readonly Step[]>(
	map: StepMap<Steps>,
	scope: StepperScope<Steps>,
): PrimitiveComponent<ItemProps<Steps>> {
	const count = map.steps.length;
	return function Item(props: ItemProps<Steps>) {
		const { step, render, children, ...rest } = props;
		const auto = React.useContext(scope.AutoContext);
		const index = step === undefined ? (auto?.index ?? -1) : map.indexOf(step);
		const data = map.steps[index] as Get.StepById<Steps, Get.Id<Steps>> | undefined;
		if (!data) {
			throw new Error(
				step === undefined
					? "Stepper.Item needs a step prop or must be used inside Stepper.Items."
					: `Step "${step}" not found.`,
			);
		}
		const id = data.id as Get.Id<Steps>;

		// One subscription per item, packed into a number so `Object.is` is the
		// equality check: bits 0-1 status, 2 complete, 3 active, 4 canGoTo.
		const bits = scope.useSelector<number>(
			(s) =>
				STATUS.indexOf(s.status(id)) | (s.isComplete(id) ? 4 : 0) | (s.id === id ? 8 : 0) | (s.canGoTo(id) ? 16 : 0),
		);
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
			...rest,
		};

		return (
			<scope.ItemContext.Provider value={value}>
				{renderPrimitive("li", domProps, render, children)}
			</scope.ItemContext.Provider>
		);
	};
}
