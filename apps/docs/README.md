# Stepperize Docs App

Documentation site for Stepperize (`@stepperize/react` and `@stepperize/core`), built with Next.js + Fumadocs.

## Requirements

- Node.js `>=18`
- pnpm `10` (workspace package manager)

## Run Locally

From the monorepo root:

```bash
pnpm dev
```

Or run only the docs app:

```bash
pnpm --filter docs dev
```

Default local URL: `http://localhost:3000`

## Build

From the monorepo root:

```bash
pnpm build
```

Or only docs:

```bash
pnpm --filter docs build
```

## Useful Scripts (docs app)

Run these from `apps/docs` (or with `pnpm --filter docs <script>` from root):

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm generate:r` — generate both Base UI and Radix registry JSON files
- `pnpm generate:r:base` — generate only Base UI registry JSON
- `pnpm generate:r:radix` — generate only Radix registry JSON
- `pnpm registry:build` — generate registry files and run `shadcn build`

## Content and Structure

- `content/docs/react` — React docs pages (`.mdx`)
- `app` — Next.js App Router routes
- `components` — docs UI components and previews
- `registry` — source blocks/components for registry generation
- `public/r` — generated registry output files

## Notes

- The docs app consumes local workspace packages:
  - `@stepperize/react`
  - `@stepperize/core`
- After changing registry block sources, regenerate registry files before publishing docs.
