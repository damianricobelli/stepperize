import { describe, expect, it } from "vitest";
import {
	contentAttrs,
	itemAttrs,
	itemBits,
	itemValue,
	navAttrs,
	navBits,
	navIdle,
	panelId,
	rootAttrs,
	statusBits,
	triggerAttrs,
	triggerId,
	type Ui,
} from "../primitives";
import { createStepper } from "../stepper";

const steps = [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c" }] as const;
const tabs: Ui = { id: "x-", orientation: "horizontal", tabs: true };
const list: Ui = { ...tabs, tabs: false };

describe("primitives", () => {
	it("packs what an item shows into one comparable number", async () => {
		const flow = createStepper(steps, { linear: true });
		const item = (id: "a" | "b" | "c") => itemValue(steps[0], 0, itemBits(flow.get(), id));
		expect(item("a")).toMatchObject({ state: "current", disabled: false, invalid: false, pending: false });
		expect(item("b")).toMatchObject({ state: "pending", disabled: true });
		const before = itemBits(flow.get(), "c");
		flow.setData("a", 1);
		expect(itemBits(flow.get(), "c")).toBe(before);
		await flow.next();
		expect(item("a")).toMatchObject({ state: "complete", disabled: false });
	});

	it("a trigger is a tab in a tablist and a step button otherwise", () => {
		const flow = createStepper(steps);
		const current = itemValue(steps[0], 0, itemBits(flow.get(), "a"));
		const other = itemValue(steps[1], 1, itemBits(flow.get(), "b"));
		expect(triggerAttrs(tabs, current, false, 3)).toMatchObject({
			id: triggerId(tabs, "a"),
			role: "tab",
			tabindex: 0,
			"aria-selected": "true",
			"aria-controls": panelId(tabs, "a"),
			"aria-posinset": 1,
			"aria-setsize": 3,
		});
		expect(triggerAttrs(tabs, other, false, 3)).toMatchObject({ tabindex: -1, "aria-selected": "false" });
		const plain = triggerAttrs(list, current, false, 3);
		expect([plain.role, plain["aria-current"], plain.tabindex]).toEqual([undefined, "step", undefined]);
		expect(itemAttrs(current, true).role).toBe("presentation");
		expect(itemAttrs(current, false).role).toBeUndefined();
	});

	it("a pending move sets aria-disabled without disabling natively", () => {
		const pending = { ...itemValue(steps[1], 1, 0), pending: true, disabled: true };
		expect(triggerAttrs(tabs, pending, false, 3)).toMatchObject({ disabled: undefined, "aria-disabled": "true" });
		expect(triggerAttrs(tabs, pending, true, 3)).toMatchObject({ disabled: true, "aria-disabled": "true" });
	});

	it("a panel is a tabpanel named by its tab, or a group named by the step title", () => {
		expect(contentAttrs(tabs, steps[0], true)).toMatchObject({
			role: "tabpanel",
			"aria-labelledby": triggerId(tabs, "a"),
			tabindex: 0,
			hidden: undefined,
		});
		expect(contentAttrs(list, steps[0], false)).toMatchObject({
			role: "group",
			"aria-label": "A",
			"aria-labelledby": undefined,
			tabindex: -1,
			hidden: true,
		});
		// Without a title there is nothing else to name it by.
		expect(contentAttrs(list, steps[2], true)["aria-labelledby"]).toBe(triggerId(list, "c"));
	});

	it("Next and Prev follow the edges, a running move and a finished flow", async () => {
		const flow = createStepper(steps, { snapshot: { step: "c" } });
		expect(navAttrs("prev", navBits(createStepper(steps).get(), "prev"), false).disabled).toBe(true);
		expect(navAttrs("prev", navBits(flow.get(), "prev"), false).disabled).toBeUndefined();
		expect(navIdle(navBits(flow.get(), "next"))).toBe(false);
		await flow.next();
		const done = navBits(flow.get(), "next");
		expect(navIdle(done)).toBe(true);
		expect(navAttrs("next", done, false)).toMatchObject({ disabled: undefined, "aria-disabled": "true" });
		expect(rootAttrs("vertical", statusBits(flow.get()))).toMatchObject({
			"data-orientation": "vertical",
			"data-finished": "",
			"aria-busy": undefined,
		});
	});
});
