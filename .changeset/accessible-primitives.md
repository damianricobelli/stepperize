---
"@stepperize/react": minor
---

Accessible primitives without new options.

- **Valid markup**: items are `role="presentation"` inside the tablist, and `Title`/`Description` render a `span` inside a `Trigger`.
- **Focus**: focus that would be lost after a step change (a disabled or replaced `Next`, an unmounted panel) moves to the new panel. Focus outside the stepper is never touched.
- **Announcements**: when the step changes while focus stays put (for example on `Next`), a polite live region announces the new step's `title`. Nothing to translate.
- **Pending guards**: triggers, `Prev` and `Next` keep focus while a guard runs (`aria-disabled` instead of `disabled`, plus `data-pending`); the Root sets `aria-busy`.
- **Keyboard**: arrow keys swap in right-to-left layouts.
- **Flows without triggers** render a plain list and labelled groups instead of tab roles without tabs.
- **Refs**: every element primitive forwards `ref` (React 18 and 19); render functions receive `ref` and `children`.
- **`Stepper.useItem()`** reads the enclosing item.
- **Diagnostics**: development warnings and errors carry codes (`SZ001`…) linked to the docs.
- **Stable references**: snapshots reuse unchanged closures, so `stepper.data`, `canGoTo`, `match` and `validate` keep their identity when their inputs do not change.

Behavior change: `Title`/`Description` render a `span` inside a `Trigger`. Add `block` if you relied on block layout.
