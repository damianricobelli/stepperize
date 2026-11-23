// The primitives without a framework: bind a flow to HTML that is already on
// the page. For server-rendered markup (Rails, Laravel, Django, Astro, a static
// file) and for libraries such as Alpine and htmx that enhance it.
//
// Nothing here touches the DOM until `bindStepper` is called, so the module is
// safe to import on a server.

import { development, fail, warn } from "./dev";
import {
	type Attrs,
	checkTrigger,
	contentAttrs,
	focusInside,
	indicatorAttrs,
	itemAttrs,
	itemBits,
	itemValue,
	listAttrs,
	liveRegion,
	navAttrs,
	navBits,
	navIdle,
	type Orientation,
	onListKeydown,
	panelId,
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	triggerId,
	type Ui,
} from "./primitives";
import type { Flow, Id, Step } from "./types";

declare const process: { env: { NODE_ENV?: string } };

export type BindOptions = {
	/** Defaults to the root's `data-orientation` attribute, then `"horizontal"`. */
	orientation?: Orientation;
};

const ROOT = '[data-component="stepper"]';
/** The parts a stepper is made of, as `data-component` values. The same names the framework primitives render. */
const PART = (name: string) => `[data-component="stepper-${name}"]`;
const PARTS = '[data-component^="stepper-"]';
/**
 * On the root, a list, an item, a panel or an indicator, what the page wrote for
 * these wins over the binding's defaults, as props do in the framework primitives.
 */
const AUTHORED = ["role", "aria-label", "aria-labelledby", "tabindex"];

let roots = 0;

/** The binding of each root, so binding it again replaces the previous one. */
const bound = new WeakMap<HTMLElement, () => void>();

/**
 * Development builds only. Bundlers replace `process.env.NODE_ENV`; a page that
 * loads the files as published has no `process`, and gets no warnings rather
 * than a `ReferenceError`.
 */

/**
 * Make server-rendered markup a stepper: roles, ids, `data-state`, keyboard
 * navigation, focus hand-off and announcements, kept in sync with the flow.
 * Returns a function that undoes the binding: it stops following the flow and
 * puts back every attribute and text it changed.
 *
 * The markup names its parts with `data-component` and its steps with
 * `data-step`, exactly as the framework primitives render them:
 *
 * @example
 * <div data-component="stepper" id="signup">
 *   <ol data-component="stepper-list">
 *     <li data-component="stepper-item" data-step="account">
 *       <button data-component="stepper-trigger">Account</button>
 *     </li>
 *   </ol>
 *   <div data-component="stepper-content" data-step="account">…</div>
 *   <button data-component="stepper-prev">Back</button>
 *   <button data-component="stepper-next">Continue</button>
 * </div>
 *
 * const flow = createStepper([{ id: "account" }, { id: "plan" }]);
 * const unbind = bindStepper(document.getElementById("signup")!, flow);
 */
export function bindStepper<S extends readonly Step[]>(
	root: HTMLElement,
	flow: Flow<S>,
	options: BindOptions = {},
): () => void {
	// Binding twice (an init script run again by Turbo or htmx, HMR) would move two steps per click.
	bound.get(root)?.();
	const doc = root.ownerDocument;
	const steps = flow.steps;
	const positions = new Map(steps.map((step, index) => [step.id as string, index]));

	/**
	 * What the binding changed, per element and attribute: the page's value and
	 * the binding's. Unbinding puts the page's back where the binding's is still there.
	 */
	const changed = new Map<Element, Map<string, [page: string | null, ours: string | null]>>();
	/** Titles and descriptions the binding filled in, with the text it put there. */
	const filled = new Map<Element, string>();
	/** An attribute as the page wrote it, before the binding changed it. */
	const original = (element: Element, name: string) => {
		const entry = changed.get(element)?.get(name);
		return entry ? entry[0] : element.getAttribute(name);
	};
	const write = (element: Element, name: string, value: string | null) => {
		const current = element.getAttribute(name);
		// Leave untouched attributes alone, so an observer on the page only sees real changes.
		if (current === value) return;
		const entries = changed.get(element) ?? new Map<string, [string | null, string | null]>();
		changed.set(element, entries);
		const entry = entries.get(name);
		if (entry) entry[1] = value;
		else entries.set(name, [current, value]);
		if (value === null) element.removeAttribute(name);
		else element.setAttribute(name, value);
	};
	/**
	 * Set what a primitive computed. `undefined` and `false` remove the attribute; `true` is a bare attribute.
	 * `keep`: a value the page wrote wins. `restore`: when the binding has nothing to say, the page's value
	 * comes back. Everything else is state the binding owns, such as `hidden` on a panel the server wrote.
	 */
	const apply = (element: Element, attrs: Attrs, keep: readonly string[] = [], restore: readonly string[] = []) => {
		for (const name in attrs) {
			const page = original(element, name);
			if (page !== null && keep.includes(name)) continue;
			const value = attrs[name];
			write(
				element,
				name,
				value === undefined || value === false
					? restore.includes(name)
						? page
						: null
					: value === true
						? ""
						: String(value),
			);
		}
	};

	// Parts find their stepper by this attribute: a root bound without it gets it before anything else.
	write(root, "data-component", "stepper");
	const orientationOf = (element: Element, fallback: Orientation): Orientation => {
		const value = original(element, "data-orientation");
		return value === "vertical" || value === "horizontal" ? value : fallback;
	};
	const orientation = options.orientation ?? orientationOf(root, "horizontal");
	// The root's own id keeps ids stable across page loads; otherwise one is made up per binding.
	const ui: Ui = { id: `${root.id || `sz${++roots}`}-`, orientation, tabs: false };

	/** Only this stepper's elements: a stepper nested in a panel owns its own parts. */
	const owned = (target: EventTarget | null, name: string) => {
		const element = (target as Element | null)?.closest?.<HTMLElement>(PART(name));
		return element && element.closest(ROOT) === root ? element : null;
	};
	/** The step an element belongs to: its own `data-step`, or its item's. */
	const stepOf = (element: Element, required = true): S[number] | undefined => {
		const id =
			element.getAttribute("data-step") ?? element.closest(PART("item"))?.getAttribute("data-step") ?? undefined;
		const step = id === undefined ? undefined : steps[positions.get(id) ?? -1];
		if (step || !required) return step;
		return id === undefined
			? fail("SZ101", "A stepper part needs a `data-step` attribute, on itself or on its item.")
			: fail("SZ102", `Step "${id}" not found.`);
	};

	const region = liveRegion(doc);
	root.append(region);

	/** Steps that were unreachable before the running move started: see `triggerAttrs`. */
	const blocked = new Map<string, boolean>();
	const checked = new WeakSet<Element>();
	/** This stepper's trigger and panel of each step, as of the last render. Their ids may be the page's. */
	let triggers = new Map<string, HTMLElement>();
	let panels = new Map<string, HTMLElement>();

	function render() {
		const view = flow.get();
		// One query for every part, then only this stepper's.
		const parts: Record<string, HTMLElement[]> = {};
		for (const element of root.querySelectorAll<HTMLElement>(PARTS)) {
			if (element.closest(ROOT) !== root) continue;
			const name = (element.getAttribute("data-component") ?? "").slice("stepper-".length);
			const group = parts[name] ?? [];
			group.push(element);
			parts[name] = group;
		}
		const all = (name: string) => parts[name] ?? [];
		// Elements swapped out of the stepper are no longer ours to restore.
		for (const element of changed.keys()) if (element !== root && !root.contains(element)) changed.delete(element);
		for (const element of filled.keys()) if (!root.contains(element)) filled.delete(element);

		triggers = new Map();
		panels = new Map();
		for (const [name, map] of [
			["trigger", triggers],
			["content", panels],
		] as const) {
			for (const element of all(name)) {
				const step = stepOf(element);
				if (step && !map.has(step.id)) map.set(step.id, element);
			}
		}
		// The ids the page wrote, or the ones the binding makes up: references point at elements that exist.
		const idOf = (element: HTMLElement | undefined, id: string) => element && (original(element, "id") ?? id);

		// A linear flow is not a set of tabs, and neither is a flow without triggers.
		ui.tabs = !view.isLinear && triggers.size > 0;
		const rootView = rootAttrs(orientation, statusBits(view));
		// Named by the page if it says so; otherwise by the default every binding uses.
		if (original(root, "aria-labelledby") !== null) rootView["aria-label"] = undefined;
		apply(root, rootView, AUTHORED);
		for (const list of all("list")) {
			const attrs = listAttrs(ui, orientationOf(list, orientation));
			if ((original(list, "role") ?? attrs.role) !== "tablist") attrs["aria-orientation"] = undefined;
			apply(list, attrs, AUTHORED);
		}
		const item = (step: S[number]) =>
			itemValue<S>(step, positions.get(step.id) ?? -1, itemBits(view, step.id as Id<S>));
		for (const element of all("item")) {
			const step = stepOf(element);
			if (step) apply(element, itemAttrs(item(step), ui.tabs && !!element.closest(PART("list"))), AUTHORED);
		}
		for (const element of all("trigger")) {
			const step = stepOf(element);
			if (!step) continue;
			const value = item(step);
			if (!value.pending) blocked.set(step.id, value.disabled);
			const attrs = triggerAttrs(ui, value, !!blocked.get(step.id), steps.length);
			if (ui.tabs) attrs["aria-controls"] = idOf(panels.get(step.id), panelId(ui, step.id));
			if (element.tagName === "BUTTON") attrs.type = original(element, "type") ?? "button";
			apply(element, attrs, ["id"]);
			if (!checked.has(element) && development()) {
				checked.add(element);
				checkTrigger(element, step.id);
				if (element.tagName !== "BUTTON") {
					warn(
						"SZ005",
						`The trigger for step "${step.id}" is a <${element.tagName.toLowerCase()}>, not a <button>: Enter and Space do not press it and it cannot be disabled. Use a <button>.`,
					);
				}
			}
		}
		for (const element of all("indicator")) {
			const step = stepOf(element);
			if (step) apply(element, indicatorAttrs(item(step)), AUTHORED);
		}
		for (const field of ["title", "description"] as const) {
			for (const element of all(field)) {
				// Written by the server in most pages; filled in from the step when left empty.
				const text = (stepOf(element, false) as Record<string, unknown> | undefined)?.[field];
				if (!element.childNodes.length && typeof text === "string") {
					element.textContent = text;
					filled.set(element, text);
				}
			}
		}
		for (const element of all("content")) {
			const step = stepOf(element);
			if (!step) continue;
			const attrs = contentAttrs(ui, step, view.current.id === step.id);
			if (original(element, "aria-label") !== null || original(element, "aria-labelledby") !== null) {
				// Named by the page: neither of the binding's names.
				attrs["aria-label"] = attrs["aria-labelledby"] = undefined;
			} else if (attrs["aria-labelledby"] !== undefined) {
				// Named by its trigger, if the step has one; otherwise by its title.
				const trigger = triggers.get(step.id);
				const title = (step as { title?: unknown }).title;
				attrs["aria-labelledby"] = idOf(trigger, triggerId(ui, step.id));
				if (!trigger) attrs["aria-label"] = typeof title === "string" ? title : undefined;
			}
			apply(element, attrs, ["id", ...AUTHORED]);
		}
		for (const dir of ["prev", "next"] as const) {
			for (const element of all(dir)) {
				// There is always somewhere to go next (or the finish), so the binding never disables Next
				// natively: a `disabled` on it is the page's, read on every render like a `disabled` prop.
				const attrs = navAttrs(dir, navBits(view, dir), dir === "next" && element.hasAttribute("disabled"));
				// So is `aria-disabled="true"`: disabled, but still focusable.
				if (original(element, "aria-disabled") === "true") {
					attrs["aria-disabled"] = "true";
					attrs["data-disabled"] = "";
				}
				if (element.tagName === "BUTTON") attrs.type = original(element, "type") ?? "button";
				apply(element, attrs, [], ["aria-disabled"]);
			}
		}
	}

	let index = flow.get().index;
	/**
	 * After the first render, bad markup (a `data-step` that is not in the flow, swapped in
	 * later) is reported, not thrown: this runs inside the flow's notification, and throwing
	 * there would reject the move that caused it and skip every other subscriber.
	 */
	const safe = () => {
		try {
			render();
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: the one way left to report it without breaking the flow.
			console.error(error);
		}
	};

	/** Focus hand-off and announcement once the DOM shows the new step. */
	const shown = (step: S[number], inside: boolean) => {
		stepChanged(root, region, step, ui, inside);
		// `stepChanged` finds the panel, and recognises a focused trigger or panel, by the ids the binding
		// makes up. A panel or trigger with an id the page wrote is handled here.
		const panel = panels.get(step.id);
		const scope = root.getRootNode() as Document | ShadowRoot;
		let active = scope.activeElement as HTMLButtonElement | null | undefined;
		if (
			inside &&
			panel &&
			panel.id !== panelId(ui, step.id) &&
			(!active || active === doc.body || active.disabled || active.closest("[hidden]"))
		) {
			panel.focus();
			active = panel as HTMLButtonElement;
		}
		if (active && (active === panel || active === triggers.get(step.id))) region.textContent = "";
	};

	/** A render the page's changes asked for, run once for a burst of them. */
	let queued = false;
	const update = () => {
		const next = flow.get().index;
		// Read before the panels change: was focus in this stepper?
		const inside = next !== index && focusInside(root);
		queued = false;
		safe();
		if (next !== index) {
			index = next;
			shown(flow.get().current, inside);
		}
	};

	const onClick = (event: MouseEvent) => {
		if (event.defaultPrevented) return;
		const trigger = owned(event.target, "trigger");
		if (trigger) {
			const step = stepOf(trigger, false);
			// `aria-disabled`: a move is running, or the step cannot be reached.
			if (step && trigger.getAttribute("aria-disabled") !== "true" && !flow.get().isPending) {
				void flow.goTo(step.id as Id<S>);
			}
			return;
		}
		for (const dir of ["next", "prev"] as const) {
			const button = owned(event.target, dir);
			if (!button) continue;
			// A rejecting `onFinish` rejects `next()`: the error belongs to `onFinish`, which reports it.
			if (button.getAttribute("aria-disabled") !== "true" && !navIdle(navBits(flow.get(), dir))) {
				flow[dir]().catch(() => {});
			}
			return;
		}
	};
	const onKeydown = (event: KeyboardEvent) => {
		const list = owned(event.target, "list");
		if (!list) return;
		// The shared handler recognises this stepper's tabs by the id prefix the binding makes up, which a
		// tab with the page's own id lacks. Unless another stepper's tabs are in this list, all are ours.
		const ours = Array.from(list.querySelectorAll('[role="tab"]')).every((tab) => tab.closest(ROOT) === root);
		onListKeydown(event, list, flow, ours ? { ...ui, id: "" } : ui, orientationOf(list, orientation));
	};

	/**
	 * Does a change on the page concern this stepper? Only parts of its own: text, fields and
	 * other elements do not, and neither does anything inside a nested stepper.
	 */
	const concerns = (record: MutationRecord) => {
		const target = record.target as Element;
		// The page's `disabled` on Next is read on every render.
		if (record.type === "attributes") return target.matches(PART("next")) && target.closest(ROOT) === root;
		if (target === region) return false;
		// A removed node's parts belonged to the stepper of the node it was removed from.
		const owner = root.contains(target) ? target.closest(ROOT) : root;
		for (const node of [...record.addedNodes, ...record.removedNodes]) {
			if (node.nodeType !== 1) continue;
			const element = node as Element;
			const found = element.matches(PARTS) ? [element] : [];
			for (const part of [...found, ...element.querySelectorAll(PARTS)]) {
				if ((part.closest(ROOT) ?? owner) === root) return true;
			}
		}
		return false;
	};

	// A handler on the page runs first when it is registered on the element itself, and can `preventDefault()`.
	root.addEventListener("click", onClick);
	root.addEventListener("keydown", onKeydown);
	const unsubscribe = flow.subscribe(update);
	// Markup swapped in later (htmx, Alpine, Turbo) becomes part of the stepper without another call.
	const observer = new MutationObserver((records) => {
		if (queued || !records.some(concerns)) return;
		queued = true;
		queueMicrotask(() => {
			if (!queued) return;
			queued = false;
			safe();
		});
	});
	observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });

	let done = false;
	const unbind = () => {
		if (done) return;
		done = true;
		if (bound.get(root) === unbind) bound.delete(root);
		queued = false;
		observer.disconnect();
		unsubscribe();
		root.removeEventListener("click", onClick);
		root.removeEventListener("keydown", onKeydown);
		region.remove();
		// Put back what the page had, wherever the binding's value is still there.
		for (const [element, entries] of changed) {
			for (const [name, [page, ours]] of entries) {
				if (element.getAttribute(name) !== ours) continue;
				if (page === null) element.removeAttribute(name);
				else element.setAttribute(name, page);
			}
		}
		for (const [element, text] of filled) if (element.textContent === text) element.textContent = "";
		changed.clear();
		filled.clear();
	};
	bound.set(root, unbind);
	try {
		render();
	} catch (error) {
		// Markup the flow cannot be bound to (SZ101, SZ102): leave nothing behind,
		// or every later move of the flow would throw the same error.
		unbind();
		throw error;
	}
	return unbind;
}
