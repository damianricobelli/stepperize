// The primitives without a framework: bind a flow to HTML that is already on
// the page. For server-rendered markup (Rails, Laravel, Django, Astro, a static
// file) and for libraries such as Alpine and htmx that enhance it.
//
// Nothing here touches the DOM until `bindStepper` is called, so the module is
// safe to import on a server.

import { fail } from "./dev";
import {
	type Attrs,
	checkTrigger,
	contentAttrs,
	focusInside,
	HIDDEN,
	indicatorAttrs,
	itemAttrs,
	itemBits,
	itemValue,
	listAttrs,
	navAttrs,
	navBits,
	navIdle,
	type Orientation,
	onListKeydown,
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	type Ui,
} from "./primitives";
import type { Flow, Id, Step } from "./types";

export type BindOptions = {
	/**
	 * Render the flow as an ordered list of steps instead of tabs. Pass what
	 * you passed to `createStepper`. Defaults to the root's `data-linear`
	 * attribute.
	 */
	linear?: boolean;
	/** Defaults to the root's `data-orientation` attribute, then `"horizontal"`. */
	orientation?: Orientation;
};

/** The parts a stepper is made of, as `data-component` values. The same names the framework primitives render. */
const PART = (name: string) => `[data-component="stepper-${name}"]`;

let roots = 0;

/** Set what a primitive computed. `undefined` and `false` remove the attribute; `true` is a bare attribute. */
function apply(element: Element, attrs: Attrs) {
	for (const name in attrs) {
		const value = attrs[name];
		if (value === undefined || value === false) element.removeAttribute(name);
		else {
			const text = value === true ? "" : String(value);
			// Leave untouched attributes alone, so an observer on the page only sees real changes.
			if (element.getAttribute(name) !== text) element.setAttribute(name, text);
		}
	}
}

/**
 * Make server-rendered markup a stepper: roles, ids, `data-state`, keyboard
 * navigation, focus hand-off and announcements, kept in sync with the flow.
 * Returns a function that undoes the binding.
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
	const doc = root.ownerDocument;
	const steps = flow.steps;
	const positions = new Map(steps.map((step, index) => [step.id as string, index]));
	const linear = options.linear ?? root.hasAttribute("data-linear");
	const orientation: Orientation =
		options.orientation ?? (root.getAttribute("data-orientation") === "vertical" ? "vertical" : "horizontal");
	// The root's own id keeps ids stable across page loads; otherwise one is made up per binding.
	const ui: Ui = { id: `${root.id || `sz${++roots}`}-`, orientation, tabs: !linear };
	// Named by the page if it says so; otherwise by the default every binding uses.
	const named = root.hasAttribute("aria-label") || root.hasAttribute("aria-labelledby");

	/** Elements of this stepper only: a stepper nested in a panel owns its own parts. */
	const parts = <E extends HTMLElement = HTMLElement>(name: string) =>
		Array.from(root.querySelectorAll<E>(PART(name))).filter(
			(element) => element.closest('[data-component="stepper"]') === root,
		);
	const owned = (target: EventTarget | null, name: string) => {
		const element = (target as Element | null)?.closest?.<HTMLElement>(PART(name));
		return element && element.closest('[data-component="stepper"]') === root ? element : null;
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

	const region = doc.createElement("span");
	region.setAttribute("aria-live", "polite");
	region.setAttribute("style", HIDDEN);
	root.append(region);

	/** Steps that were unreachable before the running move started: see `triggerAttrs`. */
	const blocked = new Map<string, boolean>();
	const checked = new WeakSet<Element>();

	function render() {
		const view = flow.get();
		const triggers = parts<HTMLButtonElement>("trigger");
		// A flow without triggers is not a set of tabs.
		ui.tabs = !linear && triggers.length > 0;
		const attrs = rootAttrs(orientation, statusBits(view));
		if (named) delete attrs["aria-label"];
		apply(root, attrs);
		for (const list of parts("list")) {
			apply(list, listAttrs(ui, (list.getAttribute("data-orientation") as Orientation | null) ?? orientation));
		}
		const item = (step: S[number]) =>
			itemValue<S>(step, positions.get(step.id) ?? -1, itemBits(view, step.id as Id<S>));
		for (const element of parts("item")) {
			const step = stepOf(element);
			if (step) apply(element, itemAttrs(item(step), ui.tabs && !!element.closest(PART("list"))));
		}
		for (const element of triggers) {
			const step = stepOf(element);
			if (!step) continue;
			const value = item(step);
			if (!value.pending) blocked.set(step.id, value.disabled);
			apply(element, {
				type: element.tagName === "BUTTON" ? (element.getAttribute("type") ?? "button") : undefined,
				...triggerAttrs(ui, value, !!blocked.get(step.id), steps.length),
			});
			if (!checked.has(element)) {
				checked.add(element);
				checkTrigger(element, step.id);
			}
		}
		for (const element of parts("indicator")) {
			const step = stepOf(element);
			if (step) apply(element, indicatorAttrs(item(step)));
		}
		for (const field of ["title", "description"] as const) {
			for (const element of parts(field)) {
				// Written by the server in most pages; filled in from the step when left empty.
				const text = (stepOf(element, false) as Record<string, unknown> | undefined)?.[field];
				if (!element.childNodes.length && typeof text === "string") element.textContent = text;
			}
		}
		for (const element of parts("content")) {
			const step = stepOf(element);
			if (step) apply(element, contentAttrs(ui, step, view.current.id === step.id));
		}
		for (const dir of ["prev", "next"] as const) {
			for (const element of parts<HTMLButtonElement>(dir)) {
				apply(element, {
					type: element.tagName === "BUTTON" ? (element.getAttribute("type") ?? "button") : undefined,
					...navAttrs(dir, navBits(view, dir), false),
				});
			}
		}
	}

	let index = flow.get().index;
	const update = () => {
		const next = flow.get().index;
		// Read before the panels change: was focus in this stepper?
		const inside = next !== index && focusInside(root);
		render();
		if (next !== index) {
			index = next;
			stepChanged(root, region, flow.get().current, ui, inside);
		}
	};

	const onClick = (event: MouseEvent) => {
		if (event.defaultPrevented) return;
		const trigger = owned(event.target, "trigger");
		if (trigger) {
			const step = stepOf(trigger);
			if (step && !flow.get().isPending) void flow.goTo(step.id as Id<S>);
			return;
		}
		for (const dir of ["next", "prev"] as const) {
			if (!owned(event.target, dir)) continue;
			// A rejecting `onFinish` rejects `next()`: the error belongs to `onFinish`, which reports it.
			if (!navIdle(navBits(flow.get(), dir))) flow[dir]().catch(() => {});
			return;
		}
	};
	const onKeydown = (event: KeyboardEvent) => {
		const list = owned(event.target, "list");
		if (list) {
			onListKeydown(
				event,
				list,
				flow,
				ui,
				(list.getAttribute("data-orientation") as Orientation | null) ?? orientation,
			);
		}
	};

	// A handler on the page runs first when it is registered on the element itself, and can `preventDefault()`.
	root.addEventListener("click", onClick);
	root.addEventListener("keydown", onKeydown);
	const unsubscribe = flow.subscribe(update);
	// Markup swapped in later (htmx, Alpine, Turbo) becomes part of the stepper without another call.
	const observer = new MutationObserver((records) => {
		if (records.some((record) => record.target !== region)) render();
	});
	observer.observe(root, { childList: true, subtree: true });
	const unbind = () => {
		observer.disconnect();
		unsubscribe();
		root.removeEventListener("click", onClick);
		root.removeEventListener("keydown", onKeydown);
		region.remove();
	};
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
