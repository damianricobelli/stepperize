---
"@stepperize/core": minor
---

Add `@stepperize/core/dom`: the primitives without a framework.

`bindStepper(root, flow)` makes HTML that is already on the page a stepper: roles, ids, `data-state`, keyboard navigation, focus hand-off and announcements, kept in sync with the flow. The markup names its parts with the same `data-component` and `data-step` attributes the framework primitives render, so it suits server-rendered pages (Rails, Laravel, Django, Astro) and libraries such as Alpine and htmx. Tabs or an ordered list of steps follow the flow's `isLinear`. Ids, names, roles and tabindex the page wrote are kept, and `aria-controls` / `aria-labelledby` point at the elements that really exist. It handles several steppers on one page, nested ones and shadow roots, picks up stepper parts swapped in later (and ignores every other change on the page), and returns a function that undoes the binding, putting the markup back as the server sent it. It can be imported where there is no DOM, and runs from a CDN that serves the files untouched. The main entry is unchanged and has no DOM code.

The shared focus hand-off now also treats a focused element inside a `hidden` panel as lost, so focus moves to the new panel when a panel is kept in the page instead of removed.
