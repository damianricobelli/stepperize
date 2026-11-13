import type { Get, Step, Stepper } from "@stepperize/core";
import React from "react";
import type { UseStepperOptions } from "../types";
import { useCommitEffect } from "../utils";
import { panelDomId, type StepperScope, type UiValue, VISUALLY_HIDDEN } from "./context";
import { composeRefs, primitive } from "./render";
import type { PrimitiveComponent, RootProps } from "./types";

/**
 * Options forwarded from Root to the Provider. `satisfies` guarantees each
 * entry is a real option, and `_exhaustive` fails to compile if an option is
 * added to `UseStepperOptions` without being listed here.
 */
const STATE_KEYS = [
	"defaultStep",
	"defaultCompleted",
	"step",
	"onStepChange",
	"onInvalidStep",
	"defaultData",
	"data",
	"onDataChange",
	"completed",
	"onCompletedChange",
	"linear",
	"beforeStepChange",
] as const satisfies readonly (keyof UseStepperOptions<readonly Step[]>)[];
type Missing = Exclude<keyof UseStepperOptions<readonly Step[]>, (typeof STATE_KEYS)[number]>;
const _exhaustive: [Missing] extends [never] ? true : { missingKeys: Missing } = true;
void _exhaustive;
// Root splits its props on every render: a Set keeps that lookup O(1).
const STATE_KEY_SET: ReadonlySet<string> = new Set(STATE_KEYS);

type InnerProps<Steps extends readonly Step[]> = Omit<RootProps<Steps>, (typeof STATE_KEYS)[number]>;

export function createRoot<Steps extends readonly Step[]>(
	Provider: (props: React.PropsWithChildren<any>) => React.ReactElement,
	scope: StepperScope<Steps>,
): PrimitiveComponent<RootProps<Steps>> {
	/**
	 * What a step change needs beyond rendering, for people who cannot see it:
	 *
	 * - Focus falls back to <body> when its element unmounts (a field in the old
	 *   panel, a Next button replaced on the last step) or becomes disabled. Hand
	 *   it to the new panel instead of stranding keyboard users.
	 * - Pressing Next changes the page silently for screen readers. Announce the
	 *   new step by its own `title`: your words, so there is nothing to translate.
	 *
	 * Subscribes to the step id only, so neither the Root nor its children re-render for it.
	 */
	function StepChange({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
		const { store, id: instance } = scope.useValue();
		const id = scope.useSelector<Get.Id<Steps>>((s) => s.id);
		const region = React.useRef<HTMLSpanElement>(null);
		// Read while rendering the change, before React touches the DOM: was focus in this
		// stepper? Focus that is elsewhere is never moved. No focus events needed.
		const inside = !!root.current?.contains(root.current.ownerDocument.activeElement);
		const previous = React.useRef(id);
		useCommitEffect(() => {
			if (previous.current === id) return;
			previous.current = id;
			const doc = root.current?.ownerDocument;
			if (!doc) return;
			let active = doc.activeElement as HTMLButtonElement | null;
			if (inside && (!active || active === doc.body || active.disabled)) {
				active = doc.getElementById(panelDomId(instance, id)) as HTMLButtonElement | null;
				active?.focus();
			}
			// A focused tab or panel already reads the step. Written straight to the DOM:
			// announcing must not re-render anything.
			const title = (store.getSnapshot().current as { title?: unknown }).title;
			const reads =
				active?.id.startsWith(instance) && active.matches('[role="tab"], [data-component="stepper-content"]');
			if (region.current) region.current.textContent = !reads && typeof title === "string" ? title : "";
		});
		return <span ref={region} aria-live="polite" style={VISUALLY_HIDDEN} />;
	}

	const Inner = React.forwardRef<HTMLDivElement, InnerProps<Steps>>(function Inner(
		{ children, orientation = "horizontal", ...rest },
		ref,
	) {
		const { id: instance } = scope.useValue();
		// Only the render-prop form needs the live stepper; otherwise subscribe to `isPending` only.
		const renderProp = typeof children === "function";
		const stepper = scope.useSelector<Stepper<Steps> | null>((s) => (renderProp ? s : null));
		const pending = scope.useSelector<boolean>((s) => s.isPending);
		const root = React.useRef<HTMLDivElement>(null);
		const composed = React.useMemo(() => composeRefs(ref, root), [ref]);

		// Tab roles need tabs. Assume them (server HTML and the usual layout never change),
		// then look for this instance's own triggers (not a nested stepper's) whenever the Root commits.
		const [tabs, setTabs] = React.useState(true);
		useCommitEffect(() => {
			setTabs(!!root.current?.querySelector(`[role="tab"][id^="${instance}"]`));
		});
		const ui = React.useMemo<UiValue>(() => ({ orientation, tabs }), [orientation, tabs]);

		return (
			<scope.UiContext.Provider value={ui}>
				{/* biome-ignore lint/a11y/useSemanticElements: fieldset would change layout semantics */}
				<div
					data-component="stepper"
					data-orientation={orientation}
					data-pending={pending ? "" : undefined}
					role="group"
					aria-label="Stepper"
					aria-busy={pending || undefined}
					{...rest}
					ref={composed}
				>
					{typeof children === "function" ? children({ stepper: stepper as never }) : children}
					<StepChange root={root} />
				</div>
			</scope.UiContext.Provider>
		);
	});

	return primitive<RootProps<Steps>, HTMLDivElement>("Root", (props, ref) => {
		const state: Record<string, unknown> = {};
		const dom: Record<string, unknown> = {};
		for (const key in props) (STATE_KEY_SET.has(key) ? state : dom)[key] = (props as Record<string, unknown>)[key];
		return (
			<Provider {...state}>
				<Inner {...(dom as InnerProps<Steps>)} ref={ref} />
			</Provider>
		);
	});
}
