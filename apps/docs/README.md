# Stepperize Docs

This app powers the Stepperize documentation site at
[stepperize.com](https://stepperize.com).

It includes the marketing landing page, versioned docs, migration guides,
changelog pages, interactive examples, a block gallery, and the generated
shadcn-compatible registry used by the installable blocks.

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

- `content/docs/docs/latest` contains the current docs.
- `content/docs/docs/v2` through `content/docs/docs/v6` contain migration docs
  for previous releases.
- Section ordering and labels are controlled by the colocated `meta.json`
  files.

The MDX source is configured in `source.config.ts`. Generated Fumadocs output
is created during install through the `postinstall` script.

## Routes

Routes live in `src/routes`.

- `/` renders the landing page.
- `/docs` and `/docs/react` render documentation pages.
- `/blocks` renders the block gallery.
- `/changelog` renders changelog pages.
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

Use `pnpm --filter docs check` before committing docs app changes. Use
`pnpm --filter docs build` when routes, MDX content, registry items, or
production rendering changed.
