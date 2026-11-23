import { html, LitElement, nothing } from "lit";
import { cache } from "lit/directives/cache.js";
import { guard } from "lit/directives/guard.js";
import { repeat } from "lit/directives/repeat.js";
import { until } from "lit/directives/until.js";
import { defineStepper, type Flow, type Options, type StepperPrimitives } from "../index";

export const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
] as const;
export const flow = defineStepper(steps);
export type StepOptions = Options<typeof steps>;

const schema = {
	"~standard": {
		version: 1 as const,
		vendor: "test",
		validate: (value: unknown) => (value === "ok" ? { value } : { issues: [{ message: "Required" }] }),
	},
};
export const checked = defineStepper([
	{ id: "a", title: "A", schema },
	{ id: "b", title: "B" },
]);

/** The whole stepper in one element's shadow root. Every option is a property. */
export class Full extends LitElement {
	static properties = { options: { attribute: false } };
	declare options: StepOptions;
	renders = 0;
	stepper = flow.controller(this, () => this.options);

	render() {
		this.renders++;
		const s = this.stepper;
		return html`
			<div ${s.root()}>
				<ol ${s.list()}>
					${s.steps.map(
						(step) => html`
							<li ${s.item(step.id)}>
								<button ${s.trigger(step.id)}>
									<span ${s.indicator(step.id)}></span>
									<span>${step.title}</span>
									<span>${step.description}</span>
								</button>
							</li>
						`,
					)}
				</ol>
				${s.steps.map(
					(step) => html`
						<div ${s.content(step.id)}>
							<label>${step.title} name <input /></label>
						</div>
					`,
				)}
				<button ${s.prev()}>Back</button>
				<button ${s.next()}>Continue</button>
			</div>
		`;
	}
}
customElements.define("sz-full", Full);

/** The same in the light DOM, where the page's own ids and styles apply. */
export class Light extends Full {
	protected createRenderRoot() {
		return this;
	}
}
customElements.define("sz-light", Light);

/** One template for the smaller scenarios, chosen by `name`. */
export class Scenario extends LitElement {
	static properties = {
		name: {},
		show: { type: Boolean },
		lock: { type: Boolean },
		label: {},
		later: { attribute: false },
		order: { attribute: false },
		options: { attribute: false },
	};
	declare name: string;
	declare show: boolean;
	declare lock: boolean;
	declare label: string | undefined;
	declare later: Promise<unknown> | undefined;
	declare order: string[] | undefined;
	declare options: StepOptions;
	stepper = flow.controller(this, () => this.options);
	checked = checked.controller(this);
	/** For `until`: one promise per trigger, made once, as `until` needs. */
	loaded?: Promise<unknown>[];
	/** A second stepper on the same host, for `two`. */
	other = flow.controller(this);

	willUpdate(changed: Map<string, unknown>) {
		const s = this.stepper;
		if (changed.has("later")) {
			this.loaded = s.steps.map((step) =>
				this.later?.then(() => html`<button ${s.trigger(step.id)}>${step.title}</button>`),
			) as Promise<unknown>[];
		}
	}

	render() {
		const s = this.stepper;
		switch (this.name) {
			case "nested":
				return html`
					<div ${s.root()} data-testid="outer">
						<ol ${s.list()}>
							${s.steps.map((step) => html`<li ${s.item(step.id)}><span ${s.indicator(step.id)}></span></li>`)}
						</ol>
						<div ${s.content("first")}><sz-full></sz-full></div>
					</div>
				`;
			case "late":
				return html`
					<div ${s.root()}>
						<ol ${s.list()}>
							<li ${s.item("first")}>${this.show ? html`<button ${s.trigger("first")}>First</button>` : nothing}</li>
						</ol>
					</div>
				`;
			case "checked": {
				const c = this.checked;
				return html`
					<div ${c.root()}>
						<ol ${c.list()}>
							${c.steps.map(
								(step) => html`
									<li ${c.item(step.id)}>
										<button ${c.trigger(step.id)}><span ${c.indicator(step.id)}></span>${step.title}</button>
									</li>
								`,
							)}
						</ol>
					</div>
				`;
			}
			case "badge":
				return html`
					<div ${s.root()}>
						<ol ${s.list()}>
							${s.steps.map((step) => {
								const item = s.at(step.id);
								return html`<li ${s.item(step.id)}>
									<span data-testid="badge-${step.id}"
										>${item.index + 1} ${item.state} ${item.disabled} ${item.pending}</span
									>
								</li>`;
							})}
						</ol>
					</div>
				`;
			case "prevent":
				return html`
					<div ${s.root({ orientation: "vertical" })} class="mine" data-extra="yes">
						<output>${s.value.current.id}</output>
						<ol ${s.list()} @keydown=${(event: Event) => event.preventDefault()}>
							${s.steps.map((step) => html`<li ${s.item(step.id)}><button ${s.trigger(step.id)}>${step.title}</button></li>`)}
						</ol>
						<button ${s.next()} @click=${(event: Event) => event.preventDefault()}>Continue</button>
					</div>
				`;
			case "panels":
				return html`
					<div ${s.root()}>
						<div ${s.content("first")}><input aria-label="Name" /></div>
						<div ${s.content("second")}>Two</div>
						${s.value.current.id === "third" ? html`<div ${s.content("third")}>Three</div>` : nothing}
					</div>
				`;
			case "own":
				return html`
					<section ${s.root()}>
						<nav ${s.list()}>
							<div ${s.item("first")}><a href="#first" ${s.trigger("first")}>First</a></div>
						</nav>
						<button type="submit" class="mine" ${s.next()}>Continue</button>
						<button ${s.prev({ disabled: true })}>Back</button>
					</section>
				`;
			case "nameless":
				return html`<div ${s.root()}><div ${s.item("first")}><button ${s.trigger("first")}></button></div></div>`;
			case "rootless":
				return html`<button ${s.next()}>Continue</button>`;
			case "unknown":
				return html`<div ${s.root()}><li ${s.item("nope" as "first")}></li></div>`;
			case "authored":
				return html`
					<div ${s.root()} role="region" aria-label="Checkout" id="mine">
						<ol ${s.list()} role="list">
							${s.steps.map(
								(step) =>
									html`<li ${s.item(step.id)} role="none"><button ${s.trigger(step.id)}>${step.title}</button></li>`,
							)}
						</ol>
						<div ${s.content("first")} aria-label=${this.label ?? nothing} tabindex="0">One</div>
						<div ${s.content("second")}>Two</div>
						<button ${s.prev()} ?disabled=${this.lock}>Back</button>
						<button ${s.next()} ?disabled=${this.lock}>Continue</button>
					</div>
				`;
			case "until":
				return html`
					<div ${s.root()}>
						<ol ${s.list()}>
							${s.steps.map(
								(step, index) =>
									html`<li ${s.item(step.id)}>${until(this.loaded?.[index], html`<span>Loading</span>`)}</li>`,
							)}
						</ol>
					</div>
				`;
			case "guard":
				return html`
					<div ${s.root()}>
						${guard([], () => html`<div ${s.content("first")}>One</div><div ${s.content("second")}>Two</div>`)}
						<button ${s.next()}>Continue</button>
					</div>
				`;
			case "cache":
				return html`
					<div ${s.root()}>
						${cache(this.show ? html`<div ${s.content("first")}>One</div>` : html`<p>Away</p>`)}
						<button ${s.next()}>Continue</button>
					</div>
				`;
			case "repeat":
				return html`
					<div ${s.root()}>
						<ol ${s.list()}>
							${repeat(
								this.order ?? s.steps.map((step) => step.id),
								(id) => id,
								(id) => html`<li ${s.item(id as "first")}><button ${s.trigger(id as "first")}>${id}</button></li>`,
							)}
						</ol>
					</div>
				`;
			case "trailing":
				// The child expression ends right at the root's closing tag.
				return html`<div ${s.root()}><button ${s.next()}>Continue</button>${this.show ? html`<p>Extra</p>` : nothing}</div>`;
			case "child":
				return html`
					<div ${s.root()}>
						<sz-child-list .stepper=${s}></sz-child-list>
						<div ${s.content("first")}>One</div>
						<div ${s.content("second")}>Two</div>
						<div ${s.content("third")}>Three</div>
						<sz-child-nav .stepper=${s}></sz-child-nav>
					</div>
				`;
			case "child-trigger":
				return html`
					<div ${s.root()}>
						<ol ${s.list()}>
							${s.steps.map(
								(step) =>
									html`<li ${s.item(step.id)}><sz-child-trigger .stepper=${s} .step=${step.id}></sz-child-trigger></li>`,
							)}
						</ol>
					</div>
				`;
			case "outside":
				return html`
					<div ${s.root()}>
						<div ${s.content("first")}>One</div>
					</div>
					<button ${s.next()}>Continue</button>
				`;
			case "two": {
				const o = this.other;
				return html`
					<div ${s.root()} data-testid="one">
						<ol ${s.list()}>
							${s.steps.map((step) => html`<li ${s.item(step.id)}><button ${s.trigger(step.id)}>${step.title}</button></li>`)}
						</ol>
						<button ${s.next()}>Continue</button>
					</div>
					<div ${o.root()} data-testid="two">
						<ol ${o.list()}>
							${o.steps.map((step) => html`<li ${o.item(step.id)}><button ${o.trigger(step.id)}>${step.title}</button></li>`)}
						</ol>
						<button ${o.next()}>Next</button>
					</div>
				`;
			}
			case "vertical":
				return html`
					<div ${s.root()}>
						<ol ${s.list({ orientation: "vertical" })}>
							${s.steps.map((step) => html`<li ${s.item(step.id)}><button ${s.trigger(step.id)}>${step.title}</button></li>`)}
						</ol>
					</div>
				`;
			default:
				return nothing;
		}
	}
}
customElements.define("sz-scenario", Scenario);

/** Parts rendered by a child component, in its own shadow root: a list with triggers. */
export class ChildList extends LitElement {
	static properties = { stepper: { attribute: false } };
	declare stepper: StepperPrimitives<typeof steps>;

	render() {
		const s = this.stepper;
		return html`
			<ol ${s.list()}>
				${s.steps.map((step) => html`<li ${s.item(step.id)}><button ${s.trigger(step.id)}>${step.title}</button></li>`)}
			</ol>
		`;
	}
}
customElements.define("sz-child-list", ChildList);

/** One trigger rendered by a child component inside an item of the host's list. */
export class ChildTrigger extends LitElement {
	static properties = { stepper: { attribute: false }, step: { attribute: false } };
	declare stepper: StepperPrimitives<typeof steps>;
	declare step: (typeof steps)[number]["id"];

	render() {
		return html`<button ${this.stepper.trigger(this.step)}>${this.step}</button>`;
	}
}
customElements.define("sz-child-trigger", ChildTrigger);

/** Back and Continue rendered by a child component. */
export class ChildNav extends LitElement {
	static properties = { stepper: { attribute: false } };
	declare stepper: StepperPrimitives<typeof steps>;

	render() {
		const s = this.stepper;
		return html`<button ${s.prev()}>Back</button><button ${s.next()}>Continue</button>`;
	}
}
customElements.define("sz-child-nav", ChildNav);

/** A controller that follows whatever flow its property holds, as one consumed from `@lit/context` does. */
export class Follower extends LitElement {
	static properties = { flow: { attribute: false } };
	declare flow: Flow<typeof steps> | undefined;
	renders = 0;
	stepper = flow.controller(this, () => this.flow);

	render() {
		this.renders++;
		const s = this.stepper;
		return html`
			<div ${s.root()}>
				<ol ${s.list()}>
					${s.steps.map((step) => html`<li ${s.item(step.id)}><button ${s.trigger(step.id)}>${step.title}</button></li>`)}
				</ol>
				<output>${s.value.current.id}</output>
			</div>
		`;
	}
}
customElements.define("sz-follower", Follower);

/**
 * What the server guide recommends: what the first paint needs (which panel shows, button types)
 * is written as bindings, which the server renders; the directives add the rest on hydration.
 */
export class Served extends LitElement {
	static properties = { options: { attribute: false } };
	declare options: StepOptions;
	renders = 0;
	stepper = flow.controller(this, () => this.options);

	render() {
		this.renders++;
		const s = this.stepper;
		const current = s.value.current.id;
		return html`
			<div ${s.root()}>
				<ol ${s.list()}>
					${s.steps.map(
						(step) => html`
							<li ${s.item(step.id)} data-state=${s.at(step.id).state}>
								<button type="button" ${s.trigger(step.id)}>${step.title}</button>
							</li>
						`,
					)}
				</ol>
				${s.steps.map(
					(step) => html`
						<section ${s.content(step.id)} ?hidden=${current !== step.id}>
							<label>${step.title} name <input /></label>
						</section>
					`,
				)}
				<button type="button" ${s.prev()}>Back</button>
				<button type="button" ${s.next()}>Continue</button>
			</div>
		`;
	}
}
customElements.define("sz-served", Served);
