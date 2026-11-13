import type { Step, StepStatus } from "@stepperize/core";
import React from "react";
import type { StepperContext } from "../context";
import { fail } from "../dev";

export type StepItemValue<S extends Step = Step> = {
	data: S;
	index: number;
	status: StepStatus;
	complete: boolean;
	isActive: boolean;
	canGoTo: boolean;
	count: number;
};

/** Root-level presentation, shared by every primitive below one Root. */
export type UiValue = {
	orientation: "horizontal" | "vertical";
	/**
	 * Whether this stepper has triggers. Without them (panels and Next only, or a
	 * list of indicators) there are no tabs, so lists and panels drop the tab roles.
	 */
	tabs: boolean;
};

const DEFAULT_UI: UiValue = { orientation: "horizontal", tabs: true };

/** Each definition owns its context. Nesting a different flow cannot redirect its actions. */
export function createStepperScope<Steps extends readonly Step[]>(context: StepperContext<Steps>) {
	const ItemContext = React.createContext<StepItemValue | null>(null);
	const AutoContext = React.createContext<{ step: Step; index: number } | null>(null);
	const UiContext = React.createContext<UiValue>(DEFAULT_UI);
	/** `true` inside a tablist (its items are presentational) and inside a Trigger (phrasing content only). */
	const ListContext = React.createContext(false);
	const TriggerContext = React.createContext(false);

	function useStepItem<S extends Step = Step>(): StepItemValue<S> {
		const item = React.useContext(ItemContext);
		if (!item) fail("SZ101", "Missing Stepper.Item. Render this primitive inside a Stepper.Item.");
		return item as StepItemValue<S>;
	}

	return { ...context, useStepItem, ItemContext, AutoContext, UiContext, ListContext, TriggerContext };
}

export type StepperScope<Steps extends readonly Step[]> = ReturnType<typeof createStepperScope<Steps>>;

export const triggerDomId = (instance: string, step: string) => `${instance}step-${step}`;
export const panelDomId = (instance: string, step: string) => `${instance}step-panel-${step}`;
