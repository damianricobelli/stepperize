# Stepperize v8

Type-safe step-by-step flows for React 18 and 19. Web primitives are unstyled; the logic hook can be used with custom React Native UI. The v8 branch prepares the next major release.

## Ownership

Define the immutable step array once at module scope:

```tsx
import { defineStepper } from "@stepperize/react";
const checkout = defineStepper([
  { id: "shipping", title: "Shipping" },
  { id: "payment", title: "Payment" },
  { id: "review", title: "Review" },
], { linear: true });
```

- checkout.useStepper(options?) ALWAYS creates local independent state, even inside a Provider.
- checkout.Provider owns and shares state without markup.
- checkout.Stepper.Root owns and shares state with a container and orientation.
- checkout.useStepperContext() consumes the nearest matching owner; throws when missing.
- checkout.useStepperContext(selector, isEqual?) subscribes to a selected value. Default comparison is Object.is. Pure object selectors are safe; supply equality to skip equivalent object selections.
- A Root always creates its own scope, including under a Provider. Different definitions never share contexts.

## Instance

State: steps, current, id, index, count, progress (index / (count - 1), or 1 for a single step), isFirst, isLast, canPrev, canNext, isPending, completed.
Queries: is(id), status(id), isComplete(id?), canGoTo(id).
Render: match({ shipping: (step, data) => ..., payment: ..., review: ... }), exhaustive and data typed per step schema input.
Static helpers live on definition: steps, get(id), at(index), parseStep(unknown), validate(id, value).

## Navigation

next({data?, complete?}?), prev({data?, complete?}?), goTo(id, {data?, complete?, bypassPolicy?}?), reset({keepData?, keepCompleted?}?).
All return Promise<NavigationResult>: {accepted:true,from,to} or {accepted:false,reason}.
Reasons: guard, policy, pending, boundary, same-step, invalid-step, cancelled.
Await the result and test result.accepted, NEVER its truthiness. Exceptions from callbacks reject the promise.

Data payloads belong to the SOURCE step, and complete:true marks the SOURCE complete. Both commit atomically after guard acceptance. At the final step next() returns boundary; use an application submit action.
Linear policy applies to goTo, canGoTo, triggers and list keyboard navigation. It allows current, previous and immediate next steps. Intentional branches opt out with bypassPolicy:true; the guard always still runs.
Reset restores mount-time defaultStep/defaultData/defaultCompleted through the guard. Preserve selected state with keepData/keepCompleted. Controlled owners must apply the requested defaults.

## Data and completion

Data API: get(id?), set(value), set(id,value), update(id,previous=>next), all(), clear(id?), reset().
update composes against preceding writes in the same event. Treat snapshots/previous data as immutable.
clear empties data; data.reset restores mount defaults only. Navigation reset restores all state by default.
Schemas follow Standard Schema v1 (Zod, Valibot, ArkType). get(id), set(id,value), update and match handlers use schema INPUT types. validate returns schema OUTPUT without replacing stored drafts automatically.
setComplete(id?,value=true) and isComplete(id?) are explicit business completion. status is positional: active, previous, upcoming. Previous does not mean complete.

## Owner options

Definition defaults: defaultStep, defaultData, defaultCompleted, linear.
useStepper/Provider/Root: those defaults plus step/onStepChange, data/onDataChange, completed/onCompletedChange, onInvalidStep, beforeStepChange.
Defaults are captured at mount. Each controlled piece remains authoritative until props update; external prop changes do not run guards.

beforeStepChange(ctx) returns false to reject, true/undefined to allow, optionally asynchronously. Context includes from,to,fromIndex,toIndex,direction,data,statuses,signal,validate(idOrStep?). direction is next/prev/goto/reset. validate() uses source data including staged payload.
Async guards set isPending and reject overlapping moves. Owner unmount, authoritative state changes or data/completion writes cancel obsolete guards. Pass signal to cancellable work. onStepChange is a synchronous accepted-transition notification; awaitable blocking work belongs in the guard.

## Primitives

Generated Stepper: Root, List, Items, Item, Trigger, Content, Indicator, Title, Description, Separator, Actions, Next, Prev.
Items iterates steps; Item gets an explicit step id or derives it under Items. List and Separator inherit Root orientation unless overridden. Trigger has type=button, instance-unique ARIA ids and keyboard navigation. Content forceMount retains hidden inactive panels. data-status is positional; data-complete is explicit completion. Root may render children or ({stepper}) => children. createStepperPrimitives is INTERNAL and not exported.

## Forms

Keep editable field state and errors in the form library. Validate on form submit, then await stepper.next({data:values,complete:true}). Seed a remounted form from stepper.data.get(id). Shared form children use useStepperContext. A guard can protect non-form navigation too. Final submission belongs to the application.

## Documentation

- /docs/v8/guides/local-and-shared-state — complete examples and interactive ownership demo
- /docs/v8/api/react/use-stepper-context — selectors and scopes
- /docs/v8/guides/navigation — outcomes, guards, policy and reset
- /docs/v8/forms — form integration patterns
- /docs/v8/migration/v8 — upgrade from v7
- /docs/v8/migration/v7 — historical v6-to-v7 guide; apply v8 migration afterwards
- /docs/v8/changelog

Old v7 auto-sharing useStepper calls, boolean navigation results, implicit goTo bypass and step-only reset are obsolete in v8. Older nested APIs (navigation.next, metadata, Scoped) are also obsolete.

For custom markup or React Native, @stepperize/react/headless exports defineStepper with the same state API but no Stepper UI primitives. Import from @stepperize/react for the generated accessible components. Bundle measurements: https://stepperize.com/docs/v8/guides/performance
