---
"@stepperize/core": minor
"@stepperize/react": patch
---

Every package now shares one version: `@stepperize/core` and every binding are released together, so `@stepperize/vue@9.1.0` goes with `@stepperize/react@9.1.0` and the v9 documentation.

`@stepperize/core`:

- The stepper exposes `isLinear`, so code that follows a flow owned elsewhere knows its navigation policy.
- A move cancelled by `reset()`, `restore()` or `destroy()` resolves with `reason: "cancelled"` even when what it was waiting on rejects, as a `fetch` aborted through the guard's `signal` does. It used to reject with `AbortError`.
- Step ids are percent-encoded where they appear inside DOM ids, so a step id with a space no longer breaks `aria-controls` and `aria-labelledby`.
- Arrow keys pressed with Alt, Ctrl or Meta are left to the browser, and a tab the application disabled is skipped instead of becoming the current step.
- The live region is styled property by property, which a strict Content Security Policy allows.
- Focus left in the panel of another step, during a leave transition, moves to the new panel.

`@stepperize/react`: the published types no longer declare `createStepper` and other core values as exports of `@stepperize/react`, which type-checked and then failed at run time.
