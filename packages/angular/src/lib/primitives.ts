import {
	APP_ID,
	afterEveryRender,
	afterNextRender,
	afterRenderEffect,
	booleanAttribute,
	computed,
	DestroyRef,
	Directive,
	ElementRef,
	effect,
	HOST_TAG_NAME,
	HostAttributeToken,
	Injectable,
	type InputSignal,
	inject,
	input,
	linkedSignal,
	PLATFORM_ID,
	type Signal,
	signal,
	untracked,
} from "@angular/core";
import { type StepperRef, ɵSTEPPER_CONTEXT, type ɵStepperContext } from "@stepperize/angular/headless";
import { fail, type Step, warn } from "@stepperize/core";
import {
	type Attrs,
	closestComposed,
	contentAttrs,
	focusInside,
	type ItemValue,
	indicatorAttrs,
	isPressable,
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
	reportError,
	rootAttrs,
	statusBits,
	stepChanged,
	triggerAttrs,
	type Ui,
} from "@stepperize/core/primitives";
import type { StepFor, StepId } from "./registry";

// `ngDevMode` is a global Angular defines; production builds replace it with `false`.
declare const ngDevMode: unknown;
const dev = () => typeof ngDevMode === "undefined" || !!ngDevMode;

type Bound = Record<string, string | number | null>;
/** A stepper of any flow, as the primitives use it: they only need step ids as strings. */
type AnyStepper = StepperRef<readonly Step[]>;

/**
 * What `[stepperRoot]` accepts: the stepper of any definition. Written structurally because a stepper
 * typed with one flow's step ids is not assignable to one typed with every string.
 */
export type StepperSource = (() => unknown) & {
	readonly flow: unknown;
	readonly steps: readonly Step[];
};

const tokens = new Map<string, HostAttributeToken>();
/**
 * The static attributes the author wrote on the element, among `names`. Read from the template, not
 * the DOM, so attributes a server rendered are not mistaken for the author's while hydrating.
 */
function authored(names: readonly string[]): Record<string, string> | undefined {
	let own: Record<string, string> | undefined;
	for (const name of names) {
		let token = tokens.get(name);
		if (!token) {
			token = new HostAttributeToken(name);
			tokens.set(name, token);
		}
		const value = inject(token, { optional: true });
		if (value !== null) {
			own ??= {};
			own[name] = value;
		}
	}
	return own;
}

/**
 * What Angular's `[attr.x]` bindings expect: `null` removes the attribute, and a bare attribute is an
 * empty string. An attribute the author wrote keeps the author's value.
 */
function bound(attrs: Attrs, own?: Record<string, string>): Bound {
	const result: Bound = {};
	for (const name in attrs) {
		const value = attrs[name];
		result[name] = own?.[name] ?? (value === undefined || value === false ? null : value === true ? "" : value);
	}
	return result;
}

/** Elements where `disabled` means something. On a link or a div only `aria-disabled` is set. */
const DISABLEABLE = new Set(["button", "input", "select", "textarea", "fieldset"]);

/** A `type` the author wrote stands; a `<button>` without one is not a submit button. */
function defaultType(tag: string) {
	return inject(new HostAttributeToken("type"), { optional: true }) ?? (tag === "button" ? "button" : null);
}

/**
 * Every listener Angular adds to one element runs in a single DOM callback, a directive's before the
 * template's. Act once they have all run, so a `(click)` of yours can `preventDefault()`, and a
 * `stopPropagation()` does not swallow the action.
 */
const afterListeners = (event: Event, act: () => void) =>
	queueMicrotask(() => {
		if (!event.defaultPrevented) act();
	});

/**
 * A required input, or `undefined` while Angular has not set it. On the first pass Angular updates the
 * class and style bindings of an element before the inputs of its directives, so
 * `[class.done]="item.value().state === 'complete'"` next to `[stepperItem]` reads the directive
 * first. The read is still tracked: once the input is set, the binding is checked again in the same
 * pass, before anything is painted. Reading an input signal throws nothing but NG0950.
 */
function early<T>(read: () => T): T | undefined {
	try {
		return read();
	} catch {
		return undefined;
	}
}

/** What an item is before its step is known: see `early`. Never painted. */
const UNSET: ItemValue = {
	step: { id: "" },
	index: -1,
	state: "pending",
	invalid: false,
	disabled: true,
	pending: false,
};

/** One counter per application, so ids are the same on the server and in the browser. */
@Injectable({ providedIn: "root" })
class StepperIds {
	#prefix = inject(APP_ID);
	#next = 0;
	next() {
		return `${this.#prefix}-sz${this.#next++}-`;
	}
}

const sameUi = (a: Ui, b: Ui) => a.id === b.id && a.orientation === b.orientation && a.tabs === b.tabs;

/**
 * What a root shares with the primitives inside it. Provided by `stepperRoot` and not exported, so none
 * of it is public API.
 */
@Injectable()
class Scope {
	readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	readonly id = inject(StepperIds).next();
	readonly browser = inject(PLATFORM_ID) === "browser";
	/** Set by the root before anything reads it. */
	stepper!: Signal<AnyStepper>;
	orientation!: Signal<Orientation>;

	readonly view = computed(() => this.stepper()());
	readonly steps = computed(() => this.stepper().steps);
	readonly #positions = computed(() => new Map(this.steps().map((step, index) => [step.id, index])));
	/** Read from the flow: the stepper may be owned and configured somewhere else. */
	readonly #linear = computed(() => this.view().isLinear);
	/** Tabs need triggers: each one counts itself in while it exists. */
	readonly #triggers = signal(0);
	/** Triggers rendered by the server in a block that is not hydrated yet: they count too. */
	readonly #dehydrated = signal(false);
	readonly ui = computed<Ui>(
		() => ({
			id: this.id,
			orientation: this.orientation(),
			tabs: !this.#linear() && (this.#triggers() > 0 || this.#dehydrated()),
		}),
		{ equal: sameUi },
	);
	readonly tabs = computed(() => this.ui().tabs);

	constructor() {
		// While hydrating, the element already holds the server's markup. Triggers inside an `@defer (hydrate …)`
		// block that has not hydrated are there but not created: count them until they are, or leave.
		if (!this.browser || !this.#rendered()) return;
		this.#dehydrated.set(true);
		const check = afterEveryRender({
			read: () => {
				// Done once a trigger is created (it counts itself) or the server's ones are gone.
				if (!untracked(this.#triggers) && this.#rendered()) return;
				this.#dehydrated.set(false);
				check.destroy();
			},
		});
	}

	#rendered() {
		return !!this.element.querySelector(`[data-component="stepper-trigger"][id^="${CSS.escape(this.id)}"]`);
	}

	flow() {
		return untracked(this.stepper).flow;
	}

	/** Counts a trigger in until `destroyRef` is destroyed. */
	countTrigger(destroyRef: DestroyRef) {
		untracked(() => this.#triggers.update((count) => count + 1));
		destroyRef.onDestroy(() => this.#triggers.update((count) => count - 1));
	}

	index(id: string) {
		return this.#positions().get(id) ?? fail("SZ102", `Step "${id}" not found.`);
	}

	/**
	 * What a part shows about one step. The flow state is packed in a number first, so a change that
	 * does not touch this step stops there instead of building a new value for every part.
	 */
	item(id: Signal<string>): Signal<ItemValue> {
		const index = computed(() => this.index(id()));
		const bits = computed(() => itemBits(this.view(), id()));
		return computed(() => itemValue(this.steps()[index()], index(), bits()));
	}
}

const useScope = () =>
	inject(Scope, { optional: true }) ?? fail("SZ100", "Missing stepperRoot. Put the primitives inside it.");

/** The root's stepper, for `injectStepperContext()` below it. */
function rootContext(): ɵStepperContext {
	const scope = inject(Scope);
	return { source: () => scope.stepper(), parent: inject(ɵSTEPPER_CONTEXT, { skipSelf: true, optional: true }) };
}

/**
 * The element that holds a stepper. Bind the stepper your component created
 * with `injectStepper()`; every other primitive goes inside it, and
 * `injectStepperContext()` returns it to the components inside.
 *
 * @example
 * <div [stepperRoot]="stepper">…</div>
 */
@Directive({
	selector: "[stepperRoot]",
	exportAs: "stepperRoot",
	providers: [Scope, { provide: ɵSTEPPER_CONTEXT, useFactory: rootContext }],
	host: {
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-orientation]": 'attrs()["data-orientation"]',
		"[attr.data-pending]": 'attrs()["data-pending"]',
		"[attr.data-finished]": 'attrs()["data-finished"]',
		"[attr.role]": "attrs().role",
		"[attr.aria-label]": 'attrs()["aria-label"]',
		"[attr.aria-busy]": 'attrs()["aria-busy"]',
	},
})
export class StepperRoot {
	/** The stepper to render: what `injectStepper()` or `injectStepperContext()` returned. */
	readonly stepperRoot = input.required<AnyStepper, StepperSource>({
		transform: (source) => source as unknown as AnyStepper,
	});
	readonly orientation = input<Orientation>("horizontal");
	/** The name read by assistive technology. Defaults to "Stepper". */
	readonly label = input<string | undefined>(undefined, { alias: "aria-label" });

	readonly #scope = inject(Scope);
	readonly #own = authored(ROOT);
	readonly #status = computed(() => statusBits(this.#scope.view()));
	protected readonly attrs = computed(() => {
		const attrs = bound(rootAttrs(this.orientation(), this.#status()), this.#own);
		const label = this.label();
		return label ? { ...attrs, "aria-label": label } : attrs;
	});

	constructor() {
		const scope = this.#scope;
		scope.stepper = this.stepperRoot;
		scope.orientation = this.orientation;
		const element = scope.element;
		const index = computed(() => scope.view().index);
		let region: HTMLElement | undefined;
		let previous: { stepper: AnyStepper; index: number } | undefined;
		let inside = false;
		// Effects run before the view is checked: was focus in this stepper before the DOM changes?
		effect(() => {
			const now = { stepper: this.stepperRoot(), index: index() };
			if (scope.browser && previous?.stepper === now.stepper && now.index !== previous.index) {
				inside = focusInside(element);
			}
		});
		afterRenderEffect({
			write: () => {
				const now = { stepper: this.stepperRoot(), index: index() };
				const before = previous;
				previous = now;
				// The first render, or a root bound to another stepper, is not a step change.
				if (before?.stepper !== now.stepper || before.index === now.index) return;
				untracked(() => stepChanged(element, region, scope.flow().current, scope.ui(), inside));
			},
		});
		// The live region is added in the browser, after hydration: it is not part of any template.
		afterNextRender({
			write: () => {
				region = liveRegion(element.ownerDocument);
				element.append(region);
			},
		});
		inject(DestroyRef).onDestroy(() => region?.remove());
	}
}
const ROOT = [
	"data-component",
	"data-orientation",
	"data-pending",
	"data-finished",
	"role",
	"aria-label",
	"aria-busy",
] as const;

/** The list of steps: a tablist when the flow is not linear and has triggers. Handles arrow keys. */
@Directive({
	selector: "[stepperList]",
	host: {
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-orientation]": 'attrs()["data-orientation"]',
		"[attr.role]": "attrs().role",
		"[attr.aria-orientation]": 'attrs()["aria-orientation"]',
		"(keydown)": "onKeydown($event)",
	},
})
export class StepperList {
	/** Defaults to the root's. */
	readonly orientation = input<Orientation | undefined>(undefined);

	readonly #scope = useScope();
	readonly #element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	readonly #own = authored(LIST);
	readonly #orientation = computed(() => this.orientation() ?? this.#scope.orientation());
	protected readonly attrs = computed(() => bound(listAttrs(this.#scope.ui(), this.#orientation()), this.#own));

	protected onKeydown(event: KeyboardEvent) {
		afterListeners(event, () =>
			onListKeydown(event, this.#element, this.#scope.flow(), this.#scope.ui(), untracked(this.#orientation)),
		);
	}
}
const LIST = ["data-component", "data-orientation", "role", "aria-orientation"] as const;

/**
 * One step. Bind its id, or the step itself; everything inside knows which
 * step it is. With a step, `value().step` has that step's own fields, typed.
 *
 * @example
 * <li [stepperItem]="step" #item="stepperItem">{{ item.value().state }}</li>
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
export class StepperItem<I extends StepId | Step = StepId> {
	/** A step id, or a step of the stepper's `steps`. */
	readonly stepperItem: InputSignal<I> = input.required<I>();

	readonly #scope = useScope();
	readonly #list = inject(StepperList, { optional: true });
	readonly #own = authored(ITEM);
	readonly #id = computed(() => {
		const step = early(this.stepperItem);
		return step === undefined || typeof step === "string" ? step : step.id;
	});
	readonly #value = this.#scope.item(computed(() => this.#id() ?? ""));
	/**
	 * The step as this item sees it: its state and whether it can be reached. Safe to read in a
	 * binding on the item's own element, `[class.done]` included.
	 */
	readonly value: Signal<ItemValue<readonly StepFor<I>[]>> = computed(() =>
		this.#id() === undefined ? UNSET : this.#value(),
	) as Signal<ItemValue<readonly StepFor<I>[]>>;
	protected readonly attrs = computed(() =>
		bound(itemAttrs(this.value(), !!this.#list && this.#scope.tabs()), this.#own),
	);
}
const ITEM = ["data-component", "data-step", "data-state", "data-invalid", "data-disabled", "role"] as const;

/** The step of a part: its own id, or the item it is in. Shares the item's value when it can. */
function useValue(scope: Scope, own: Signal<string | undefined>, part: string): Signal<ItemValue> {
	const item = inject<StepperItem<StepId | Step>>(StepperItem, { optional: true });
	const mine = scope.item(
		computed(() => own() || fail("SZ101", `${part} needs a step id, or a stepperItem around it.`)),
	);
	return computed(() => (own() || !item ? mine() : item.value()));
}

/**
 * A button that goes to its step: the one of the item it is in, or the id you bind.
 *
 * @example
 * <button stepperTrigger>{{ step.title }}</button>
 * <button stepperTrigger="review">Review</button>
 */
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
		"(click)": "onClick($event)",
	},
})
export class StepperTrigger {
	/** A step id. Optional inside a `stepperItem`. */
	// Annotated, so the published typings keep `StepId` instead of what it was when the library was built.
	readonly stepperTrigger: InputSignal<StepId | "" | undefined> = input<StepId | "">();
	/** Disable it on top of what the flow decides. */
	readonly disabled = input(false, { transform: booleanAttribute });

	readonly #scope = useScope();
	readonly #value = useValue(this.#scope, this.stepperTrigger, "stepperTrigger");
	readonly #tag = inject(HOST_TAG_NAME).toLowerCase();
	protected readonly type = defaultType(this.#tag);
	/** Steps that were unreachable before the running move started stay natively disabled; see `triggerAttrs`. */
	readonly #blocked = linkedSignal<ItemValue, boolean>({
		source: this.#value,
		computation: (item, previous) => (item.pending ? (previous?.value ?? false) : item.disabled),
	});
	readonly #total = computed(() => this.#scope.steps().length);
	protected readonly attrs = computed(() => {
		const attrs = bound(
			triggerAttrs(this.#scope.ui(), this.#value(), this.disabled() || this.#blocked(), this.#total()),
		);
		if (!DISABLEABLE.has(this.#tag)) attrs.disabled = null;
		// Outside a tablist these are absent, not left over from when it was one.
		return { ...EMPTY_TAB, ...attrs };
	});

	constructor() {
		const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
		this.#scope.countTrigger(inject(DestroyRef));
		if (dev()) {
			afterNextRender({
				read: () => {
					const step = this.#value().step.id;
					if (
						!(
							element.textContent?.trim() ||
							element.getAttribute("aria-label") ||
							element.getAttribute("aria-labelledby")
						)
					) {
						warn("SZ002", `Stepper trigger for step "${step}" has no accessible name. Render text or pass aria-label.`);
					}
					// Across shadow roots: a trigger in a child component's shadow root is inside the list around it.
					if (!closestComposed(element, '[data-component="stepper-list"]')) {
						warn("SZ003", `Stepper trigger for step "${step}" is outside stepperList.`);
					}
					if (!isPressable(element)) {
						warn(
							"SZ005",
							`The trigger for step "${step}" is a <${element.tagName.toLowerCase()}>, not a <button>: Enter and Space do not press it and it cannot be disabled. Use a <button>.`,
						);
					}
				},
			});
		}
	}

	protected onClick(event: MouseEvent) {
		afterListeners(event, () => {
			const item = this.#value();
			// A native `disabled` stops a button by itself; a link or a div needs this.
			if (this.disabled() || item.pending) return;
			// Nothing awaits a click: a guard that throws is reported like an error in any event listener.
			this.#scope.flow().goTo(item.step.id).catch(reportError);
		});
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
	/** A step id. Optional inside a `stepperItem`. */
	readonly stepperIndicator: InputSignal<StepId | "" | undefined> = input<StepId | "">();

	readonly #scope = useScope();
	readonly #own = authored(INDICATOR);
	readonly #value = useValue(this.#scope, this.stepperIndicator, "stepperIndicator");
	protected readonly attrs = computed(() => bound(indicatorAttrs(this.#value()), this.#own));
}
const INDICATOR = ["data-component", "data-state", "data-invalid", "aria-hidden"] as const;

/**
 * The panel of a step. It stays in the page while its step is not current,
 * `hidden` and `display: none`, so what is inside keeps its state. Export it
 * to leave the content out instead: `@if (panel.active())`, or `@defer (when
 * panel.active())` to load it with its step.
 *
 * @example
 * <div stepperContent="shipping" #panel="stepperContent">
 *   @if (panel.active()) { <app-shipping-form /> }
 * </div>
 */
@Directive({
	selector: "[stepperContent]",
	exportAs: "stepperContent",
	host: {
		"[attr.id]": "attrs().id",
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-step]": 'attrs()["data-step"]',
		"[attr.role]": "attrs().role",
		"[attr.aria-label]": 'attrs()["aria-label"]',
		"[attr.aria-labelledby]": 'attrs()["aria-labelledby"]',
		"[attr.hidden]": "attrs().hidden",
		"[attr.tabindex]": "attrs().tabindex",
		// `hidden` alone loses to any `display` rule of yours.
		"[style.display]": "active() ? null : 'none'",
	},
})
export class StepperContent {
	/** The id of its step. */
	readonly stepperContent: InputSignal<StepId> = input.required<StepId>();

	readonly #scope = useScope();
	readonly #own = authored(CONTENT);
	/** Whether this is the panel of the current step. Safe to read in a binding on the panel's own element. */
	readonly active = computed(() => this.#scope.view().current.id === early(this.stepperContent));
	readonly #step = computed(() => this.#scope.steps()[this.#scope.index(this.stepperContent())]);
	protected readonly attrs = computed(() =>
		bound(contentAttrs(this.#scope.ui(), this.#step(), this.active()), this.#own),
	);
}
const CONTENT = [
	"id",
	"data-component",
	"data-step",
	"role",
	"aria-label",
	"aria-labelledby",
	"hidden",
	"tabindex",
] as const;

/** What `stepperPrev` and `stepperNext` share. */
@Directive({
	host: {
		"[attr.type]": "type",
		"[attr.data-component]": 'attrs()["data-component"]',
		"[attr.data-pending]": 'attrs()["data-pending"]',
		"[attr.data-disabled]": 'attrs()["data-disabled"]',
		"[attr.disabled]": "attrs().disabled",
		"[attr.aria-disabled]": 'attrs()["aria-disabled"]',
		"(click)": "onClick($event)",
	},
})
abstract class StepperNav {
	protected abstract readonly direction: "next" | "prev";
	/** Disable it on top of what the flow decides. */
	readonly disabled = input(false, { transform: booleanAttribute });

	readonly #scope = useScope();
	readonly #tag = inject(HOST_TAG_NAME).toLowerCase();
	protected readonly type = defaultType(this.#tag);
	readonly #bits = computed(() => navBits(this.#scope.view(), this.direction));
	protected readonly attrs = computed(() => {
		const attrs = bound(navAttrs(this.direction, this.#bits(), this.disabled()));
		if (!DISABLEABLE.has(this.#tag)) attrs.disabled = null;
		return attrs;
	});

	protected onClick(event: MouseEvent) {
		afterListeners(event, () => {
			const bits = this.#bits();
			if (this.disabled() || !(bits & 1) || navIdle(bits)) return;
			// Nothing awaits a click: a move that throws (a guard, a schema, a rejecting `onFinish`) is
			// reported like an error in any event listener. The flow is idle again, so the button works.
			this.#scope.flow()[this.direction]().catch(reportError);
		});
	}
}

/** A button that goes back to the step you came from. Disabled when there is nowhere to go back to. */
@Directive({ selector: "[stepperPrev]" })
export class StepperPrev extends StepperNav {
	protected readonly direction = "prev";
}

/** A button that validates the current step and moves on; on the last step it finishes the flow, once. */
@Directive({ selector: "[stepperNext]" })
export class StepperNext extends StepperNav {
	protected readonly direction = "next";
}

/**
 * Every primitive, for the `imports` of a standalone component or of an `NgModule`. A tuple, so
 * Angular's compiler sees each directive in the published typings; not `readonly`, because an
 * `NgModule`'s `imports` only takes a mutable array.
 */
export const STEPPER_PRIMITIVES: [
	typeof StepperRoot,
	typeof StepperList,
	typeof StepperItem,
	typeof StepperTrigger,
	typeof StepperIndicator,
	typeof StepperContent,
	typeof StepperPrev,
	typeof StepperNext,
] = [StepperRoot, StepperList, StepperItem, StepperTrigger, StepperIndicator, StepperContent, StepperPrev, StepperNext];
