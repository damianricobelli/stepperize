/**
 * Plain-text Q&A pairs mirrored from
 * `content/docs/docs/latest/getting-started/faq.mdx`, used to emit
 * `FAQPage` JSON-LD so the FAQ can surface as a rich result. Keep in sync with
 * the MDX when questions change.
 */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
	{
		question: "Is Stepperize a form library?",
		answer:
			"No. Stepperize owns the flow — which step is active and how you move between steps, plus optional per-step drafts. Keep field state, validation and errors in your form library (React Hook Form, Conform, TanStack Form). They compose well.",
	},
	{
		question: "Does it ship any styles or markup?",
		answer:
			"No. The flat useStepper instance is logic only. The Stepper.* primitives render unstyled elements with accessibility wiring and data-* attributes, so you bring your own CSS. Ready-made looks are available in Blocks.",
	},
	{
		question: "How is status different from completion?",
		answer:
			"stepper.status(id) is positional and derived from the current index: active, previous or upcoming. stepper.isComplete(id) is business state you set explicitly with setComplete(id). A step the user walked past is previous, but it is not completed until you say so.",
	},
	{
		question: "Do I need @stepperize/core?",
		answer:
			"Not for React apps. @stepperize/react depends on it and re-exports the common types. Reach for core only when you need its pure helpers in non-React code such as loaders, tests or adapters.",
	},
	{
		question: "When should I use Provider vs Stepper.Root vs plain useStepper?",
		answer:
			"Use useStepper() when one component owns the whole flow, the Provider when several components share one instance with your own markup, and Stepper.Root when you want shared state plus the accessible primitive components. All three produce the same flat instance.",
	},
	{
		question: "How do I sync the current step to the URL?",
		answer:
			"Make the step controlled and drive it from your router via the step option and onStepChange, navigating on change. The step option accepts raw URL strings; recover invalid values with onInvalidStep, and use parseStep when you need to narrow a raw value before another typed API.",
	},
	{
		question: "How do I validate a step before moving on?",
		answer:
			"Return false from beforeStepChange. It runs before the change commits and can be async, so you can validate against a schema. Validation that blocks navigation is a transition guard, and beforeStepChange is the transition guard.",
	},
	{
		question: "What does navigation return?",
		answer:
			"A boolean wrapped in a Promise: true if the step changed, false if it did not — at an edge, an unknown id, an async change already running, the same step without a value payload, or cancelled by beforeStepChange. Await it when you need the result.",
	},
	{
		question: "Can I run side effects after a step change?",
		answer:
			"Yes. Use the onStepChange option for flow-wide effects, or a plain effect on stepper.id for component-level reactions.",
	},
	{
		question: 'How do I handle the final "submit" step?',
		answer:
			"Stepper.Next disables itself on the last step (canNext is false). Render your own button for the final action and key it off stepper.isLast.",
	},
	{
		question: "Can the same step appear twice?",
		answer:
			"No. Ids must be unique — they are the key for navigation, values, completion, rendering and primitives. Literal duplicates are TypeScript errors when possible, and defineStepper also throws at runtime if an id appears more than once.",
	},
	{
		question: "Does it work with Next.js / SSR / React Server Components?",
		answer:
			"Yes. Keep defineStepper(...) at module scope; it has no side effects and is safe to import on the server. useStepper and the primitives are client APIs, so any component that uses them must be a Client Component.",
	},
	{
		question: "Which React versions are supported?",
		answer:
			"React 17, 18 and 19. It runs in plain JavaScript too, but you lose the type-safety that makes the typed ids worthwhile.",
	},
	{
		question: "How do I reset the whole flow?",
		answer:
			"stepper.reset() returns to the initial/default step. Reset drafts and completion separately with stepper.data.reset() and setComplete(id, false), since those are independent business state.",
	},
	{
		question: "I'm migrating from v6 — what changed?",
		answer:
			"The instance is now flat (stepper.next() instead of stepper.navigation.next()), steps are passed as an array, metadata became data, and Scoped became Provider. Full mapping is in the v7 migration guide.",
	},
];
