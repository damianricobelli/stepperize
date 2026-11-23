import { html, LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineStepper, type Options, StepperController } from "../headless";

const steps = [
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
] as const;
const flow = defineStepper(steps);
const linear = defineStepper(steps, { linear: true });

class Owner extends LitElement {
	static properties = { options: { attribute: false }, param: {} };
	declare options: Options<typeof steps> | undefined;
	declare param: string | undefined;
	renders = 0;
	stepper = flow.controller(this, () => this.options);

	render() {
		this.renders++;
		return html`<output>${this.stepper.value.current.title}</output>`;
	}
}
customElements.define("sz-owner", Owner);

/** The URL in a property, kept in sync with a linear flow in both directions. */
class Routed extends LitElement {
	static properties = { param: {} };
	declare param: string;
	stepper = linear.controller(this, () => ({
		step: this.param,
		onChange: (snapshot) => {
			if (snapshot.step !== this.param) this.param = snapshot.step;
		},
		onInvalidStep: (current) => {
			this.param = current;
		},
	}));

	render() {
		return html`${this.stepper.value.current.id}`;
	}
}
customElements.define("sz-routed", Routed);

const mounted: Element[] = [];
afterEach(() => {
	for (const element of mounted.splice(0)) element.remove();
});

async function mount<E extends LitElement>(tag: string, props: Partial<E> = {}) {
	const element = Object.assign(document.createElement(tag), props) as E;
	document.body.appendChild(element);
	mounted.push(element);
	await element.updateComplete;
	return element;
}
const settle = async (element: LitElement) => {
	await element.updateComplete;
	await new Promise((resolve) => setTimeout(resolve));
	await element.updateComplete;
};

describe("controller", () => {
	it("owns a flow and updates the host with a new immutable view on every change", async () => {
		const element = await mount<Owner>("sz-owner");
		const first = element.stepper.value;
		expect(element.stepper).toBeInstanceOf(StepperController);
		await first.next("draft");
		await element.updateComplete;
		expect(element.stepper.value).not.toBe(first);
		expect(element.stepper.value.current.id).toBe("b");
		expect(element.stepper.value.data).toEqual({ a: "draft" });
		expect(first.current.id).toBe("a");
		expect(element.shadowRoot?.querySelector("output")?.textContent).toBe("B");
	});

	it("starts from a snapshot set as a property and always calls the latest callbacks", async () => {
		const seen: string[] = [];
		const element = await mount<Owner>("sz-owner", {
			options: { snapshot: { step: "b" }, onChange: (snapshot) => seen.push(`one:${snapshot.step}`) },
		});
		expect(element.stepper.value.current.id).toBe("b");
		element.options = { onChange: (snapshot) => seen.push(`two:${snapshot.step}`) };
		await element.updateComplete;
		await element.stepper.value.next();
		expect(seen).toEqual(["two:c"]);
	});

	it("follows an option that shapes the view", async () => {
		const element = await mount<Owner>("sz-owner", { options: { linear: true } });
		expect(element.stepper.value.canGoTo("c")).toBe(false);
		element.options = { linear: false };
		await element.updateComplete;
		expect(element.stepper.value.canGoTo("c")).toBe(true);
	});

	it("stops updating the host once it is disconnected", async () => {
		const element = await mount<Owner>("sz-owner");
		const { next } = element.stepper.value;
		element.remove();
		const before = element.renders;
		await next();
		await element.updateComplete;
		expect(element.renders).toBe(before);
	});

	it("catches up with what the flow did while the host was away", async () => {
		const element = await mount<Owner>("sz-owner");
		element.remove();
		await element.stepper.flow.next();
		document.body.appendChild(element);
		await settle(element);
		expect(element.shadowRoot?.textContent).toBe("B");
	});

	it("uses the definition's defaults and lets a host override them", async () => {
		const strict = linear.controller(await mount<Owner>("sz-owner"));
		expect(strict.value.canGoTo("b")).toBe(false);
		const free = linear.controller(await mount<Owner>("sz-owner"), { linear: false });
		expect(free.value.canGoTo("b")).toBe(true);
	});

	it("shares one flow between hosts", async () => {
		const shared = flow.create();
		const [one, two] = [await mount<Owner>("sz-owner"), await mount<Owner>("sz-owner")];
		const controllers = [flow.controller(one, shared), flow.controller(two, shared)];
		// Controllers added after the host connected are connected by Lit right away.
		const updates = [vi.spyOn(one, "requestUpdate"), vi.spyOn(two, "requestUpdate")];
		await controllers[0].value.next();
		expect(controllers[1].value.current.id).toBe("b");
		expect(updates.every((spy) => spy.mock.calls.length > 0)).toBe(true);
		// A follower never replaces the options of a flow it does not own.
		const setOptions = vi.spyOn(shared, "setOptions");
		await one.updateComplete;
		expect(setOptions).not.toHaveBeenCalled();
	});
});

describe("step", () => {
	it("keeps the flow and a URL in sync in both directions", async () => {
		const element = await mount<Routed>("sz-routed", { param: "c" });
		const api = () => element.stepper.value;
		// A deep link to a step that is not reachable yet is corrected.
		await settle(element);
		expect([api().current.id, element.param]).toEqual(["a", "a"]);
		// The flow moves: the URL follows.
		await api().next();
		await settle(element);
		expect([api().current.id, element.param]).toEqual(["b", "b"]);
		// The URL moves (the back button): the flow follows.
		element.param = "a";
		await settle(element);
		expect([api().current.id, element.param]).toEqual(["a", "a"]);
		// A hand-edited URL is corrected too.
		element.param = "nope";
		await settle(element);
		expect([api().current.id, element.param]).toEqual(["a", "a"]);
	});
});

describe("create", () => {
	it("returns the same state machine without Lit", async () => {
		const standalone = flow.create({ snapshot: { step: "c" } });
		expect(standalone.current.id).toBe("c");
		expect(await standalone.next()).toMatchObject({ accepted: true, to: null });
	});
});
