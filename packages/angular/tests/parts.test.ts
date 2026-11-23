import { ChangeDetectionStrategy, Component, type ComponentRef, input, signal, type Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { STEPPER_PRIMITIVES } from "@stepperize/angular";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { flow } from "./fixtures";

afterEach(() => TestBed.resetTestingModule());

async function mount<C>(component: Type<C>, inputs: Record<string, unknown> = {}) {
	const fixture = TestBed.createComponent(component) as ComponentFixture<C>;
	document.body.appendChild(fixture.nativeElement);
	for (const [name, value] of Object.entries(inputs)) (fixture.componentRef as ComponentRef<C>).setInput(name, value);
	await fixture.whenStable();
	return fixture;
}
const settle = async (fixture: ComponentFixture<unknown>) => {
	await new Promise((resolve) => setTimeout(resolve));
	await fixture.whenStable();
};
const button = (name: string) => screen.getByRole("button", { name }).element() as HTMLElement;

describe("attributes you write", () => {
	@Component({
		imports: [STEPPER_PRIMITIVES],
		template: `
			<div [stepperRoot]="stepper" role="region" aria-label="Checkout">
				<ol stepperList role="list">
					<li stepperItem="first" role="listitem"><button stepperTrigger type="submit">First</button></li>
					<li stepperItem="second"><button stepperTrigger>Second</button></li>
				</ol>
				<div stepperContent="first" tabindex="-1" aria-label="Your details">One</div>
				<div stepperContent="second" aria-labelledby="mine">Two</div>
				<input type="button" stepperNext value="Continue" />
			</div>
		`,
	})
	class Authored {
		readonly stepper = flow.injectStepper();
	}

	it("win over the ones the root, list, item and panel would set", async () => {
		const fixture = await mount(Authored);
		const container: HTMLElement = fixture.nativeElement;
		const root = container.querySelector('[data-component="stepper"]');
		expect([root?.getAttribute("role"), root?.getAttribute("aria-label")]).toEqual(["region", "Checkout"]);
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("list");
		expect(Array.from(container.querySelectorAll("li"), (item) => item.getAttribute("role"))).toEqual([
			"listitem",
			"presentation",
		]);
		const [first, second] = Array.from(container.querySelectorAll<HTMLElement>('[data-component="stepper-content"]'));
		expect([first.getAttribute("tabindex"), first.getAttribute("aria-label")]).toEqual(["-1", "Your details"]);
		expect(second.getAttribute("aria-labelledby")).toBe("mine");
	});

	it("on buttons, only the type is yours: an input keeps type=button", async () => {
		const fixture = await mount(Authored);
		const container: HTMLElement = fixture.nativeElement;
		const next = container.querySelector("input") as HTMLInputElement;
		expect([next.type, next.dataset.component]).toEqual(["button", "stepper-next"]);
		expect(container.querySelector("button")?.type).toBe("submit");
		expect(container.querySelectorAll("button")[1].type).toBe("button");
		await userEvent.click(next);
		await fixture.whenStable();
		expect(fixture.componentInstance.stepper().current.id).toBe("second");
	});
});

describe("clicks", () => {
	@Component({
		imports: [STEPPER_PRIMITIVES],
		template: `
			<div [stepperRoot]="stepper" (click)="outside = outside + 1">
				<nav stepperList>
					<a href="#second" stepperTrigger="second" disabled>Second</a>
					<a href="#third" stepperTrigger="third">Third</a>
				</nav>
				<a role="button" href="#next" stepperNext disabled>Skip</a>
				<div role="button" stepperPrev>Back</div>
				<button stepperNext (click)="$event.stopPropagation()">Continue</button>
			</div>
		`,
	})
	class Clicks {
		readonly stepper = flow.injectStepper();
		outside = 0;
	}

	it("a part disabled on a link or a div does nothing, and gets aria-disabled, not disabled", async () => {
		const fixture = await mount(Clicks);
		const { stepper } = fixture.componentInstance;
		const [second, third] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll("nav a"));
		expect([second.hasAttribute("disabled"), second.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		const skip = button("Skip");
		expect([skip.hasAttribute("disabled"), skip.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		const back = button("Back");
		expect([back.hasAttribute("disabled"), back.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		for (const part of [second, skip, back]) (part as HTMLElement).click();
		await settle(fixture);
		expect(stepper().current.id).toBe("first");
		(third as HTMLElement).click();
		await settle(fixture);
		expect(stepper().current.id).toBe("third");
		back.click();
		await settle(fixture);
		expect(stepper().current.id).toBe("first");
	});

	it("stopPropagation in your own (click) does not stop the part", async () => {
		const fixture = await mount(Clicks);
		await userEvent.click(button("Continue"));
		await settle(fixture);
		expect(fixture.componentInstance.stepper().current.id).toBe("second");
		expect(fixture.componentInstance.outside).toBe(0);
	});
});

describe("panels", () => {
	@Component({
		imports: [STEPPER_PRIMITIVES],
		styles: ".panel { display: flex; }",
		template: `
			<div [stepperRoot]="stepper">
				<div class="panel" stepperContent="first">One</div>
				<div class="panel" stepperContent="second" #panel="stepperContent">
					@if (panel.active()) {
						<span data-testid="lazy">Two</span>
					}
				</div>
			</div>
		`,
	})
	class Panels {
		readonly stepper = flow.injectStepper();
	}

	it("an inactive panel stays hidden whatever display your styles give it", async () => {
		const fixture = await mount(Panels);
		const [first, second] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(".panel"));
		expect([getComputedStyle(first).display, getComputedStyle(second).display]).toEqual(["flex", "none"]);
		await fixture.componentInstance.stepper().next();
		await fixture.whenStable();
		expect([getComputedStyle(first).display, getComputedStyle(second).display]).toEqual(["none", "flex"]);
		expect([first.hidden, second.hidden]).toEqual([true, false]);
	});

	it("exports whether it is active, to leave its content out with @if", async () => {
		const fixture = await mount(Panels);
		const lazy = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="lazy"]');
		expect(lazy()).toBe(null);
		await fixture.componentInstance.stepper().next();
		await fixture.whenStable();
		expect(lazy()?.textContent).toBe("Two");
	});
});

describe("the root", () => {
	@Component({ selector: "sz-current", template: "<output>{{ stepper().current.id }}</output>" })
	class Current {
		readonly stepper = flow.injectStepperContext();
	}

	@Component({
		imports: [STEPPER_PRIMITIVES, Current],
		template: `
			<div [stepperRoot]="useOther() ? other : stepper">
				<sz-current />
				<ol stepperList>
					@for (step of stepper.steps; track step.id) {
						<li [stepperItem]="step.id"><button stepperTrigger>{{ step.title }}</button></li>
					}
				</ol>
				<button stepperNext>Continue</button>
			</div>
		`,
	})
	class Rebound {
		readonly stepper = flow.injectStepper();
		readonly other = flow.injectStepper({ linear: true, snapshot: { step: "third", complete: ["first", "second"] } });
		readonly useOther = signal(false);
	}

	it("provides its stepper to the components inside it", async () => {
		const fixture = await mount(Rebound);
		const output = () => (fixture.nativeElement as HTMLElement).querySelector("output")?.textContent;
		expect(output()).toBe("first");
		await fixture.componentInstance.stepper().next();
		await fixture.whenStable();
		expect(output()).toBe("second");
	});

	it("follows another stepper bound to it, its linear included, without announcing a step change", async () => {
		const fixture = await mount(Rebound);
		const container: HTMLElement = fixture.nativeElement;
		const { other, stepper } = fixture.componentInstance;
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		fixture.componentInstance.useOther.set(true);
		await settle(fixture);
		expect(container.querySelector("output")?.textContent).toBe("third");
		// The other flow is linear: a list of steps, not tabs.
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect(container.querySelector('[aria-current="step"]')?.textContent).toBe("Third");
		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe("");
		await userEvent.click(button("Continue"));
		await settle(fixture);
		expect([other().isFinished, stepper().current.id]).toEqual([true, "first"]);
	});
});

describe("lifecycle", () => {
	@Component({
		imports: [STEPPER_PRIMITIVES],
		template: `
			<div [stepperRoot]="stepper">
				<div stepperContent="first"><input aria-label="Name" /></div>
				<div stepperContent="second">Two</div>
				<button stepperNext>Continue</button>
			</div>
		`,
	})
	class Pending {
		readonly stepper = flow.injectStepper({ guard: () => new Promise<boolean>((resolve) => (this.release = resolve)) });
		release!: (allowed: boolean) => void;
	}

	it("a root destroyed while a move is pending leaves nothing behind", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const fixture = await mount(Pending);
		const { flow: owned } = fixture.componentInstance.stepper;
		(fixture.nativeElement as HTMLElement).querySelector("input")?.focus();
		await userEvent.click(button("Continue"));
		await settle(fixture);
		expect(owned.isPending).toBe(true);
		const { release } = fixture.componentInstance;
		fixture.destroy();
		release(true);
		await new Promise((resolve) => setTimeout(resolve));
		// The move was cancelled: the guard's answer arrives to nobody.
		expect(owned.current.id).toBe("first");
		expect(document.querySelector('[aria-live="polite"]')).toBe(null);
		expect(errors).not.toHaveBeenCalled();
		errors.mockRestore();
	});
});

describe("render counts", () => {
	const renders: Record<string, number> = {};

	@Component({
		selector: "sz-counted",
		imports: [STEPPER_PRIMITIVES],
		changeDetection: ChangeDetectionStrategy.OnPush,
		template: `
			<li [stepperItem]="step()" #item="stepperItem">
				<button stepperTrigger><span stepperIndicator></span>{{ count() }}{{ item.value().state }}</button>
			</li>
		`,
	})
	class Counted {
		readonly step = input.required<"first" | "second" | "third">();
		count() {
			renders[this.step()] = (renders[this.step()] ?? 0) + 1;
			return "";
		}
	}

	@Component({
		imports: [STEPPER_PRIMITIVES, Counted],
		changeDetection: ChangeDetectionStrategy.OnPush,
		template: `
			<div [stepperRoot]="stepper">
				<ol stepperList>
					<sz-counted step="first" />
					<sz-counted step="second" />
					<sz-counted step="third" />
				</ol>
			</div>
		`,
	})
	class Counter {
		readonly stepper = flow.injectStepper();
	}

	it("a change re-renders only the steps it changes", async () => {
		const fixture = await mount(Counter);
		const { stepper } = fixture.componentInstance;
		const start = { ...renders };
		const since = () =>
			Object.fromEntries(Object.entries(renders).map(([step, count]) => [step, count - (start[step] ?? 0)]));
		// Data of a step that changes nothing it shows: nothing renders.
		stepper().setData("third", "draft");
		await fixture.whenStable();
		expect(since()).toEqual({ first: 0, second: 0, third: 0 });
		// A move changes the two steps it leaves and reaches.
		await stepper().next();
		await fixture.whenStable();
		expect(since()).toEqual({ first: 1, second: 1, third: 0 });
	});
});
