# Frontend Atlas

An open-source field guide to frontend engineering. Frontend Atlas focuses on carefully curated
questions, first-principles explanations, practical examples, and the engineering trade-offs behind
modern web interfaces.

## Requirements

- Node.js `26.13.0` (see `.node-version`).
- pnpm `12.0.0` (pinned in `package.json`).

## Getting started

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The committed lockfile is authoritative. Use `pnpm install --frozen-lockfile` to reproduce the
validated dependency graph.

## Quality checks

```sh
pnpm format
pnpm check
```

`pnpm check` runs formatting validation, ESLint, unit tests, Astro diagnostics, and a production
build. Browser end-to-end automation is intentionally not part of the current project scope; use
the release smoke-test checklist below for manual browser verification.

Install the repository's Conventional Commit hook when working in a local Git clone:

```sh
pnpm hooks:install
```

## Content contributions

Questions live in `src/content/questions/`, grouped by the eight domains. Add new MDX files using
the content schema and editorial structure enforced by `tests/content.test.mjs` and
`src/content.config.ts`.

Question IDs are immutable. When adding a question, append its ID to
`src/data/question-manifest.ts`; never reorder, reuse, or remove an existing manifest slot. The
manifest is used by progress-transfer compatibility, and the hard editorial limit is 150 questions.

Run `pnpm check` before submitting a content or code change. Content additions do not require
changes to the deployment configuration or a fixed collection-count assertion.

## Deployment: GitHub Pages

The production site is deployed from `main` through `.github/workflows/deploy.yml` to:

<https://weluvabid.github.io/frontend-atlas/>

One-time repository setup:

1. Open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Ensure the repository's default branch is `main`.
4. Push to `main` or run the **Deploy to GitHub Pages** workflow manually.

The workflow runs the full quality gate, builds Astro with the Pages-provided base path, uploads the
`dist/` artifact, and deploys it using GitHub's official Pages actions. No deployment secrets or
personal access tokens are required.

The Astro base path is supplied by the Pages workflow. Local development and preview use `/` by
default; the production workflow uses the repository project-site path. Internal links and the
search-index request are generated through the shared base-path helper so they work in both modes.

### Release smoke test

After the first deployment, manually verify:

- Homepage, all domain pages, and a representative article load directly.
- Internal links and search results remain under `/frontend-atlas/`.
- Search index loads successfully and search returns results.
- Browser Back and Forward work across page transitions.
- Light/dark theme, tooltips, dialogs, and keyboard shortcuts work after navigation.
- Reading progress persists, QR export/import works, and swipe boundaries behave correctly.
- The custom 404 page links back into the project-site path.

## Licenses

- Application source code: [MIT License](LICENSE).
- Original educational articles: [Creative Commons Attribution 4.0 International](CONTENT-LICENSE.md).

Third-party dependencies and separately identified third-party material retain their own licenses.
