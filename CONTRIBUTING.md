# Contributing to Stepperize

We're glad you're interested in contributing to our project! Here are some guidelines to help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/stepperize.git`
3. Create a new branch: `git checkout -b your-feature-name`
4. Make your changes
5. Commit your changes: `git commit -m "Add some feature"`
6. Push to the branch: `git push origin your-feature-name`
7. Create a pull request

## Development Setup

Use the Node.js version in `.nvmrc` and the pnpm version in `package.json`.

1. Install dependencies: `pnpm i`
2. Run the development docs server: `pnpm dev`
3. Before opening a pull request, run `pnpm check` (types, tests and build).
   The browser tests need Chromium: run `pnpm test:install` once.
4. If your change affects a published package, add a changeset: `pnpm changeset`

## Code Style

We use Biome for code formatting. Please ensure your code is formatted before submitting a pull request.

## Submitting Pull Requests

1. Ensure your code adheres to the existing style.
2. Include tests for any new functionality.
3. Update documentation if necessary.
4. Describe your changes in detail in the pull request description.

## Reporting Issues

Use the GitHub issue tracker to report bugs or suggest features.

Thank you for contributing!