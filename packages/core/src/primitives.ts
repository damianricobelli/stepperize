// What every binding's `Stepper.*` primitives share: ids, ARIA and data
// attributes, keyboard navigation, focus hand-off and announcements. Plain
// functions over the flow and the DOM, so Vue, Svelte, Solid and the rest render
// the same accessible markup without re-deriving it.
//
// For binding authors. Application code uses a binding, not this entry.

import { warn } from "./dev";
import type { Flow, Id, Options, Step, Stepper, StepState } from "./types";

declare const process: { env: { NODE_ENV?: string } };

export type Orientation = "horizontal" | "vertical";

/** Set by the Root, read by every primitive below it. */
export type Ui = {
	/** Prefix that keeps DOM ids unique per Root. */
	id: string;
	orientation: Orientation;
	/**
	 * Tabs (a tablist with roving focus) or a list of step buttons. A linear flow
	 * is not a set of tabs, and neither is a flow without triggers.
	 */
	tabs: boolean;
};

/** What a binding exposes for the enclosing Item. */
export type ItemValue<S extends readonly Step[] = readonly Step[]> = {
	step: S[number];
	index: number;
	state: StepState;
	/** Its last validation failed and its data has not changed since. */
	invalid: boolean;
	/** `goTo` would be refused right now. */
	disabled: boolean;
	/** A move is running. Every step is `disabled` meanwhile. */
	pending: boolean;
};

/** Attributes as every framework accepts them: `undefined` and `false` mean absent. */
export type Attrs = Record<string, string | number | boolean | undefined>;

/**
 * Options that go to the flow; everything else a Root receives goes to its
 * element. `_exhaustive` fails to compile when an option is added to `Options`
 * without being listed here.
 */
export const OPTION_KEYS = [
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

export const triggerId = (ui: Ui, step: string) => `${ui.id}trigger-${step}`;
export const panelId = (ui: Ui, step: string) => `${ui.id}panel-${step}`;

/** Inline style for text meant for screen readers only. */
export const HIDDEN = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";

const flag = (on: boolean) => (on ? "" : undefined);
const aria = (on: boolean) => (on ? "true" : undefined);

const STATES: StepState[] = ["pending", "complete", "current"];

/**
 * Everything an Item and its Trigger show, packed into a number so a plain
 * equality check tells whether anything changed: bits 0-1 state, 2 reachable,
 * 3 invalid, 4 a move is running.
 */
export const itemBits = <S extends readonly Step[]>(s: Stepper<S>, id: Id<S>) =>
	STATES.indexOf(s.state(id)) | (s.canGoTo(id) ? 4 : 0) | (s.issues(id) ? 8 : 0) | (s.isPending ? 16 : 0);

export const itemValue = <S extends readonly Step[]>(step: S[number], index: number, bits: number): ItemValue<S> => ({
	step,
	index,
	state: STATES[bits & 3],
	invalid: !!(bits & 8),
	disabled: !(bits & 4),
	pending: !!(bits & 16),
});

/** bit 0: a move is running; bit 1: the flow finished. */
export const statusBits = <S extends readonly Step[]>(s: Stepper<S>) => (s.isPending ? 1 : 0) | (s.isFinished ? 2 : 0);

/** bit 0: there is somewhere to go; bit 1: a move is running; bit 2: the flow finished, so `next()` has nothing to do. */
export const navBits = <S extends readonly Step[]>(s: Stepper<S>, dir: "next" | "prev") =>
	(dir === "next" || s.index > 0 || s.snapshot().history.length ? 1 : 0) |
	(s.isPending ? 2 : 0) |
	(dir === "next" && s.isFinished ? 4 : 0);

/** A running move or a finished flow: the button stays focusable but does nothing. */
export const navIdle = (bits: number) => bits > 1;

export function rootAttrs(orientation: Orientation, status: number): Attrs {
	const pending = !!(status & 1);
	return {
		"data-component": "stepper",
		"data-orientation": orientation,
		"data-pending": flag(pending),
		"data-finished": flag(!!(status & 2)),
		role: "group",
		"aria-label": "Stepper",
		"aria-busy": aria(pending),
	};
}

export function listAttrs(ui: Ui, orientation: Orientation): Attrs {
	return {
		"data-component": "stepper-list",
		"data-orientation": orientation,
		role: ui.tabs ? "tablist" : undefined,
		"aria-orientation": ui.tabs ? orientation : undefined,
	};
}

export function itemAttrs(item: ItemValue, inTablist: boolean): Attrs {
	return {
		"data-component": "stepper-item",
		"data-step": item.step.id,
		"data-state": item.state,
		"data-invalid": flag(item.invalid),
		"data-disabled": flag(item.disabled),
		// A tablist owns its tabs directly: the <li> must not expose a listitem in between.
		role: inTablist ? "presentation" : undefined,
	};
}

/**
 * `disabled` is what the binding decided: the caller's own `disabled`, or a
 * step that was unreachable before the running move started. While a move runs
 * every step is unreachable; disabling natively then would drop focus from the
 * clicked trigger, so pending only sets `aria-disabled`.
 */
export function triggerAttrs(ui: Ui, item: ItemValue, disabled: boolean, total: number): Attrs {
	const id = item.step.id;
	const current = item.state === "current";
	const off = disabled || item.pending;
	return {
		id: triggerId(ui, id),
		"data-component": "stepper-trigger",
		"data-step": id,
		"data-state": item.state,
		"data-invalid": flag(item.invalid),
		"data-disabled": flag(off),
		disabled,
		"aria-disabled": aria(off),
		...(ui.tabs
			? {
					role: "tab",
					// Roving tabindex: the selected tab is the single tab stop of the list.
					tabindex: current && !disabled ? 0 : -1,
					"aria-selected": current ? "true" : "false",
					"aria-controls": panelId(ui, id),
					"aria-posinset": item.index + 1,
					"aria-setsize": total,
				}
			: { "aria-current": current ? "step" : undefined }),
	};
}

export function indicatorAttrs(item: ItemValue): Attrs {
	return {
		"data-component": "stepper-indicator",
		"data-state": item.state,
		"data-invalid": flag(item.invalid),
		"aria-hidden": "true",
	};
}

export function contentAttrs(ui: Ui, step: Step, active: boolean): Attrs {
	// A tabpanel is named by its tab. A group is named by the step title, which needs no trigger.
	const title = (step as { title?: unknown }).title;
	const named = !ui.tabs && typeof title === "string";
	return {
		id: panelId(ui, step.id),
		"data-component": "stepper-content",
		"data-step": step.id,
		role: ui.tabs ? "tabpanel" : "group",
		"aria-label": named ? (title as string) : undefined,
		"aria-labelledby": named ? undefined : triggerId(ui, step.id),
		// Inactive panels stay mounted (form state survives) but hidden.
		hidden: !active || undefined,
		// Tab panels are a tab stop; groups only receive focus programmatically.
		tabindex: active && ui.tabs ? 0 : -1,
	};
}

/**
 * The edge disables natively. A running move or a finished flow does not: the
 * clicked button keeps focus, so a rejected move never drops the keyboard user
 * on <body>.
 */
export function navAttrs(dir: "next" | "prev", bits: number, disabledProp: boolean): Attrs {
	const disabled = disabledProp || !(bits & 1);
	const off = disabled || navIdle(bits);
	return {
		"data-component": `stepper-${dir}`,
		"data-pending": flag(!!(bits & 2)),
		"data-disabled": flag(off),
		disabled,
		"aria-disabled": aria(off),
	};
}

// Key -> index delta per orientation; Home/End jump to the edges.
const KEYS: Record<string, [horizontal: number, vertical: number]> = {
	ArrowRight: [1, 0],
	ArrowLeft: [-1, 0],
	ArrowDown: [0, 1],
	ArrowUp: [0, -1],
};

/** Arrow keys, Home and End between the tabs of a List. Call it after the caller's own handler. */
export function onListKeydown<S extends readonly Step[]>(
	event: KeyboardEvent,
	list: HTMLElement,
	flow: Flow<S>,
	ui: Ui,
	orientation: Orientation,
) {
	const target = event.target as HTMLElement;
	if (event.defaultPrevented || target.getAttribute?.("role") !== "tab") return;
	const horizontal = orientation === "horizontal";
	let delta = KEYS[event.key]?.[horizontal ? 0 : 1];
	if (!delta && event.key !== "Home" && event.key !== "End") return;
	// Only this instance's tabs, in DOM order: nested lists stay correct.
	const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]')).filter((tab) => tab.id.startsWith(ui.id));
	const from = tabs.indexOf(target);
	if (from === -1) return;
	// Left and right swap in right-to-left layouts.
	if (delta && horizontal && getComputedStyle(list).direction === "rtl") delta = -delta;
	const last = tabs.length - 1;
	const tab =
		tabs[event.key === "Home" ? 0 : event.key === "End" ? last : Math.min(last, Math.max(0, from + (delta ?? 0)))];
	event.preventDefault();
	const id = tab.dataset.step as Id<S>;
	if (tab === target || !flow.canGoTo(id)) return;
	void flow.goTo(id).then((result) => {
		if (result.accepted) tab.focus();
	});
}

/** Was focus in this stepper? Read it before the framework touches the DOM for a step change. */
export const focusInside = (root: Element | null | undefined) => !!root?.contains(root.ownerDocument.activeElement);

/**
 * What a step change needs beyond rendering, for people who cannot see it.
 * Call it once the DOM shows the new step.
 *
 * - Focus falls back to <body> when its element unmounts (a field in the old
 *   panel, a button that is replaced) or becomes disabled. Hand it to the new
 *   panel instead of stranding keyboard users. Focus that was elsewhere
 *   (`inside` is false) is never moved.
 * - Pressing Next changes the page silently for screen readers. Announce the
 *   new step by its own `title`: your words, so there is nothing to translate.
 */
export function stepChanged(
	root: Element | null | undefined,
	region: Element | null | undefined,
	step: Step,
	ui: Ui,
	inside: boolean,
) {
	const doc = root?.ownerDocument;
	if (!doc) return;
	let active = doc.activeElement as HTMLButtonElement | null;
	if (inside && (!active || active === doc.body || active.disabled)) {
		active = doc.getElementById(panelId(ui, step.id)) as HTMLButtonElement | null;
		active?.focus();
	}
	// A focused trigger or panel already reads the step.
	const reads = active?.id.startsWith(ui.id) && active.dataset.step === step.id;
	const title = (step as { title?: unknown }).title;
	if (region) region.textContent = !reads && typeof title === "string" ? title : "";
}

/** Development only: a trigger needs a name and a List around it. */
export function checkTrigger(node: Element, step: string) {
	if (process.env.NODE_ENV === "production") return;
	if (!(node.textContent?.trim() || node.getAttribute("aria-label") || node.getAttribute("aria-labelledby"))) {
		warn("SZ002", `Stepper.Trigger for step "${step}" has no accessible name. Render text or pass aria-label.`);
	}
	if (!node.closest('[data-component="stepper-list"]')) {
		warn("SZ003", `Stepper.Trigger for step "${step}" is outside Stepper.List.`);
	}
}
