import type { Flow, Options, Step, Stepper } from "@stepperize/core";
import React from "react";
import { type Scope, useCommitEffect } from "../definition";
import { composeRefs, panelId, primitive, type Ui, UiContext } from "./shared";
import type { Component, RootProps } from "./types";

/**
 * Options that go to the flow; everything else goes to the `div`. `satisfies`
 * keeps each entry real, and `_exhaustive` fails to compile when an option is
 * added to `Options` without being listed here.
 */
const OPTION_KEYS = [
	"linear",
	"next",
	"guard",
	"onChange",
	"onFinish",
	"snapshot",
	"step",
	"onInvalidStep",
] as const satisfies readonly (keyof Options<readonly Step[]>)[];
type Missing = Exclude<keyof Options<readonly Step[]>, (typeof OPTION_KEYS)[number]>;
const _exhaustive: [Missing] extends [never] ? true : { missing: Missing } = true;
void _exhaustive;
const OPTIONS: ReadonlySet<string> = new Set(OPTION_KEYS);

/** Text for screen readers only. */
const HIDDEN: React.CSSProperties = {
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
};

type InnerProps<S extends readonly Step[]> = Omit<RootProps<S>, (typeof OPTION_KEYS)[number]> & {
	flow: Flow<S>;
	linear: boolean;
};

export function createRoot<S extends readonly Step[]>(scope: Scope<S>): Component<RootProps<S>> {
	const whole = (s: Stepper<S>) => s;
	/** bit 0: a move is running; bit 1: the flow finished. */
	const status = (s: Stepper<S>) => (s.isPending ? 1 : 0) | (s.isFinished ? 2 : 0);
	const position = (s: Stepper<S>) => s.index;
	/**
	 * What a step change needs beyond rendering, for people who cannot see it:
	 *
	 * - Focus falls back to <body> when its element unmounts (a field in the old
	 *   panel, a button that is replaced) or becomes disabled. Hand it to the new
	 *   panel instead of stranding keyboard users.
	 * - Pressing Next changes the page silently for screen readers. Announce the
	 *   new step by its own `title`: your words, so there is nothing to translate.
	 *
	 * Subscribes to the step index only, so nothing else re-renders for it.
	 */
	function StepChange({ flow, ui, root }: { flow: Flow<S>; ui: Ui; root: React.RefObject<HTMLDivElement | null> }) {
		const index = scope.useSelect(flow, position);
		const region = React.useRef<HTMLSpanElement>(null);
		// Read while rendering the change, before React touches the DOM: was focus in this
		// stepper? Focus that is elsewhere is never moved. No focus events needed.
		const inside = !!root.current?.contains(root.current.ownerDocument.activeElement);
		const previous = React.useRef(index);
		useCommitEffect(() => {
			if (previous.current === index) return;
			previous.current = index;
			const doc = root.current?.ownerDocument;
			if (!doc) return;
			const step = flow.current as { id: string; title?: unknown };
			let active = doc.activeElement as HTMLButtonElement | null;
			if (inside && (!active || active === doc.body || active.disabled)) {
				active = doc.getElementById(panelId(ui, step.id)) as HTMLButtonElement | null;
				active?.focus();
			}
			// A focused trigger or panel already reads the step. Written straight to the DOM:
			// announcing must not re-render anything.
			const reads = active?.id.startsWith(ui.id) && active.dataset.step === step.id;
			if (region.current) region.current.textContent = !reads && typeof step.title === "string" ? step.title : "";
		});
		return <span ref={region} aria-live="polite" style={HIDDEN} />;
	}

	const Inner = React.forwardRef<HTMLDivElement, InnerProps<S>>(function Inner(
		{ flow, linear, children, orientation = "horizontal", ...rest },
		ref,
	) {
		const id = React.useId();
		// Only the function form needs the live stepper; otherwise subscribe to `isPending` only.
		const live = typeof children === "function";
		// One subscription: the function form needs the live stepper, anything else only its status.
		const selected = scope.useSelect<Stepper<S> | number>(flow, live ? whole : status);
		const flags = typeof selected === "number" ? selected : status(selected);
		const pending = !!(flags & 1);
		const finished = !!(flags & 2);
		const root = React.useRef<HTMLDivElement>(null);
		const composed = React.useMemo(() => composeRefs(ref, root), [ref]);

		// Tabs need triggers. Assume them (server HTML and the usual layout never change),
		// then look for this instance's own triggers whenever the Root commits.
		const [triggers, setTriggers] = React.useState(true);
		useCommitEffect(() => {
			setTriggers(!!root.current?.querySelector(`[data-component="stepper-trigger"][id^="${id}"]`));
		});
		const tabs = !linear && triggers;
		const ui = React.useMemo<Ui>(() => ({ id, orientation, tabs }), [id, orientation, tabs]);

		return (
			<UiContext.Provider value={ui}>
				{/* biome-ignore lint/a11y/useSemanticElements: fieldset would change layout semantics */}
				<div
					data-component="stepper"
					data-orientation={orientation}
					data-pending={pending ? "" : undefined}
					data-finished={finished ? "" : undefined}
					role="group"
					aria-label="Stepper"
					aria-busy={pending || undefined}
					{...rest}
					ref={composed}
				>
					{typeof children === "function" ? children(selected as Stepper<S>) : children}
					<StepChange flow={flow} ui={ui} root={root} />
				</div>
			</UiContext.Provider>
		);
	});

	return primitive<RootProps<S>, HTMLDivElement>("Root", (props, ref) => {
		const options: Record<string, unknown> = {};
		const dom: Record<string, unknown> = {};
		for (const key in props) (OPTIONS.has(key) ? options : dom)[key] = (props as Record<string, unknown>)[key];
		const flow = scope.useFlow(options as Options<S>);
		return (
			<scope.FlowContext.Provider value={flow}>
				<Inner
					{...(dom as Omit<InnerProps<S>, "flow" | "linear">)}
					flow={flow}
					linear={!!(props.linear ?? scope.defaults.linear)}
					ref={ref}
				/>
			</scope.FlowContext.Provider>
		);
	});
}
