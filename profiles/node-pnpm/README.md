# Node.js + pnpm profile

Use this profile for a Node.js repository managed with pnpm.

## Copy

Copy these files into the project root:

- `.node-version`
- `.npmrc`
- `.github/workflows/ci.yml`

Copy `.github/dependabot.yml` only if the project uses npm-compatible dependencies and GitHub Actions.

Copy `.githooks/pre-commit` if you want local pre-commit checks.

## Requirements

- Node.js version matching `.node-version` (update it to the version the project supports).
- pnpm version matching the `packageManager` field in `package.json`.
- A `package.json` with project-owned scripts.

Add or adapt scripts like:

```json
{
  "scripts": {
    "lint": "your-linter-command",
    "format:check": "your-formatter-check-command",
    "test": "your-test-command",
    "check": "pnpm lint && pnpm format:check && pnpm test",
    "precommit": "pnpm lint && pnpm format:check && pnpm test",
    "prepare": "sh ./scripts/install-hooks.sh"
  }
}
```

Replace placeholder commands with real project commands. Remove checks the project does not use.

## Hook setup

The core installer configures `.githooks/` as the Git hooks directory. The optional pre-commit hook delegates to `pnpm precommit`; define that script before enabling the hook.

```sh
sh scripts/install-hooks.sh
```

## CI behaviour

The workflow runs `pnpm install --frozen-lockfile` and `pnpm check` on pushes and pull requests targeting `main`.

If your default branch is not `main`, update the workflow filters. If the repository is not a package or does not have a lockfile, adapt the install and validation steps instead of keeping irrelevant commands.
