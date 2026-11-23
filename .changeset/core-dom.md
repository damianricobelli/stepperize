---
"@stepperize/core": minor
---

Add `@stepperize/core/dom`: the primitives without a framework.

`bindStepper(root, flow)` makes HTML that is already on the page a stepper: roles, ids, `data-state`, keyboard navigation, focus hand-off and announcements, kept in sync with the flow. The markup names its parts with the same `data-component` and `data-step` attributes the framework primitives render, so it suits server-rendered pages (Rails, Laravel, Django, Astro) and libraries such as Alpine and htmx. It handles several steppers on one page and nested ones, picks up markup swapped in later, returns a function that undoes the binding, and can be imported where there is no DOM. The main entry is unchanged and has no DOM code.

The shared focus hand-off now also treats a focused element inside a `hidden` panel as lost, so focus moves to the new panel when a panel is kept in the page instead of removed.
