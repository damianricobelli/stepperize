import { type Code, fail, type Id, type Options, type Step, type StepOf, type Stepper, warn } from "@stepperize/core";
import {
	type Attrs,
	checkTrigger,
	contentAttrs,
	focusInside,
	type ItemValue,
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
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	type Ui,
} from "@stepperize/core/primitives";
import { noChange, type ReactiveControllerHost } from "lit";
import { AsyncDirective } from "lit/async-directive.js";
import { type DirectiveResult, directive, type ElementPart, type PartInfo, PartType } from "lit/directive.js";
import { type ControllerSource, StepperController } from "./controller";

type Kind = "root" | "list" | "item" | "trigger" | "indicator" | "content" | "prev" | "next";
type Part = { kind: Kind; step?: string; orientation?: Orientation; disabled?: boolean };
type AnyPrimitives = StepperPrimitives<readonly Step[]>;

/** What an element directive of this package returns: put it in an opening tag. */
export type PartResult = DirectiveResult;

/** A step as its item sees it, with `step` typed by the id you asked for. */
export type StepItem<S extends readonly Step[], I extends Id<S> = Id<S>> = Omit<ItemValue<S>, "step"> & {
	step: StepOf<S, I>;
};

/**
 * Where a value you write wins over the stepper's. On the structure (root,
 * list, item, panel, indicator) your name, role and tab stop are kept, as a
 * prop does in React. On the controls (trigger, Back, Next) the stepper's ARIA
 * wins, because it is what makes them work; only your `type` is kept.
 */
const STRUCTURE = new Set(["role", "aria-label", "aria-labelledby", "tabindex", "type"]);
const CONTROL = new Set(["type"]);

/**
 * The attributes of one element, split between the stepper and you. The
 * stepper only removes what it set itself; a value of yours that it replaced
 * comes back when it stops setting one. `disabled` and `hidden` therefore add
 * up: yours, or the stepper's.
 */
class Attributes {
	/** What the stepper wrote, as it wrote it. */
	#mine = new Map<string, string>();
	/** What you wrote: in the template, with a binding, or by hand. */
	#theirs = new Map<string, string>();

	constructor(readonly element: Element) {}

	/** Your value: one that is on the element and that the stepper did not write. */
	theirs(name: string): string | undefined {
		const current = this.element.getAttribute(name);
		if (current === null) {
			this.#theirs.delete(name);
			this.#mine.delete(name);
		} else if (current !== this.#mine.get(name)) {
			this.#theirs.set(name, current);
			this.#mine.delete(name);
		}
		return this.#theirs.get(name);
	}

	write(attrs: Attrs, wins: ReadonlySet<string>) {
		const names = new Set([...Object.keys(attrs), ...this.#mine.keys()]);
		for (const name of names) {
			const theirs = this.theirs(name);
			const value = attrs[name];
			const computed = value === undefined || value === false ? undefined : value === true ? "" : String(value);
			const next = wins.has(name) ? (theirs ?? computed) : (computed ?? theirs);
			const current = this.element.getAttribute(name);
			// Leave untouched attributes alone, so an observer on the page only sees real changes.
			if (next === undefined) {
				if (current !== null) this.element.removeAttribute(name);
			} else if (current !== next) this.element.setAttribute(name, next);
			if (next === undefined || next === theirs) this.#mine.delete(name);
			else this.#mine.set(name, next);
		}
	}
}

/** The event as `list` sees it: with `target` in the list's own tree when the event crossed a shadow root. */
function seenFrom(event: KeyboardEvent, list: Element): KeyboardEvent {
	const scope = list.getRootNode();
	const target = event.composedPath().find((node) => (node as Node).getRootNode?.() === scope);
	if (!target || target === event.target) return event;
	return new Proxy(event, {
		get: (original, key) => {
			if (key === "target") return target;
			const value = original[key as keyof KeyboardEvent];
			return typeof value === "function" ? value.bind(original) : value;
		},
	});
}

/** `<button>` defaults to submitting its form: a stepper button never should. */
const button = (element: Element) => (element.tagName === "BUTTON" ? "button" : undefined);

/** Called by the directives, which live outside the class: set in its static block, so they are not public API. */
let attach!: (owner: AnyPrimitives, element: Element, part: Part) => void;
let detach!: (owner: AnyPrimitives, element: Element) => void;

let controllers = 0;

/**
 * The controller plus the primitives, as element directives: each one puts the
 * roles, ids, `data-*` attributes and handlers of a stepper part on an element
 * of your own template. Step ids are typed with the steps of the definition.
 *
 * @example
 * render() {
 *   const s = this.stepper;
 *   return html`
 *     <div ${s.root()}>
 *       <ol ${s.list()}>
 *         ${s.steps.map((step) => html`
 *           <li ${s.item(step.id)}><button ${s.trigger(step.id)}>${step.title}</button></li>
 *         `)}
 *       </ol>
 *       <div ${s.content("shipping")}>…</div>
 *       <button ${s.prev()}>Back</button>
 *       <button ${s.next()}>Continue</button>
 *     </div>
 *   `;
 * }
 */
export class StepperPrimitives<S extends readonly Step[]> extends StepperController<S> {
	static {
		attach = (owner, element, part) => owner.#attach(element, part);
		detach = (owner, element) => owner.#detach(element);
	}

	#positions: Map<string, number>;
	#ui: Ui = { id: `sz${++controllers}-`, orientation: "horizontal", tabs: false };
	#root?: HTMLElement;
	#region?: HTMLSpanElement;
	#parts = new Map<Element, Part>();
	#attributes = new WeakMap<Element, Attributes>();
	/** Steps that were unreachable before the running move started: see `triggerAttrs`. */
	#blocked = new Map<string, boolean>();
	/** The step the page last showed, to tell a step change from any other update. */
	#index?: number;
	/** The flow `#index` belongs to: a new flow is a new page, not a step change. */
	#shown?: unknown;
	/** Between `hostUpdate` and `hostUpdated`: parts recorded now are painted by this update. */
	#updating = false;
	#inside = false;
	#destroyed = false;
	/** A repaint is queued for parts that arrived outside an update. */
	#scheduled = false;
	#checked = new WeakSet<Element>();

	constructor(host: ReactiveControllerHost, steps: S, defaults: Options<S>, source?: ControllerSource<S>) {
		super(host, steps, defaults, source);
		this.#positions = new Map(steps.map((step, index) => [step.id as string, index]));
	}

	/** The element that holds the stepper: a group, busy while a move runs. One per controller. */
	root(options: { orientation?: Orientation } = {}): PartResult {
		return part(this, { kind: "root", orientation: options.orientation });
	}
	/** The list of steps: a tablist when the flow is not linear and has triggers. Handles arrow keys. */
	list(options: { orientation?: Orientation } = {}): PartResult {
		return part(this, { kind: "list", orientation: options.orientation });
	}
	/** One step in the list. */
	item(step: Id<S>): PartResult {
		return part(this, { kind: "item", step });
	}
	/** A button that goes to its step. `disabled` adds to what the flow decides. */
	trigger(step: Id<S>, options: { disabled?: boolean } = {}): PartResult {
		return part(this, { kind: "trigger", step, disabled: options.disabled });
	}
	/** A decorative mark for a step: hidden from assistive technology, styled through `data-state`. */
	indicator(step: Id<S>): PartResult {
		return part(this, { kind: "indicator", step });
	}
	/** The panel of a step: `hidden` unless its step is current. */
	content(step: Id<S>): PartResult {
		return part(this, { kind: "content", step });
	}
	/** A button that goes back to the step you came from. `disabled` adds to what the flow decides. */
	prev(options: { disabled?: boolean } = {}): PartResult {
		return part(this, { kind: "prev", disabled: options.disabled });
	}
	/** A button that validates the current step and moves on; on the last step it finishes the flow. */
	next(options: { disabled?: boolean } = {}): PartResult {
		return part(this, { kind: "next", disabled: options.disabled });
	}

	/** A step as an item sees it: its state and whether it can be reached. For your own markup. */
	at<I extends Id<S>>(step: I): StepItem<S, I> {
		const value = itemValue<S>(this.#step(step), this.#positions.get(step) ?? -1, itemBits(this.flow.get(), step));
		return value as StepItem<S, I>;
	}

	#step(id: string): S[number] {
		return this.steps[this.#positions.get(id) ?? -1] ?? fail("SZ102", `Step "${id}" not found.`);
	}

	/**
	 * Called by the directive on every render of its template. It records the part; attributes are
	 * written once the whole template is in place, because they depend on each other (an item is
	 * presentational inside a tablist, and a tablist needs triggers).
	 */
	#attach(element: Element, next: Part) {
		if (this.#destroyed) return;
		const arriving = !this.#parts.has(element);
		this.#parts.set(element, next);
		if (next.kind === "root") {
			if (this.#root && this.#root !== element) this.#detach(this.#root);
			if (this.#root !== element) {
				this.#root = element as HTMLElement;
				this.#root.addEventListener("click", this.#onClick);
				this.#root.addEventListener("keydown", this.#onKeydown);
				this.#region = liveRegion(element.ownerDocument);
				element.append(this.#region);
			}
			this.#ui.orientation = next.orientation ?? "horizontal";
		}
		// A part that arrives outside an update of the host (a child component, `until`, anything
		// that renders later) is painted once the template it is in is complete. Without asking the
		// host to render again: a template that makes a new promise for `until` on every render
		// would then never settle.
		if (arriving && !this.#updating && !this.#scheduled) {
			this.#scheduled = true;
			queueMicrotask(() => {
				this.#scheduled = false;
				if (!this.#destroyed) this.#paintAll(this.flow.get());
			});
		}
	}

	/** Called by the directive when its element leaves the template, or the host is disconnected. */
	#detach(element: Element) {
		this.#parts.delete(element);
		if (element !== this.#root) return;
		element.removeEventListener("click", this.#onClick as EventListener);
		element.removeEventListener("keydown", this.#onKeydown as EventListener);
		this.#region?.remove();
		this.#root = this.#region = undefined;
	}

	#paint(element: Element, { kind, step: id, orientation, disabled }: Part) {
		const view = this.flow.get();
		const ui = this.#ui;
		const attributes = this.#attributes.get(element) ?? new Attributes(element);
		this.#attributes.set(element, attributes);
		// Your own `disabled` adds to the directive's option and to what the flow decides.
		const off = () => !!disabled || attributes.theirs("disabled") !== undefined;
		let attrs: Attrs;
		if (kind === "root") attrs = rootAttrs(ui.orientation, statusBits(view));
		else if (kind === "list") attrs = listAttrs(ui, orientation ?? ui.orientation);
		else if (kind === "prev" || kind === "next") {
			attrs = { type: button(element), ...navAttrs(kind, navBits(view, kind), off()) };
		} else {
			const step = this.#step(id ?? "");
			if (kind === "content") attrs = contentAttrs(ui, step, view.current.id === step.id);
			else {
				const item = this.at(step.id as Id<S>);
				if (kind === "item") attrs = itemAttrs(item, ui.tabs && this.#inList(element));
				else if (kind === "indicator") attrs = indicatorAttrs(item);
				else {
					if (!item.pending) this.#blocked.set(step.id, item.disabled);
					attrs = {
						type: button(element),
						...triggerAttrs(ui, item, off() || !!this.#blocked.get(step.id), this.steps.length),
					};
				}
			}
		}
		const control = kind === "trigger" || kind === "prev" || kind === "next";
		// A name of yours replaces the stepper's, both ways of naming included.
		if (!control && (attributes.theirs("aria-label") ?? attributes.theirs("aria-labelledby")) !== undefined) {
			attrs["aria-label"] = attrs["aria-labelledby"] = undefined;
		}
		attributes.write(attrs, control ? CONTROL : STRUCTURE);
	}

	#inList(element: Element) {
		for (const [other, { kind }] of this.#parts) if (kind === "list" && other.contains(element)) return true;
		return false;
	}

	/** The part an event came from: the closest marked element, as long as it belongs to this controller. */
	#from(event: Event): [Element, Part] | undefined {
		for (const node of event.composedPath()) {
			if (node === this.#root) return;
			const found = this.#parts.get(node as Element);
			if (found) return [node as Element, found];
		}
	}

	// Listening on the root means a handler of your own on the button (`@click`) runs first and can `preventDefault()`.
	#onClick = (event: MouseEvent) => {
		const found = this.#from(event);
		if (!found || event.defaultPrevented) return;
		const [element, { kind, step, disabled }] = found;
		// A native `disabled` stops a button by itself; a link or a div needs this.
		if (disabled || element.hasAttribute("disabled")) return;
		const view = this.flow.get();
		if (kind === "trigger" && step && !view.isPending) void this.flow.goTo(step as Id<S>);
		// A rejecting `onFinish` rejects `next()`: the error belongs to `onFinish`, which reports it.
		else if ((kind === "next" || kind === "prev") && !navIdle(navBits(view, kind))) this.flow[kind]().catch(() => {});
	};

	#onKeydown = (event: KeyboardEvent) => {
		const path = event.composedPath();
		for (const [element, { kind, orientation }] of this.#parts) {
			if (kind !== "list" || !path.includes(element)) continue;
			// A list rendered by a child component sees the key from inside its own shadow root.
			onListKeydown(
				seenFrom(event, element),
				element as HTMLElement,
				this.flow,
				this.#ui,
				orientation ?? this.#ui.orientation,
			);
			return;
		}
	};

	override hostConnected() {
		// A host that was moved shows the step it showed before: nothing to announce. (Lit connects a
		// controller added to a connected host from inside its constructor, before these fields exist.)
		if (#index in this) this.#index = undefined;
		super.hostConnected();
	}

	override hostUpdate() {
		super.hostUpdate();
		this.#updating = true;
		const flow = this.flow;
		const { index } = flow.get();
		if (flow !== this.#shown) {
			this.#shown = flow;
			this.#index = undefined;
			this.#blocked.clear();
		}
		this.#index ??= index;
		// Read before Lit touches the DOM: was focus in this stepper?
		this.#inside = index !== this.#index && focusInside(this.#root);
	}

	hostUpdated() {
		this.#updating = false;
		const root = this.#root;
		const region = this.#region;
		if (!root && this.#parts.size) {
			fail("SZ100", "Missing root. Put the `root()` directive on the element that contains the other parts.");
		}
		const view = this.flow.get();
		this.#paintAll(view);
		if (view.index !== this.#index) {
			this.#index = view.index;
			stepChanged(root, region, view.current, this.#ui, this.#inside);
		} else if (view.isFinished && region?.textContent) {
			// Nothing left to announce: the last title would otherwise stay in the page for reading modes.
			region.textContent = "";
		}
	}

	#paintAll(view: Stepper<S>) {
		// A child expression that ends right at the root's closing tag clears everything after
		// itself when it changes, the live region included: put it back.
		if (this.#root && this.#region && this.#region.parentNode !== this.#root) this.#root.append(this.#region);
		// Tabs need triggers: count the ones the template has now. `isLinear` comes from the flow,
		// so a controller that follows a flow owned elsewhere knows it too.
		let triggers = 0;
		for (const { kind } of this.#parts.values()) if (kind === "trigger") triggers++;
		this.#ui.tabs = !view.isLinear && triggers > 0;
		for (const [element, value] of this.#parts) {
			this.#paint(element, value);
			if (process.env.NODE_ENV !== "production" && !this.#checked.has(element)) {
				this.#checked.add(element);
				if (value.kind === "trigger") checkTrigger(element, value.step ?? "");
				this.#checkScope(element, value);
			}
		}
	}

	/**
	 * Development only. Ids do not cross shadow roots: a panel the root cannot find by id gets no
	 * focus when its step opens, and a tab and a panel in different roots cannot name each other.
	 */
	#checkScope(element: Element, { kind, step }: Part) {
		const root = this.#root;
		if (!root || element.getRootNode() === root.getRootNode()) return;
		// A trigger is referred to by id as a tab, or when it names a panel whose step has no title.
		const named = typeof (this.steps[this.#positions.get(step ?? "") ?? -1] as { title?: unknown })?.title === "string";
		if (kind !== "content" && !(kind === "trigger" && (this.#ui.tabs || !named))) return;
		warn(
			"SZ004" as Code,
			`The ${kind}() part of step "${step}" is rendered in a different shadow root than root(), so the ids ` +
				"that tie triggers, panels and focus together cannot reach it. Render triggers and panels in the " +
				"same shadow root as root(); a child component can render the other parts.",
		);
	}

	/**
	 * End this controller: everything `StepperController.destroy` does, and its parts stop
	 * listening. The attributes stay on the elements until your template removes them.
	 */
	override destroy() {
		this.#destroyed = true;
		if (this.#root) this.#detach(this.#root);
		this.#parts.clear();
		super.destroy();
	}
}

class PartDirective extends AsyncDirective {
	#element?: Element;
	#owner?: AnyPrimitives;
	#value?: Part;

	constructor(info: PartInfo) {
		super(info);
		if (info.type !== PartType.ELEMENT) {
			fail("SZ001", "Stepper parts are element directives: call them inside an opening tag, next to the attributes.");
		}
	}

	render(_owner: AnyPrimitives, _part: Part) {
		return noChange;
	}

	override update(part: ElementPart, [owner, value]: [AnyPrimitives, Part]) {
		if (this.#owner && this.#owner !== owner && this.#element) detach(this.#owner, this.#element);
		this.#element = part.element;
		this.#owner = owner;
		this.#value = value;
		attach(owner, part.element, value);
		return noChange;
	}

	protected override disconnected() {
		if (this.#element && this.#owner) detach(this.#owner, this.#element);
	}

	// A part that is not rendered again after its host comes back (inside `guard` or `cache`)
	// would otherwise stay detached and stop following the flow.
	protected override reconnected() {
		if (this.#element && this.#value && this.#owner) attach(this.#owner, this.#element, this.#value);
	}
}

const partDirective = directive(PartDirective);
const part = <S extends readonly Step[]>(owner: StepperPrimitives<S>, value: Part): PartResult =>
	partDirective(owner as unknown as AnyPrimitives, value);
