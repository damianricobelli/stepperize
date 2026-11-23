import {
	Component,
	computed,
	createEnvironmentInjector,
	EnvironmentInjector,
	effect,
	InjectionToken,
	inject,
	input,
	runInInjectionContext,
	signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { defineStepper, type Options } from "@stepperize/angular/headless";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => TestBed.resetTestingModule());

const steps = [
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
	{ id: "c", title: "C" },
] as const;
const flow = defineStepper(steps);
const linear = defineStepper(steps, { linear: true });

@Component({ selector: "sz-owner", template: "<output>{{ stepper().current.title }}</output>" })
class Owner {
	readonly options = signal<Options<typeof steps>>({});
	readonly stepper = flow.injectStepper(() => this.options());
}

@Component({ selector: "sz-reader", template: "<output>{{ stepper().current.id }}</output>" })
class Reader {
	readonly stepper = flow.injectStepperContext();
	readonly id = computed(() => this.stepper().current.id);
	readonly seen: string[] = [];
	constructor() {
		effect(() => this.seen.push(this.id()));
	}
}

@Component({
	selector: "sz-provider",
	imports: [Reader],
	providers: [flow.provideStepper({ snapshot: { step: "b" } })],
	template: "<sz-reader />",
})
class Provider {
	readonly stepper = flow.injectStepperContext();
}

const START = new InjectionToken<"a" | "b" | "c">("start", { factory: () => "c" });

@Component({
	selector: "sz-injecting",
	imports: [Reader],
	providers: [flow.provideStepper(() => ({ snapshot: { step: inject(START) } }))],
	template: "<sz-reader />",
})
class Injecting {}

@Component({
	selector: "sz-orphan",
	imports: [Reader],
	providers: [linear.provideStepper()],
	template: "<sz-reader />",
})
class Orphan {}

/** The URL in a signal, kept in sync with a linear flow in both directions. */
@Component({ selector: "sz-routed", template: "{{ stepper().current.id }}" })
class Routed {
	readonly param = signal("c");
	readonly stepper = linear.injectStepper(() => ({
		step: this.param(),
		onChange: (snapshot) => {
			if (snapshot.step !== this.param()) this.param.set(snapshot.step);
		},
		onInvalidStep: (current) => this.param.set(current),
	}));
}

describe("injectStepper", () => {
	it("owns a flow and gives a new immutable view on every change", async () => {
		const fixture = TestBed.createComponent(Owner);
		await fixture.whenStable();
		const { stepper } = fixture.componentInstance;
		const first = stepper();
		await first.next("draft");
		await fixture.whenStable();
		expect(stepper()).not.toBe(first);
		expect(stepper().current.id).toBe("b");
		expect(stepper().data).toEqual({ a: "draft" });
		expect(first.current.id).toBe("a");
		expect(fixture.nativeElement.querySelector("output").textContent).toBe("B");
		expect(stepper.steps).toBe(steps);
	});

	it("starts from a snapshot and always calls the latest callbacks", async () => {
		const seen: string[] = [];
		const options = signal<Options<typeof steps>>({
			snapshot: { step: "b" },
			onChange: (snapshot) => seen.push(`one:${snapshot.step}`),
		});
		@Component({ template: "" })
		class Host {
			readonly stepper = flow.injectStepper(() => options());
		}
		const fixture = TestBed.createComponent(Host);
		await fixture.whenStable();
		expect(fixture.componentInstance.stepper().current.id).toBe("b");
		options.set({ onChange: (snapshot) => seen.push(`two:${snapshot.step}`) });
		await fixture.whenStable();
		await fixture.componentInstance.stepper().next();
		expect(seen).toEqual(["two:c"]);
	});

	it("follows an option that shapes the view", async () => {
		const fixture = TestBed.createComponent(Owner);
		const { stepper, options } = fixture.componentInstance;
		options.set({ linear: true });
		await fixture.whenStable();
		expect([stepper().canGoTo("c"), stepper().isLinear]).toEqual([false, true]);
		options.set({ linear: false });
		await fixture.whenStable();
		expect([stepper().canGoTo("c"), stepper().isLinear]).toEqual([true, false]);
	});

	it("stops updating once its owner is destroyed", async () => {
		const fixture = TestBed.createComponent(Owner);
		await fixture.whenStable();
		const { stepper } = fixture.componentInstance;
		const { next } = stepper();
		fixture.destroy();
		await next();
		expect(stepper().current.id).toBe("a");
	});

	it("uses the definition's defaults and lets an instance override them", () => {
		const injector = TestBed.inject(EnvironmentInjector);
		const strict = runInInjectionContext(injector, () => linear.injectStepper());
		expect(strict().canGoTo("b")).toBe(false);
		const free = runInInjectionContext(injector, () => linear.injectStepper({ linear: false }));
		expect(free().canGoTo("b")).toBe(true);
	});

	it("works in a service, and is destroyed with its injector", async () => {
		const parent = TestBed.inject(EnvironmentInjector);
		const child = createEnvironmentInjector([], parent);
		const stepper = runInInjectionContext(child, () => {
			inject(EnvironmentInjector);
			return flow.injectStepper({ snapshot: { step: "b" } });
		});
		expect(stepper().current.id).toBe("b");
		const changes = vi.fn();
		stepper.flow.subscribe(changes);
		child.destroy();
		await stepper.flow.next();
		expect(changes).not.toHaveBeenCalled();
	});

	it("needs an injection context, and says which call needs it", () => {
		expect(() => flow.injectStepper()).toThrow(/injectStepper\(\).*injection context/);
		const { injectStepper } = flow;
		expect(() => injectStepper()).toThrow(/injectStepper\(\)/);
		expect(() => flow.injectStepperContext()).toThrow(/injectStepperContext\(\).*injection context/);
	});

	it("calls the callbacks and guard of the latest options, changed in the same tick", async () => {
		const seen: string[] = [];
		const options = signal<Options<typeof steps>>({ onChange: () => seen.push("old") });
		@Component({ template: "" })
		class Host {
			readonly stepper = flow.injectStepper(() => options());
		}
		const fixture = TestBed.createComponent(Host);
		await fixture.whenStable();
		const { stepper } = fixture.componentInstance;
		// No render, no effect in between.
		options.set({ onChange: () => seen.push("new"), guard: () => false });
		expect(await stepper().next()).toMatchObject({ accepted: false, reason: "guard" });
		options.set({ onChange: () => seen.push("newer") });
		await stepper().next();
		expect(seen).toEqual(["newer"]);
	});

	it("applies linear as soon as the stepper is read, and before the first render", async () => {
		const rendered: boolean[] = [];
		@Component({ template: "{{ log(stepper().canGoTo('c')) }}" })
		class Host {
			readonly linear = input(false);
			readonly stepper = flow.injectStepper(() => ({ linear: this.linear() }));
			log(reachable: boolean) {
				rendered.push(reachable);
				return reachable;
			}
		}
		const fixture = TestBed.createComponent(Host);
		fixture.componentRef.setInput("linear", true);
		await fixture.whenStable();
		// One render, already linear: options are not applied after it.
		expect(rendered).toEqual([false]);
		const { stepper } = fixture.componentInstance;
		fixture.componentRef.setInput("linear", false);
		expect([stepper().canGoTo("c"), stepper().isLinear]).toEqual([true, false]);
		expect((await stepper.flow.goTo("c")).accepted).toBe(true);
	});

	it("can be read before its inputs are set, and recovers once they are", async () => {
		const failures: unknown[] = [];
		@Component({ template: "<output>{{ stepper().current.id }}</output>" })
		class Host {
			readonly start = input.required<"a" | "b" | "c">();
			readonly stepper = flow.injectStepper(() => ({ snapshot: { step: this.start() } }));
			constructor() {
				// Too early: a required input throws until it is set (NG0950).
				try {
					this.stepper();
				} catch (error) {
					failures.push(error);
				}
			}
		}
		const fixture = TestBed.createComponent(Host);
		fixture.componentRef.setInput("start", "b");
		await fixture.whenStable();
		expect(String(failures[0])).toMatch(/NG0950/);
		expect(fixture.componentInstance.stepper().current.id).toBe("b");
		expect(fixture.nativeElement.querySelector("output").textContent).toBe("b");
	});

	it("tries again after creating the flow threw", () => {
		let calls = 0;
		const injector = TestBed.inject(EnvironmentInjector);
		const stepper = runInInjectionContext(injector, () =>
			flow.injectStepper(() => {
				if (!calls++) throw new Error("not ready");
				return { snapshot: { step: "c" } };
			}),
		);
		expect(() => stepper()).toThrow("not ready");
		// Not through the signal, which is where the failure would otherwise stick.
		expect(stepper.flow.current.id).toBe("c");
		expect(stepper().current.id).toBe("c");
	});

	it("cancels a running move when its owner is destroyed, without calling back", async () => {
		let aborted = false;
		const onChange = vi.fn();
		@Component({ template: "" })
		class Host {
			readonly stepper = flow.injectStepper({
				onChange,
				guard: ({ signal }) =>
					new Promise<boolean>((resolve) => {
						signal.addEventListener("abort", () => {
							aborted = true;
							resolve(true);
						});
					}),
			});
		}
		const fixture = TestBed.createComponent(Host);
		await fixture.whenStable();
		const { stepper } = fixture.componentInstance;
		const move = stepper().next();
		await fixture.whenStable();
		expect(stepper().isPending).toBe(true);
		fixture.destroy();
		expect(await move).toEqual({ accepted: false, reason: "cancelled" });
		expect(aborted).toBe(true);
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe("provideStepper and injectStepperContext", () => {
	it("shares one flow with a component and everything below it", async () => {
		const fixture = TestBed.createComponent(Provider);
		await fixture.whenStable();
		const reader = fixture.debugElement.children[0].componentInstance as Reader;
		expect(reader.stepper).toBe(fixture.componentInstance.stepper);
		expect(reader.seen).toEqual(["b"]);
		// A computed only changes when its result does.
		reader.stepper().setData("a", 1);
		await fixture.whenStable();
		expect(reader.seen).toEqual(["b"]);
		await reader.stepper().next();
		await fixture.whenStable();
		expect(reader.seen).toEqual(["b", "c"]);
		expect(fixture.nativeElement.querySelector("output").textContent).toBe("c");
	});

	it("reads its options where inject() works", async () => {
		const fixture = TestBed.createComponent(Injecting);
		await fixture.whenStable();
		expect(fixture.nativeElement.querySelector("output").textContent).toBe("c");
	});

	it("skips the providers of other definitions", async () => {
		@Component({
			selector: "sz-mixed",
			imports: [Reader],
			providers: [linear.provideStepper()],
			template: "<sz-reader />",
		})
		class Mixed {}
		@Component({
			imports: [Mixed],
			providers: [flow.provideStepper({ snapshot: { step: "c" } })],
			template: "<sz-mixed />",
		})
		class Outer {}
		const fixture = TestBed.createComponent(Outer);
		await fixture.whenStable();
		expect(fixture.nativeElement.querySelector("output").textContent).toBe("c");
	});

	it("throws a coded error without its own provider", () => {
		expect(() => TestBed.createComponent(Orphan)).toThrow(/SZ100/);
	});
});

describe("step", () => {
	it("keeps the flow and a URL in sync in both directions", async () => {
		const fixture = TestBed.createComponent(Routed);
		const { stepper, param } = fixture.componentInstance;
		const settle = async () => {
			await fixture.whenStable();
			await new Promise((resolve) => setTimeout(resolve));
			await fixture.whenStable();
		};
		// A deep link to a step that is not reachable yet is corrected.
		await settle();
		expect([stepper().current.id, param()]).toEqual(["a", "a"]);
		// The flow moves: the URL follows.
		await stepper().next();
		await settle();
		expect([stepper().current.id, param()]).toEqual(["b", "b"]);
		// The URL moves (the back button): the flow follows.
		param.set("a");
		await settle();
		expect([stepper().current.id, param()]).toEqual(["a", "a"]);
		// A hand-edited URL is corrected too.
		param.set("nope");
		await settle();
		expect([stepper().current.id, param()]).toEqual(["a", "a"]);
	});
});

describe("create", () => {
	it("returns the same state machine without Angular", async () => {
		const standalone = flow.create({ snapshot: { step: "c" } });
		expect(standalone.current.id).toBe("c");
		expect(await standalone.next()).toMatchObject({ accepted: true, to: null });
	});
});
