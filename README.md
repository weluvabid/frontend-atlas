# Frontend Atlas

An open-source field guide to frontend engineering. Frontend Atlas focuses on carefully curated
questions, first-principles explanations, practical examples, and the engineering trade-offs behind
modern web interfaces.

## Requirements

- Node.js `26.13.0` (see `.node-version`).
- pnpm `12.0.0` (pinned in `package.json`).

## Getting started

```sh
pnpm install
pnpm dev
```

The first `pnpm install` generates `pnpm-lock.yaml`. Commit that lockfile before the first push;
CI uses `--frozen-lockfile` and will reject a missing or stale lockfile.

## Quality checks

```sh
pnpm format
pnpm check
```

`pnpm check` runs formatting validation, ESLint, Astro diagnostics, and a production build.

Install the repository's Conventional Commit hook when working in a local Git clone:

```sh
pnpm hooks:install
```

## License

A repository license has not yet been selected. Do not assume the source is licensed for reuse until
an explicit license is added.
