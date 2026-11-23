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
