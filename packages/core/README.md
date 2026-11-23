# @stepperize/core

The typed state machine behind [Stepperize](https://stepperize.com): steps,
validation, branching, guards and snapshots, with no framework. Every binding
(`@stepperize/react`, `vue`, `svelte`, `solid`, `angular`, `lit`) is built on
it, and you can use it directly in tests, on a server, in scripts and agents,
or with plain HTML.

```bash
npm install @stepperize/core
```

```ts
import { createStepper } from "@stepperize/core";

const flow = createStepper([{ id: "account" }, { id: "plan" }, { id: "done" }], {
  onFinish: (output) => save(output),
});

await flow.next({ email: "ada@example.com" });
flow.current.id; // "plan"
```

Step schemas use [Standard Schema](https://standardschema.dev), so Zod,
Valibot and ArkType work without an adapter.

## Entries

| Entry | What it is |
| --- | --- |
| `@stepperize/core` | `createStepper` and every type. No DOM code. |
| `@stepperize/core/dom` | `bindStepper(root, flow)`: makes server-rendered HTML an accessible stepper, for pages with no framework, Alpine or htmx. |
| `@stepperize/core/primitives` | The roles, ids, keyboard and focus logic the bindings share. For binding authors. |

## Docs

- [Core](https://stepperize.com/docs/v9/core)
- [HTML, without a framework](https://stepperize.com/docs/v9/html)
- [Errors and warnings](https://stepperize.com/docs/v9/core/errors)

## License

MIT
