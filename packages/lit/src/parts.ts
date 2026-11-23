import { type Flow, fail, type Id, type Options, type Step } from "@stepperize/core";
import {
	type Attrs,
	checkTrigger,
	contentAttrs,
	focusInside,
	HIDDEN,
	type ItemValue,
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
} from "@stepperize/core/primitives";
import { noChange, type ReactiveControllerHost } from "lit";
import { AsyncDirective } from "lit/async-directive.js";
import { type DirectiveResult, directive, type ElementPart, type PartInfo, PartType } from "lit/directive.js";
import { type ControllerOptions, StepperController } from "./controller";

type Kind = "root" | "list" | "item" | "trigger" | "indicator" | "content" | "prev" | "next";
type Part = { kind: Kind; step?: string; orientation?: Orientation; disabled?: boolean };

/** What an element directive of this package returns: put it in an opening tag. */
export type PartResult = DirectiveResult<typeof PartDirective>;

let controllers = 0;

/** Set what a primitive computed. `undefined` and `false` remove the attribute; `true` is a bare attribute. */
function apply(element: Element, attrs: Attrs) {
	for (const name in attrs) {
		const value = attrs[name];
		if (value === undefined || value === false) element.removeAttribute(name);
		else {
			const text = value === true ? "" : String(value);
			if (element.getAttribute(name) !== text) element.setAttribute(name, text);
		}
	}
}

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
	#positions: Map<string, number>;
	#ui: Ui = { id: `sz${++controllers}-`, orientation: "horizontal", tabs: false };
	#root?: HTMLElement;
	#region?: HTMLSpanElement;
	#parts = new Map<Element, Part>();
	/** Steps that were unreachable before the running move started: see `triggerAttrs`. */
	#blocked = new Map<string, boolean>();
	#index?: number;
	#inside = false;
	#checked = new WeakSet<Element>();

	constructor(host: ReactiveControllerHost, steps: S, defaults: Options<S>, source?: ControllerOptions<S> | Flow<S>) {
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
	/** A button that goes to its step. */
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
	/** A button that goes back to the step you came from. */
	prev(options: { disabled?: boolean } = {}): PartResult {
		return part(this, { kind: "prev", disabled: options.disabled });
	}
	/** A button that validates the current step and moves on; on the last step it finishes the flow. */
	next(options: { disabled?: boolean } = {}): PartResult {
		return part(this, { kind: "next", disabled: options.disabled });
	}

	/** A step as an item sees it: its state and whether it can be reached. For your own markup. */
	at(step: Id<S>): ItemValue<S> {
		return itemValue<S>(this.#step(step), this.#positions.get(step) ?? -1, itemBits(this.flow.get(), step));
	}

	#step(id: string): S[number] {
		return this.steps[this.#positions.get(id) ?? -1] ?? fail("SZ102", `Step "${id}" not found.`);
	}

	#linear() {
		return !!this.options.linear;
	}

	/**
	 * @internal Called by the directive on every render of the host. It only records the part: attributes
	 * are written once the whole template is in place, because they depend on each other (an item is
	 * presentational inside a tablist, and a tablist needs triggers).
	 */
	_attach(element: Element, next: Part) {
		this.#parts.set(element, next);
		if (next.kind === "root") {
			if (this.#root && this.#root !== element) this._detach(this.#root);
			if (this.#root !== element) {
				this.#root = element as HTMLElement;
				this.#root.addEventListener("click", this.#onClick);
				this.#root.addEventListener("keydown", this.#onKeydown);
				this.#region = element.ownerDocument.createElement("span");
				this.#region.setAttribute("aria-live", "polite");
				this.#region.setAttribute("style", HIDDEN);
				element.append(this.#region);
			}
			this.#ui.orientation = next.orientation ?? "horizontal";
		}
	}

	/** @internal Called by the directive when its element leaves the template. */
	_detach(element: Element) {
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
		if (kind === "root") return apply(element, rootAttrs(ui.orientation, statusBits(view)));
		if (kind === "list") return apply(element, listAttrs(ui, orientation ?? ui.orientation));
		if (kind === "prev" || kind === "next") {
			return apply(element, {
				type: element.tagName === "BUTTON" ? (element.getAttribute("type") ?? "button") : undefined,
				...navAttrs(kind, navBits(view, kind), !!disabled),
			});
		}
		const step = this.#step(id ?? "");
		if (kind === "content") return apply(element, contentAttrs(ui, step, view.current.id === step.id));
		const item = this.at(step.id as Id<S>);
		if (kind === "item") return apply(element, itemAttrs(item, ui.tabs && this.#inList(element)));
		if (kind === "indicator") return apply(element, indicatorAttrs(item));
		if (!item.pending) this.#blocked.set(step.id, item.disabled);
		apply(element, {
			type: element.tagName === "BUTTON" ? (element.getAttribute("type") ?? "button") : undefined,
			...triggerAttrs(ui, item, !!disabled || !!this.#blocked.get(step.id), this.steps.length),
		});
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
		const [, { kind, step }] = found;
		const view = this.flow.get();
		if (kind === "trigger" && step && !view.isPending) void this.flow.goTo(step as Id<S>);
		// A rejecting `onFinish` rejects `next()`: the error belongs to `onFinish`, which reports it.
		else if ((kind === "next" || kind === "prev") && !navIdle(navBits(view, kind))) this.flow[kind]().catch(() => {});
	};

	#onKeydown = (event: KeyboardEvent) => {
		for (const [element, { kind, orientation }] of this.#parts) {
			if (kind !== "list" || !event.composedPath().includes(element)) continue;
			onListKeydown(event, element as HTMLElement, this.flow, this.#ui, orientation ?? this.#ui.orientation);
			return;
		}
	};

	hostUpdate() {
		// Read before Lit touches the DOM: was focus in this stepper?
		const index = this.flow.get().index;
		this.#index ??= index;
		this.#inside = index !== this.#index && focusInside(this.#root);
	}

	override hostUpdated() {
		super.hostUpdated();
		if (!this.#root && this.#parts.size) {
			fail("SZ100", "Missing root. Put the `root()` directive on the element that contains the other parts.");
		}
		// Tabs need triggers: count the ones this render left in the template.
		let triggers = 0;
		for (const { kind } of this.#parts.values()) if (kind === "trigger") triggers++;
		this.#ui.tabs = !this.#linear() && triggers > 0;
		for (const [element, value] of this.#parts) {
			this.#paint(element, value);
			if (value.kind === "trigger" && !this.#checked.has(element)) {
				this.#checked.add(element);
				checkTrigger(element, value.step ?? "");
			}
		}
		const index = this.flow.get().index;
		if (index === this.#index) return;
		this.#index = index;
		stepChanged(this.#root, this.#region, this.flow.get().current, this.#ui, this.#inside);
	}

}

class PartDirective extends AsyncDirective {
	#element?: Element;
	#owner?: StepperPrimitives<readonly Step[]>;

	constructor(info: PartInfo) {
		super(info);
		if (info.type !== PartType.ELEMENT) {
			fail("SZ001", "Stepper parts are element directives: call them inside an opening tag, next to the attributes.");
		}
	}

	render(_owner: StepperPrimitives<readonly Step[]>, _part: Part) {
		return noChange;
	}

	override update(part: ElementPart, [owner, value]: [StepperPrimitives<readonly Step[]>, Part]) {
		this.#element = part.element;
		this.#owner = owner;
		owner._attach(part.element, value);
		return noChange;
	}

	protected override disconnected() {
		if (this.#element) this.#owner?._detach(this.#element);
	}
}

const partDirective = directive(PartDirective);
const part = <S extends readonly Step[]>(owner: StepperPrimitives<S>, value: Part): PartResult =>
	partDirective(owner as unknown as StepperPrimitives<readonly Step[]>, value);
