import { isPlatformBrowser } from "@angular/common";
import {
	APP_ID,
	afterNextRender,
	afterRenderEffect,
	booleanAttribute,
	computed,
	DestroyRef,
	Directive,
	ElementRef,
	effect,
	Injectable,
	inject,
	input,
	isDevMode,
	PLATFORM_ID,
	signal,
	untracked,
} from "@angular/core";
import type { StepperRef } from "@stepperize/angular/headless";
import { fail, type Step, warn } from "@stepperize/core";
import {
	type Attrs,
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

type Bound = Record<string, string | number | null>;
type Kind = "list" | "trigger" | "prev" | "next";

/** A stepper of any flow, as the primitives use it: they only need step ids as strings. */
type AnyStepper = StepperRef<readonly Step[]>;
/**
 * What `[stepperRoot]` accepts: the stepper of any definition. Written structurally because a stepper
 * typed with one flow's step ids is not assignable to one typed with every string.
 */
export type StepperSource = (() => unknown) & {
	readonly flow: unknown;
	readonly steps: readonly Step[];
	readonly linear: () => boolean;
};

/** What Angular's `[attr.x]` bindings expect: `null` removes the attribute, and a bare attribute is an empty string. */
function bound(attrs: Attrs): Bound {
	const result: Bound = {};
	for (const name in attrs) {
		const value = attrs[name];
		result[name] = value === undefined || value === false ? null : value === true ? "" : value;
	}
	return result;
}

/** An attribute written without a value (`<button stepperTrigger>`) binds an empty string: no step of its own. */
const optionalStep = (value: string | undefined) => value || undefined;

/** One counter per application, so ids are the same on the server and in the browser. */
@Injectable({ providedIn: "root" })
class StepperIds {
	#prefix = inject(APP_ID);
	#next = 0;
	next() {
		return `${this.#prefix}-sz${this.#next++}-`;
	}
}

/**
 * The element that holds a stepper. Bind the stepper your component created
 * with `injectStepper()`; every other primitive goes inside it.
 *
 * @example
 * <div [stepperRoot]="stepper">…</div>
 */
@Directive({
	selector: "[stepperRoot]",
	exportAs: "stepperRoot",
	host: {
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-orientation]": 'attrs()["data-orientation"]',
		"[attr.data-pending]": 'attrs()["data-pending"]',
		"[attr.data-finished]": 'attrs()["data-finished"]',
		"[attr.role]": "attrs().role",
		"[attr.aria-label]": 'attrs()["aria-label"]',
		"[attr.aria-busy]": 'attrs()["aria-busy"]',
		"(click)": "onClick($event)",
		"(keydown)": "onKeydown($event)",
	},
})
export class StepperRoot {
	/** The stepper to render: what `injectStepper()` or `injectStepperContext()` returned. */
	readonly stepper = input.required<AnyStepper, StepperSource>({
		alias: "stepperRoot",
		transform: (source) => source as unknown as AnyStepper,
	});
	readonly orientation = input<Orientation>("horizontal");
	/** The name read by assistive technology. Defaults to "Stepper". */
	readonly label = input<string | undefined>(undefined, { alias: "aria-label" });

	readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	readonly #id = inject(StepperIds).next();
	readonly #browser = isPlatformBrowser(inject(PLATFORM_ID));
	/** Tabs need triggers: each one counts itself in while it exists. */
	readonly triggers = signal(0);
	readonly #parts = new Map<Element, { kind: Kind; step?: () => string; orientation?: () => Orientation }>();
	#region?: HTMLSpanElement;

	/** @internal */
	readonly ui = computed<Ui>(() => ({
		id: this.#id,
		orientation: this.orientation(),
		tabs: !this.stepper().linear() && this.triggers() > 0,
	}));
	/** @internal */
	readonly view = computed(() => this.stepper()());
	protected readonly attrs = computed(() => {
		const attrs = bound(rootAttrs(this.orientation(), statusBits(this.view())));
		const label = this.label();
		return label ? { ...attrs, "aria-label": label } : attrs;
	});

	constructor() {
		const index = computed(() => this.view().index);
		let previous: number | undefined;
		let inside = false;
		// Effects run before the view is checked: was focus in this stepper before the DOM changes?
		effect(() => {
			const next = index();
			if (this.#browser && previous !== undefined && next !== previous) inside = focusInside(this.element);
		});
		afterRenderEffect(() => {
			const next = index();
			if (previous === undefined) previous = next;
			if (next === previous) return;
			previous = next;
			untracked(() => stepChanged(this.element, this.#region, this.stepper().flow.current, this.ui(), inside));
		});
		// The live region is added in the browser, after hydration: it is not part of any template.
		afterNextRender(() => {
			this.#region = this.element.ownerDocument.createElement("span");
			this.#region.setAttribute("aria-live", "polite");
			this.#region.setAttribute("style", HIDDEN);
			this.element.append(this.#region);
		});
		inject(DestroyRef).onDestroy(() => this.#region?.remove());
	}

	/** @internal Parts tell the root where they are, so it can handle their clicks and keys. */
	register(element: Element, part: { kind: Kind; step?: () => string; orientation?: () => Orientation }) {
		this.#parts.set(element, part);
		if (part.kind === "trigger") untracked(() => this.triggers.update((count) => count + 1));
		inject(DestroyRef).onDestroy(() => {
			this.#parts.delete(element);
			if (part.kind === "trigger") this.triggers.update((count) => count - 1);
		});
	}

	/** @internal */
	step(id: string): Step {
		const steps = this.stepper().steps;
		return steps.find((step) => step.id === id) ?? fail("SZ102", `Step "${id}" not found.`);
	}

	/** @internal */
	item(id: string): ItemValue {
		const steps = this.stepper().steps;
		const step = this.step(id);
		return itemValue(step, steps.indexOf(step), itemBits(this.view(), id));
	}

	// Handled here so a `(click)` of your own on the button runs first and can `preventDefault()`.
	protected onClick(event: MouseEvent) {
		if (event.defaultPrevented) return;
		for (const node of event.composedPath()) {
			if (node === this.element) return;
			const part = this.#parts.get(node as Element);
			if (!part) continue;
			const { flow } = this.stepper();
			const view = flow.get();
			if (part.kind === "trigger" && part.step && !view.isPending) void flow.goTo(part.step());
			// A rejecting `onFinish` rejects `next()`: the error belongs to `onFinish`, which reports it.
			else if ((part.kind === "next" || part.kind === "prev") && !navIdle(navBits(view, part.kind))) {
				flow[part.kind]().catch(() => {});
			}
			return;
		}
	}

	protected onKeydown(event: KeyboardEvent) {
		for (const node of event.composedPath()) {
			if (node === this.element) return;
			const part = this.#parts.get(node as Element);
			if (part?.kind !== "list") continue;
			onListKeydown(
				event,
				node as HTMLElement,
				this.stepper().flow,
				this.ui(),
				part.orientation?.() ?? this.orientation(),
			);
			return;
		}
	}
}

const useRoot = () =>
	inject(StepperRoot, { optional: true }) ?? fail("SZ100", "Missing stepperRoot. Put the primitives inside it.");
const useElement = () => inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

/** The list of steps: a tablist when the flow is not linear and has triggers. Handles arrow keys. */
@Directive({
	selector: "[stepperList]",
	host: {
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-orientation]": 'attrs()["data-orientation"]',
		"[attr.role]": "attrs().role",
		"[attr.aria-orientation]": 'attrs()["aria-orientation"]',
	},
})
export class StepperList {
	readonly #root = useRoot();
	/** Defaults to the root's. */
	readonly orientation = input<Orientation | undefined>(undefined);
	/** @internal `true` inside a tablist: its items are presentational. */
	readonly tabs = computed(() => this.#root.ui().tabs);
	protected readonly attrs = computed(() =>
		bound(listAttrs(this.#root.ui(), this.orientation() ?? this.#root.orientation())),
	);

	constructor() {
		this.#root.register(useElement(), {
			kind: "list",
			orientation: () => this.orientation() ?? this.#root.orientation(),
		});
	}
}

/**
 * One step. Bind its id; everything inside knows which step it is.
 *
 * @example
 * <li [stepperItem]="step.id" #item="stepperItem">{{ item.value().state }}</li>
 */
@Directive({
	selector: "[stepperItem]",
	exportAs: "stepperItem",
	host: {
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-step]": 'attrs()["data-step"]',
		"[attr.data-state]": 'attrs()["data-state"]',
		"[attr.data-invalid]": 'attrs()["data-invalid"]',
		"[attr.data-disabled]": 'attrs()["data-disabled"]',
		"[attr.role]": "attrs().role",
	},
})
export class StepperItem {
	readonly #root = useRoot();
	readonly #list = inject(StepperList, { optional: true });
	readonly step = input.required<string>({ alias: "stepperItem" });
	/** The step as this item sees it: its state and whether it can be reached. */
	readonly value = computed(() => this.#root.item(this.step()));
	protected readonly attrs = computed(() => bound(itemAttrs(this.value(), !!this.#list?.tabs())));
}

/** The step a part belongs to: its own, or the one of the item it is in. */
function useStep(own: () => string | undefined, part: string) {
	const item = inject(StepperItem, { optional: true });
	return computed(() => own() ?? item?.step() ?? fail("SZ101", `${part} needs a step id, or a stepperItem around it.`));
}

/** A button that goes to its step: the one of the item it is in, or the id you bind. */
@Directive({
	selector: "[stepperTrigger]",
	host: {
		"[attr.type]": "type",
		"[attr.id]": "attrs().id",
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-step]": 'attrs()["data-step"]',
		"[attr.data-state]": 'attrs()["data-state"]',
		"[attr.data-invalid]": 'attrs()["data-invalid"]',
		"[attr.data-disabled]": 'attrs()["data-disabled"]',
		"[attr.disabled]": "attrs().disabled",
		"[attr.aria-disabled]": 'attrs()["aria-disabled"]',
		"[attr.role]": "attrs().role",
		"[attr.tabindex]": "attrs().tabindex",
		"[attr.aria-selected]": 'attrs()["aria-selected"]',
		"[attr.aria-controls]": 'attrs()["aria-controls"]',
		"[attr.aria-posinset]": 'attrs()["aria-posinset"]',
		"[attr.aria-setsize]": 'attrs()["aria-setsize"]',
		"[attr.aria-current]": 'attrs()["aria-current"]',
	},
})
export class StepperTrigger {
	readonly #root = useRoot();
	readonly own = input(undefined, { alias: "stepperTrigger", transform: optionalStep });
	readonly disabled = input(false, { transform: booleanAttribute });
	readonly #step = useStep(this.own, "stepperTrigger");
	// A default only: a `type` you wrote on the button stands, and other elements get none.
	protected readonly type = defaultType(useElement());
	/** Steps that were unreachable before the running move started stay natively disabled; see `triggerAttrs`. */
	#blocked = false;
	protected readonly attrs = computed(() => {
		const item = this.#root.item(this.#step());
		if (!item.pending) this.#blocked = item.disabled;
		const total = this.#root.stepper().steps.length;
		const attrs = bound(triggerAttrs(this.#root.ui(), item, this.disabled() || this.#blocked, total));
		// Outside a tablist these are absent, not left over from when it was one.
		return { ...EMPTY_TAB, ...attrs };
	});

	constructor() {
		const element = useElement();
		this.#root.register(element, { kind: "trigger", step: () => this.#step() });
		if (isDevMode()) {
			afterNextRender(() => {
				if (
					!(
						element.textContent?.trim() ||
						element.getAttribute("aria-label") ||
						element.getAttribute("aria-labelledby")
					)
				) {
					warn(
						"SZ002",
						`Stepper trigger for step "${this.#step()}" has no accessible name. Render text or pass aria-label.`,
					);
				}
				if (!element.closest('[data-component="stepper-list"]')) {
					warn("SZ003", `Stepper trigger for step "${this.#step()}" is outside stepperList.`);
				}
			});
		}
	}
}

const EMPTY_TAB: Bound = {
	role: null,
	tabindex: null,
	"aria-selected": null,
	"aria-controls": null,
	"aria-posinset": null,
	"aria-setsize": null,
	"aria-current": null,
};

function defaultType(element: Element) {
	return element.tagName === "BUTTON" ? (element.getAttribute("type") ?? "button") : null;
}

/** A decorative mark for a step: hidden from assistive technology, styled through `data-state`. */
@Directive({
	selector: "[stepperIndicator]",
	host: {
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-state]": 'attrs()["data-state"]',
		"[attr.data-invalid]": 'attrs()["data-invalid"]',
		"[attr.aria-hidden]": 'attrs()["aria-hidden"]',
	},
})
export class StepperIndicator {
	readonly #root = useRoot();
	readonly own = input(undefined, { alias: "stepperIndicator", transform: optionalStep });
	readonly #step = useStep(this.own, "stepperIndicator");
	protected readonly attrs = computed(() => bound(indicatorAttrs(this.#root.item(this.#step()))));
}

/**
 * The panel of a step: `hidden` unless its step is current, so what is inside
 * keeps its state. Wrap it in `@if` to leave it out of the DOM instead.
 *
 * @example
 * <div stepperContent="shipping">…</div>
 */
@Directive({
	selector: "[stepperContent]",
	host: {
		"[attr.id]": "attrs().id",
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-step]": 'attrs()["data-step"]',
		"[attr.role]": "attrs().role",
		"[attr.aria-label]": 'attrs()["aria-label"]',
		"[attr.aria-labelledby]": 'attrs()["aria-labelledby"]',
		"[attr.hidden]": "attrs().hidden",
		"[attr.tabindex]": "attrs().tabindex",
	},
})
export class StepperContent {
	readonly #root = useRoot();
	readonly step = input.required<string>({ alias: "stepperContent" });
	/** Whether this is the panel of the current step. */
	readonly active = computed(() => this.#root.view().current.id === this.step());
	protected readonly attrs = computed(() =>
		bound(contentAttrs(this.#root.ui(), this.#root.step(this.step()), this.active())),
	);
}

/** What `stepperPrev` and `stepperNext` share. */
@Directive()
abstract class StepperNav {
	protected abstract readonly direction: "next" | "prev";
	readonly #root = useRoot();
	readonly disabled = input(false, { transform: booleanAttribute });
	protected readonly type = defaultType(useElement());
	protected readonly attrs = computed(() =>
		bound(navAttrs(this.direction, navBits(this.#root.view(), this.direction), this.disabled())),
	);

	protected connect(kind: "next" | "prev") {
		this.#root.register(useElement(), { kind });
	}
}

/** A button that goes back to the step you came from. Disabled when there is nowhere to go back to. */
@Directive({
	selector: "[stepperPrev]",
	host: {
		"[attr.type]": "type",
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-pending]": 'attrs()["data-pending"]',
		"[attr.data-disabled]": 'attrs()["data-disabled"]',
		"[attr.disabled]": "attrs().disabled",
		"[attr.aria-disabled]": 'attrs()["aria-disabled"]',
	},
})
export class StepperPrev extends StepperNav {
	protected readonly direction = "prev";
	constructor() {
		super();
		this.connect("prev");
	}
}

/** A button that validates the current step and moves on; on the last step it finishes the flow, once. */
@Directive({
	selector: "[stepperNext]",
	host: {
		"[attr.type]": "type",
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-pending]": 'attrs()["data-pending"]',
		"[attr.data-disabled]": 'attrs()["data-disabled"]',
		"[attr.disabled]": "attrs().disabled",
		"[attr.aria-disabled]": 'attrs()["aria-disabled"]',
	},
})
export class StepperNext extends StepperNav {
	protected readonly direction = "next";
	constructor() {
		super();
		this.connect("next");
	}
}

/** Every primitive, for the `imports` of a component. */
export const STEPPER_PRIMITIVES = [
	StepperRoot,
	StepperList,
	StepperItem,
	StepperTrigger,
	StepperIndicator,
	StepperContent,
	StepperPrev,
	StepperNext,
] as const;
