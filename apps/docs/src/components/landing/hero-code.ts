import type { DocsFramework } from "@/lib/frameworks";
import { type Token, tokenize } from "./code";

/**
 * The hero playground's source, once per framework. Every version is the same
 * flow (four steps, one guard that checks the email and awaits the order) in
 * that binding's own idiom, taken from its "first stepper" guide and checked
 * against the package's types:
 *
 * - React, Vue, Svelte, Solid: `checkout.useStepper(options)`.
 * - Angular: `checkout.injectStepper(options)` in a field, read as a signal.
 * - Lit: `checkout.controller(this, options)`, read through `.value`.
 * - HTML: `createStepper` from the core, bound to markup by `bindStepper`.
 * - Core: `createStepper` and `subscribe`, with no framework at all.
 *
 * The live preview is the React binding running that same core flow, so its
 * state (step, guard, pending) is honest for every version. The highlighted
 * lines are found by content below, not counted by hand, so editing a snippet
 * cannot silently point the highlight at the wrong line.
 */

const STEPS = `{ id: "account", title: "Account" },
{ id: "shipping", title: "Shipping" },
{ id: "review", title: "Review" },
{ id: "done", title: "Done" },`;

const indent = (code: string, spaces: number) =>
	code.replace(/^/gm, " ".repeat(spaces));

const guard = (email: string, spaces: number) =>
	indent(
		`if (direction === "prev") return true;
if (from.id === "account") return isEmail(${email});
if (from.id === "review") await placeOrder();`,
		spaces,
	);

type Snippet = {
	file: string;
	code: string;
	/** A line that renders each step, in step order. */
	render: [string, string, string, string];
};

const SNIPPETS: Record<DocsFramework, Snippet> = {
	react: {
		file: "checkout.tsx",
		code: `import { defineStepper } from "@stepperize/react";
import { useState } from "react";

const checkout = defineStepper([
${indent(STEPS, 2)}
]);

export function Checkout() {
  const [email, setEmail] = useState("");
  const stepper = checkout.useStepper({
    async guard({ from, direction }) {
${guard("email", 6)}
    },
  });

  return stepper.match({
    account: () => <Account onEmail={setEmail} />,
    shipping: () => <Shipping />,
    review: () => <Review />,
    done: () => <Done />,
  });
}`,
		render: [
			"account: () =>",
			"shipping: () =>",
			"review: () =>",
			"done: () =>",
		],
	},
	vue: {
		file: "Checkout.vue",
		code: `<script setup lang="ts">
import { defineStepper } from "@stepperize/vue";
import { ref } from "vue";

const checkout = defineStepper([
${indent(STEPS, 2)}
]);

const email = ref("");
const stepper = checkout.useStepper({
  async guard({ from, direction }) {
${guard("email.value", 4)}
  },
});
</script>

<template>
  <Account v-if="stepper.current.id === 'account'" v-model="email" />
  <Shipping v-else-if="stepper.current.id === 'shipping'" />
  <Review v-else-if="stepper.current.id === 'review'" />
  <Done v-else />
</template>`,
		render: ["<Account", "<Shipping", "<Review", "<Done"],
	},
	svelte: {
		file: "Checkout.svelte",
		code: `<script lang="ts">
  import { defineStepper } from "@stepperize/svelte";

  const checkout = defineStepper([
${indent(STEPS, 4)}
  ]);

  let email = $state("");
  const stepper = checkout.useStepper({
    async guard({ from, direction }) {
${guard("email", 6)}
    },
  });
</script>

{#if stepper.current.id === "account"}
  <Account bind:email />
{:else if stepper.current.id === "shipping"}
  <Shipping />
{:else if stepper.current.id === "review"}
  <Review />
{:else}
  <Done />
{/if}`,
		render: ["<Account", "<Shipping", "<Review", "<Done"],
	},
	solid: {
		file: "Checkout.tsx",
		code: `import { defineStepper } from "@stepperize/solid";
import { createSignal, Match, Switch } from "solid-js";

const checkout = defineStepper([
${indent(STEPS, 2)}
]);

export function Checkout() {
  const [email, setEmail] = createSignal("");
  const stepper = checkout.useStepper({
    async guard({ from, direction }) {
${guard("email()", 6)}
    },
  });

  return (
    <Switch>
      <Match when={stepper.current.id === "account"}>
        <Account onEmail={setEmail} />
      </Match>
      <Match when={stepper.current.id === "shipping"}><Shipping /></Match>
      <Match when={stepper.current.id === "review"}><Review /></Match>
      <Match when={stepper.current.id === "done"}><Done /></Match>
    </Switch>
  );
}`,
		render: ["<Account", "<Shipping", "<Review", "<Done"],
	},
	angular: {
		file: "checkout.component.ts",
		code: `import { Component, signal } from "@angular/core";
import { defineStepper } from "@stepperize/angular";

const checkout = defineStepper([
${indent(STEPS, 2)}
]);

@Component({
  selector: "app-checkout",
  imports: [Account, Shipping, Review, Done],
  template: \`
    @switch (stepper().current.id) {
      @case ("account") { <app-account [(email)]="email" /> }
      @case ("shipping") { <app-shipping /> }
      @case ("review") { <app-review /> }
      @case ("done") { <app-done /> }
    }
  \`,
})
export class Checkout {
  readonly email = signal("");
  readonly stepper = checkout.injectStepper({
    guard: async ({ from, direction }) => {
${guard("this.email()", 6)}
    },
  });
}`,
		render: [
			'@case ("account")',
			'@case ("shipping")',
			'@case ("review")',
			'@case ("done")',
		],
	},
	lit: {
		file: "checkout-flow.ts",
		code: `import { defineStepper } from "@stepperize/lit";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

const checkout = defineStepper([
${indent(STEPS, 2)}
]);

@customElement("checkout-flow")
export class CheckoutFlow extends LitElement {
  email = "";
  stepper = checkout.controller(this, {
    guard: async ({ from, direction }) => {
${guard("this.email", 6)}
    },
  });

  render() {
    return this.stepper.value.match({
      account: () => html\`<account-step @email=\${this.onEmail}></account-step>\`,
      shipping: () => html\`<shipping-step></shipping-step>\`,
      review: () => html\`<review-step></review-step>\`,
      done: () => html\`<done-step></done-step>\`,
    });
  }

  onEmail = (event: CustomEvent<string>) => (this.email = event.detail);
}`,
		render: [
			"account: () =>",
			"shipping: () =>",
			"review: () =>",
			"done: () =>",
		],
	},
	html: {
		file: "checkout.html",
		code: `<div data-component="stepper" id="checkout">
  <div data-component="stepper-content" data-step="account">…</div>
  <div data-component="stepper-content" data-step="shipping">…</div>
  <div data-component="stepper-content" data-step="review">…</div>
  <div data-component="stepper-content" data-step="done">…</div>
  <button data-component="stepper-next">Continue</button>
</div>

<script type="module">
  import { createStepper } from "@stepperize/core";
  import { bindStepper } from "@stepperize/core/dom";

  const email = document.getElementById("email");
  const flow = createStepper([
${indent(STEPS, 4)}
  ], {
    async guard({ from, direction }) {
${guard("email.value", 6)}
    },
  });

  bindStepper(document.getElementById("checkout"), flow);
</script>`,
		render: [
			'data-step="account"',
			'data-step="shipping"',
			'data-step="review"',
			'data-step="done"',
		],
	},
	core: {
		file: "checkout.ts",
		code: `import { createStepper } from "@stepperize/core";

const flow = createStepper([
${indent(STEPS, 2)}
], {
  async guard({ from, direction }) {
${guard("emailInput.value", 4)}
  },
});

flow.subscribe(() =>
  render(
    flow.match({
      account: () => accountView(),
      shipping: () => shippingView(),
      review: () => reviewView(),
      done: () => doneView(),
    }),
  ),
);`,
		render: [
			"account: () =>",
			"shipping: () =>",
			"review: () =>",
			"done: () =>",
		],
	},
};

/** 0-based lines the live state points at. */
export type LineMap = {
	/** The definition of each step, in step order. */
	steps: number[];
	/** Where each step is rendered, in step order. */
	render: number[];
	guard: { prev: number; email: number; order: number };
};

export type HeroSource = {
	file: string;
	lines: Token[][];
	map: LineMap;
};

function lineOf(code: string[], needle: string) {
	const index = code.findIndex((line) => line.includes(needle));
	if (index === -1) throw new Error(`Hero snippet: no line has "${needle}".`);
	return index;
}

function build({ file, code, render }: Snippet): HeroSource {
	const raw = code.split("\n");
	return {
		file,
		lines: tokenize(code),
		map: {
			steps: ["account", "shipping", "review", "done"].map((id) =>
				lineOf(raw, `{ id: "${id}"`),
			),
			render: render.map((needle) => lineOf(raw, needle)),
			guard: {
				prev: lineOf(raw, `direction === "prev"`),
				email: lineOf(raw, `from.id === "account"`),
				order: lineOf(raw, `from.id === "review"`),
			},
		},
	};
}

// Static: tokenized once at module load, never per render.
export const HERO_SOURCES = Object.fromEntries(
	Object.entries(SNIPPETS).map(([id, snippet]) => [id, build(snippet)]),
) as Record<DocsFramework, HeroSource>;

/** The longest snippet, so switching framework never changes the pane's height. */
export const HERO_MAX_LINES = Math.max(
	...Object.values(HERO_SOURCES).map((source) => source.lines.length),
);
