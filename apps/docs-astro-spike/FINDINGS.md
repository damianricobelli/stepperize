# Findings: live multi-framework examples in Fumadocs on Astro

Throwaway spike. Question: can a Fumadocs docs page running on Astro show live examples written in
several UI frameworks, and is that worth migrating `apps/docs` for?

**Short answer: yes, every approach tried works.** Importing a Vue, Svelte or Solid component
straight into an MDX page and adding `client:load` is enough. The cost of the migration is not in
the demos, it is in what the Astro integration does to the existing React-heavy MDX.

## Setup

- Scaffolded with `create-fumadocs-app --template astro` (the command the Fumadocs Astro guide
  gives), which matches the manual installation guide file by file.
- Versions: `astro` 7.4, `@fumadocs/astro` 0.3.0, `fumadocs-core` / `fumadocs-ui` (`@fumadocs/base-ui`)
  16.19.7, `@astrojs/react` 7.1, `@astrojs/vue` 7.1, `@astrojs/svelte` 9.1, `@astrojs/solid-js` 7.1,
  Vue 3.5, Svelte 5.59, Solid 1.9.
- `astro.config.mjs`: `react({ exclude: ['**/demos/solid/**'] })` and
  `solid({ include: ['**/demos/solid/**'] })` keep the two JSX compilers apart.
- The same demo four times in `src/demos/`, each driving `createStepper` from `@stepperize/core`
  through `get()` / `subscribe()`: React (`useSyncExternalStore`), Vue (`shallowRef`),
  Svelte 5 (`$state.raw` + `$effect`), Solid (`createSignal`).
- Run it: `pnpm --filter @stepperize/core build`, then `pnpm --filter docs-astro-spike dev`.
  Pages: `/docs/approach-a`, `/docs/approach-b`, `/docs/approach-c`.

## How `@fumadocs/astro` renders MDX (read from its source)

The MDX body of a page becomes **one React island**. The integration serializes the content tree
and hands it to that island. Two kinds of component exist:

- Components **registered** in `src/components/mdx.tsx` (`Callout`, `Tabs`, ...) are rendered by
  React inside the island. They hydrate and share React context. Their props must be serializable.
- Components **imported in the MDX file**, plus expressions and images, are rendered **by Astro**
  and passed into the island as slots. That is the door for other frameworks: Astro renders the
  Vue/Svelte/Solid component like in any `.astro` file, `client:*` directives included.

## Results

All checked in a browser against the production build (`astro build` + `astro preview`), by clicking
Next in every demo and reading the step label, on a fresh load and after `<ClientRouter />`
navigation (a → c → b → a → index → c → a, same document throughout). No console errors.

| Approach | Works | Responds to clicks | Survives `<ClientRouter />` | Rendering |
| --- | --- | --- | --- | --- |
| (a) import Vue/Svelte/Solid in the MDX, `client:load` | yes | yes | yes | server-rendered, then hydrated |
| (a) same, nested in a Fumadocs `<Tabs>` / `<Callout>` | yes | yes | yes | server-rendered, then hydrated |
| (a) `client:only="vue"` | yes | yes | yes | client only |
| (a) no directive | renders | **no** (static HTML, as in any Astro page) | n/a | server only |
| (b) named slot of the `Docs` island, filled from the `.astro` page | yes | yes | yes | server-rendered, then hydrated |
| (c) React `<FrameworkDemo>` that lazy-loads a bundle exposing `mount(el)` | yes | yes | yes | client only, "Loading" placeholder first |

Notes:

- (a) in `<Tabs>`: only the active panel is mounted. Switching tabs remounts the demo, so its state
  resets. Each tab's demo worked after switching (Vue → Svelte → Solid → Vue).
- (b) works but the demo lives in the `.astro` route, not in the content. It only makes sense for
  something every page shares. Not a way to author examples.
- (c) needs no Astro at all: it is a React component with a dynamic `import()`. It would work in
  `apps/docs` today.

### JS added to the page (production build, gzip -9)

| | Raw | Gzip |
| --- | --- | --- |
| Baseline docs page (Fumadocs UI, React, search, router) | 656 KB | 224 KB |
| (a) all three frameworks on one page | +135 KB | +53 KB |
| (c) all three frameworks on one page | +127 KB | +50 KB |
| Vue runtime alone | 72 KB | 28 KB |
| Svelte runtime alone | 37 KB | 14 KB |
| Solid runtime alone | 14 KB | 5 KB |

A page pays only for the frameworks it shows. (a) and (c) cost the same: the framework runtimes
dominate, the Astro hydration adapters and the `mount` wrappers are about 1 KB each. Pages without
a foreign-framework demo load none of it.

## Failures and gotchas hit along the way

- `solid-js` 2.x is what `pnpm add solid-js` installs, and `@astrojs/solid-js` 7 needs `^1.9.13`.
  Pinned to 1.9.
- `<Tabs>` is not in Fumadocs' default MDX components. Using an unregistered component fails the
  page with an opaque `Unable to render FumadocsIsland!` (the real cause is hidden unless you read
  the island source: "Component X is not in the MDX components of Fumadocs").
- A function prop on a registered component fails the page:
  `The props of MDX components must be serializable, Cannot stringify a function at "[0][2].onDone"`.
- A React component **imported** in MDX without `client:load` is static HTML: no clicks. To be
  interactive it must be either registered in `mdx.tsx` or given a `client:*` directive, and an
  imported one is its own React root (no context shared with the rest of the page).
- The generated Markdown for LLMs (`/docs/approach-a.md`) leaks imported components as raw tags
  (`<SvelteDemo client:load />`) and drops some (`<VueDemo />` disappeared). Imported demos would
  need a Markdown form.
- First dev load after adding integrations logs `504 (Outdated Optimize Dep)` and a failed Solid
  hydration until Vite finishes re-optimizing. A reload fixes it. Dev only.
- Peer warnings: `@astrojs/svelte` / `svelte2tsx` do not declare TypeScript 7 support yet.

## What migrating `apps/docs` would cost

Compared against `apps/docs` (`src/routes/docs/$.tsx`, `src/lib/source.ts`, `source.config.ts`,
the `llms` routes, `routes/api/og.tsx`):

**Carries over, with the template's equivalents**

- DocsLayout, sidebar, TOC, static search (`/api/search` prerendered, client-side index).
- `llms.txt`, `llms-full.txt` and per-page `.md` (the template ships them via `llms(source)`).
- OG images with `takumi-js` (the template prerenders one per page; `apps/docs` renders on request
  from query params, which needs a server adapter or a redesign).
- `lastModified` (an option of the integration), `includeProcessedMarkdown`.

**Lost or needs rework**

- **MDX authoring model.** 59 of 110 MDX files use `import`/`export`, and pages compose React
  inline (`<Stepper.Root>`, `<Stepper.Item>`, `<Preview>`, `<InteractiveExample>`, ...). Under the
  Astro island every interactive piece must be a registered component with serializable props, or
  an imported one with `client:load` as an isolated root. Inline compositions that pass functions
  or rely on shared context have to be extracted into component files. This is the bulk of the work.
- **`fumadocs-mdx` is replaced** by Astro content collections on the Sätteri processor.
  `source.config.ts`, `collections/server`, `collections/browser` and the `clientLoader.preload`
  pattern go away. Custom remark/rehype plugins must be Sätteri `mdastPlugins`/`hastPlugins`.
  `rehypeCodeOptions` is accepted; `fumadocs-twoslash` was not tested (no page uses it today).
- **Routing logic in `docs/$.tsx`**: version/framework canonical redirects, legacy and blocks
  redirects, and the `createServerFn` loader. With a static Astro build these become generated
  redirect pages or host-level redirects, or need an SSR adapter.
- **Head/SEO**: `seo()`, JSON-LD (TechArticle, breadcrumb, FAQ), `rel="alternate"` markdown link
  have to be rewritten in `Layout.astro`.
- **Everything that is not docs**: landing, `/blocks` gallery, `/studio`, `/changelog`, the
  registry routes (`/r/*`), sitemap. These are TanStack Router apps; in Astro each becomes a large
  `client:only` React island or a rewrite, and TanStack Router's type-safe search params
  (`/blocks?category=`) are lost.
- **Maturity**: `@fumadocs/astro` is 0.3.0. The error reporting above is rough.
- Navigation is Astro `<ClientRouter />` with a persisted `Docs` island instead of a React router.
  It worked in every test here.

## Recommendation

**Keep TanStack Start and use approach (c).**

- (c) delivers the goal (live Vue/Svelte/Solid examples in a docs page) in the current app with
  one React component and one small `mount(el)` module per framework, at the same JS cost as
  Astro's native islands.
- The only thing Astro adds is server-rendered HTML for the foreign-framework demos. For
  interactive stepper examples below the fold that is worth little: (c) shows a placeholder for a
  moment, and React examples stay server-rendered either way.
- The migration would rewrite the docs route, the SEO layer, the redirects, most MDX pages and
  every non-docs route, onto a 0.x integration, to gain that one property.

If server rendering of non-React demos ever becomes a requirement (SEO on demo content, no layout
shift), approach (a) is proven to work and this spike is the starting point. A cheaper middle step
for (c) is to reserve the demo's height in the wrapper to avoid the shift.

## Approach (c) inside `apps/docs` (tried, works)

Done on this branch after the Astro spike. Test page: `/docs/v9/core/framework-demos`
(`content/docs/docs/v9/core/framework-demos.mdx`), a throwaway page to delete before merging anything.

What it took:

- `vite.config.ts`: `vue()`, `svelte()` and `solid({ include: /\/framework-demos\/solid\// })` next
  to the React plugin. The same pattern is passed as `exclude` to **both** `viteReact()` and the
  `babel()` plugin that runs the React Compiler, otherwise the compiler would rewrite the Solid
  component.
- `src/components/interactive/framework-demo.tsx` (the wrapper, registered in `mdx.tsx`) and
  `src/components/framework-demos/` (the demos, one `mount/*.ts` per framework, `shims.d.ts` for
  `*.vue` / `*.svelte` imports).
- Dependencies: `vue`, `svelte`, `solid-js@^1.9`, `@stepperize/core`, and dev
  `@vitejs/plugin-vue`, `@sveltejs/vite-plugin-svelte`, `vite-plugin-solid`.

Checked in a browser, in dev and against the production build (`vite build` + `vite preview`):

- Vue, Svelte and Solid mount and respond to clicks, top level and inside Fumadocs `<Tabs>`
  (each tab mounts its framework on first open).
- They survive TanStack Router navigation away and back (same document), with no console errors.
- SSR renders the "Loading" placeholder; the demos are client only, as expected.
- Lazy chunks, loaded only on a page that shows the framework: Vue 63 KB (25 KB gzip),
  Svelte 36 KB (14 KB gzip), Solid 12 KB (5 KB gzip).
- `tsc --noEmit` passes, the 109 docs tests pass, `vite build` passes.

Rough edges:

- Biome reports false "unused import/variable" warnings in `.vue` and `.svelte` files, because it
  does not see their use in the template. Three warnings, no errors; an override would silence them.
- `seo.test.ts` requires keywords for every docs page, so the test page has an entry in
  `DOC_KEYWORDS`.
- `vite-plugin-svelte` logs "no Svelte config found" on start. Harmless.
- A demo's state resets when its tab is closed and reopened (it is unmounted), same as on Astro.
