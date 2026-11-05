# TypeScript / JavaScript profile

Use this profile for JavaScript or TypeScript projects that want ESLint flat config and Prettier.

## Copy

- `eslint.config.js`
- `.prettierrc.json`
- `.prettierignore`

## Install dependencies

Install compatible versions of:

```sh
pnpm add -D eslint @eslint/js eslint-config-prettier globals typescript-eslint prettier
```

If the project uses browser APIs, configure browser globals for the relevant file patterns. If it uses a framework, add that framework's official ESLint plugin and parser configuration explicitly.

It enables type-aware rules for TypeScript files through `projectService`; ensure the project has a supported TypeScript configuration and adjust file globs for its layout.
