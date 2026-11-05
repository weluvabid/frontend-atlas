# OSS Repository Template

A small, reusable baseline for independent open-source repositories.

This repository contains language-agnostic repository hygiene plus optional tooling profiles.

## What's included

### Core
- EditorConfig defaults.
- General-purpose Git ignore rules.
- Conventional Commit message validation.
- A Git hook installer that respects an existing `core.hooksPath`.
- Pull request and contribution templates.
- Guidance for branch protection and repository setup.

### Optional profiles
- `profiles/node-pnpm/` — Node.js + pnpm CI, formatting, linting, and hook conventions.
- `profiles/typescript/` — ESLint flat config and Prettier defaults for JS/TS projects.

Profiles are reference files. Copy only the files a project actually needs; do not blindly install every profile.

## Create a repository from this template

1. Create a public GitHub repository named `oss-template`.
2. Push the contents of this repository to its `main` branch.
3. Open **Settings → General → Template repository** and enable **Template repository**.
4. For a new project, select **Use this template → Create a new repository**.
5. Choose the owner, repository name, visibility, and create it.

A repository created from a GitHub template gets its own history. It does not retrofit existing repositories.

## Adopt the core hooks

The core hook installer is a shell script and does not require Node.js:

```sh
sh scripts/install-hooks.sh
```

It configures Git to use `.githooks/`.

The `commit-msg` hook enforces this Conventional Commit subject format:

```text
type(scope): imperative description
```

Examples:

```text
feat(cache): add weighted eviction
fix(shell): preserve focus after navigation
docs: explain local development
chore: update repository tooling
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`.

## Adopt an optional profile

Read the profile's `README.md` before copying files. Each profile documents:
- Which files to copy.
- Required development dependencies.
- Required package scripts.
- What is intentionally excluded.

## Repository setup after creation

Recommended baseline:
- Protect `main`; require pull requests and passing CI before merge.
- Require branches to be up to date if the project benefits from strict merge validation.
- Enable Dependabot only for ecosystems the project actually uses.
- Keep Actions permissions read-only by default; grant write permissions per job.
- Pin third-party GitHub Actions to full commit SHAs and retain a version comment.
- Keep release and deployment workflows out of the baseline unless the project needs them.
