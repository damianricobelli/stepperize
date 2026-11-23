import { html, LitElement, nothing } from "lit";
import { defineStepper, type Options } from "../index";

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
	stepper = flow.controller(this, () => this.options);

	render() {
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
	static properties = { name: {}, show: { type: Boolean }, options: { attribute: false } };
	declare name: string;
	declare show: boolean;
	declare options: StepOptions;
	stepper = flow.controller(this, () => this.options);
	checked = checked.controller(this);

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
			default:
				return nothing;
		}
	}
}
customElements.define("sz-scenario", Scenario);
