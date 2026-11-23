# Stepperize Docs

This app powers the Stepperize documentation site at
[stepperize.com](https://stepperize.com).

It includes the marketing landing page, versioned docs, migration guides,
interactive examples, a block gallery, Studio, the markdown endpoints for
coding agents, and the generated shadcn-compatible registry used by the
installable blocks.

## Stack

- TanStack Start and TanStack Router for the app shell and file-based routes.
- Fumadocs and MDX for documentation content.
- Tailwind CSS for styling.
- Vitest for tests.
- Biome for linting and formatting.
- A custom registry build script for Stepperize blocks.

## Getting Started

Run commands from the repository root:

```bash
pnpm install
pnpm --filter docs dev
```

The dev server runs on [localhost:3000](http://localhost:3000).

You can also run commands from this directory with the local scripts:

```bash
pnpm dev
pnpm build
pnpm test
pnpm check
```

## Content

Documentation pages live in `content/docs`.

- `content/docs/docs/v9` contains the current docs (`CURRENT_DOCS_VERSION` in
  `src/lib/docs-tree.ts`).
- From v9 on, docs are split by framework:
  `content/docs/docs/v9/{framework}/...`, served at
  `/docs/v9/{framework}/...`. To document a new binding, add it to
  `src/lib/frameworks.ts`, create its folder with a `meta.json` (`"root": true`)
  and list it in `content/docs/docs/v9/meta.json`. The sidebar switcher,
  canonical URLs, breadcrumbs, sitemap and `llms.txt` follow. Page keywords
  (`DOC_KEYWORDS` in `src/lib/seo.ts`) are written by hand, and a test fails
  when a current page has none. The landing page, the blocks, Studio and the
  search filter only know React.
- `content/docs/docs/v7` and `content/docs/docs/v8` contain the full docs of
  those versions. Their interactive examples run `@stepperize/react@8.0.1`,
  installed as `@stepperize/react-v8`.
- `content/docs/docs/v2` through `content/docs/docs/v6` contain migration docs
  for previous releases.
- Section ordering and labels are controlled by the colocated `meta.json`
  files.

The MDX source is configured in `source.config.ts`. Generated Fumadocs output
is created during install through the `postinstall` script.

### Shared concept pages

A concept that is the same in every binding (steps, moves, validation...) is
written once, in `content/shared/`, with code for each framework. Every
framework still has its own page at the same path, so the framework switcher
keeps the reader on the page, the sidebar and the search title stay per
framework, and `llms.txt` and each page's `.md` hold the prose plus only that
framework's code. `content/shared/concepts/steps.mdx` and `moves.mdx` are the
models.

**Add one.**

1. Write `content/shared/<section>/<page>.mdx`: no frontmatter, prose that does
   not name a framework, code as below.
2. In each framework that documents it, add a thin page at the same path, e.g.
   `content/docs/docs/v9/vue/<section>/<page>.mdx`:

   ```mdx
   ---
   title: The lifecycle of a move
   description: What happens between calling next() and the step changing.
   ---

   <include cwd>content/shared/concepts/moves.mdx</include>
   ```

   Use the same title and description everywhere: the site adds the framework
   to titles, descriptions and social cards. "Edit on GitHub" opens the shared
   file. A framework that needs a
   different page writes a normal page there instead.
3. List the page in that framework's `meta.json` and give it keywords in
   `DOC_KEYWORDS` (`src/lib/seo.ts`).

**Code per framework.** Put one fenced block per framework in
`<FrameworkCode>`, each marked with the frameworks it is for:

````mdx
<FrameworkCode>

```tsx framework="react" title="Header.tsx"
const stepper = checkout.useStepperContext();
```

```vue framework="vue" title="StepHeader.vue"
<script setup lang="ts">
const stepper = checkout.useStepperContext();
</script>
```

```ts framework="angular lit"
// one block for several frameworks when the code is the same
```

</FrameworkCode>
````

A block can be for several frameworks (`framework="react vue svelte solid"`)
and a framework can have several blocks. Code that only uses the flow object or
the definition (`checkout.create()`, `defineStepper([...])` without an import)
is the same everywhere: write a plain fenced block, outside `<FrameworkCode>`.
Compile every sample with the binding's own checker (tsc, vue-tsc,
svelte-check, ngc with `strictTemplates`) before you publish it.

**Fallbacks.** A framework without a block of its own gets the `core` blocks
of that `<FrameworkCode>` (the flow without a framework, written with
`createStepper` or `flow`), so HTML and Core pages can include a shared page
without a sample of their own. With neither, the build fails and names the
missing framework: nothing silently shows another framework's code.

**Prose for some frameworks.** `<FrameworkOnly is="angular lit">...</FrameworkOnly>`
keeps its content only on those frameworks' pages; `not="..."` does the
opposite. It works around blocks or inline.

**Links.** Write `/docs/v9/:framework/guides/branching`: on each page it goes to
that framework's page, or to React's while that framework has none (the link
upgrades itself when the page is written), and the build fails when neither
exists. Links to a fixed page (`/docs/v9/core/errors#sz103`) stay as written.

**How it works.** `<include>` (fumadocs-mdx) inlines the shared file into each
thin page when it compiles, and `remarkFrameworkContent`
(`src/lib/mdx/remark-framework-content.ts`, registered first in
`source.config.ts`) reads the framework from the page's path and removes the
other frameworks' code and prose before anything else runs. The HTML, the
bundle, the table of contents, search and the processed markdown therefore
hold one framework only: a Vue page's `.md` is plain markdown with the shared
prose and the Vue blocks as ordinary fences (`framework="..."` removed), and
`llms-full.txt` for Vue holds the same. `<FrameworkCode>` and `<FrameworkOnly>`
are not React components; they never reach the page.
`src/lib/mdx/remark-framework-content.test.ts` compiles every page that
includes a shared file and checks that its markdown has the prose, its own
samples, no other framework's samples, and links that resolve.

## Routes

Routes live in `src/routes`.

- `/` renders the landing page.
- `/docs/{version}/...` renders documentation pages. `/docs`, `/docs/latest`
  and URLs without a version redirect to the current one; URLs of the site
  before v7 are mapped in `src/lib/legacy-redirects.ts`.
- `/blocks` and `/blocks/{id}` render the block gallery.
- `/studio` renders Studio; `/studio.md` and `/r/studio.*` serve it to agents
  and to the shadcn CLI.
- `/changelog` redirects to the changelog of the current version.
- `/llms.txt`, `/llms-full.txt` and `/llms.mdx/...` serve the docs as markdown.
- `/api/search` and `/api/og` support search and Open Graph images.
- `/sitemap.xml` is generated from the docs route data.

## Blocks Registry

The block registry is generated from the same block components used by the
gallery previews, so previews and installable code stay in sync.

```bash
pnpm --filter docs registry:build
```

The script reads `src/lib/blocks/catalog.mjs` and
`src/components/blocks/*.tsx`, then writes:

- `registry.json`
- `public/r/registry.json`
- `public/r/<block-name>.json`

The registry build also runs automatically before `pnpm --filter docs build`.

## Quality Checks

```bash
pnpm --filter docs test
pnpm --filter docs check
pnpm --filter docs build
```

The browser tests need Chromium: run `pnpm test:install` from the repository
root once.

Use `pnpm --filter docs check` before committing docs app changes. Use
`pnpm --filter docs build` when routes, MDX content, registry items, or
production rendering changed.
