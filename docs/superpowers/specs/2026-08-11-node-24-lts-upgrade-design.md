# Node.js 24 LTS Upgrade Design

## Goal

Upgrade the repository's supported and automated Node.js runtime from Node.js 22 LTS to Node.js 24 LTS while keeping local development, CI, deployment, and documentation examples aligned.

## Runtime Contract

- Use the Node.js 24 LTS major line rather than an exact patch release so environments receive compatible security and maintenance updates automatically.
- Declare `>=24 <25` in `package.json` to reject older runtimes and avoid silently moving to a future major version.
- Add `.nvmrc` containing `24` for local version managers.
- Keep the existing pnpm 9 pin. pnpm's official compatibility table supports Node.js 24 with pnpm 9.

## Files in Scope

- `.github/workflows/ci.yml`: change `actions/setup-node` from Node.js 22 to 24.
- `.github/workflows/deploy.yml`: change the deployment build runtime from Node.js 22 to 24.
- `package.json`: change `engines.node` from `>=18` to `>=24 <25`.
- `.nvmrc`: add the Node.js 24 major version.
- `docs/engineering/devops.md`: update the GitHub Actions teaching example from Node.js 20 to 24.

No dependency versions, application behavior, content architecture, or unrelated examples will change.

## Verification

1. Search repository-owned configuration and documentation to confirm that active project runtime declarations use Node.js 24.
2. Confirm `package.json` remains valid JSON and the lockfile is unchanged unless the package manager explicitly requires metadata refresh.
3. Run `pnpm.cmd test:theme:unit` and require 19 passing tests.
4. Run `pnpm.cmd test:theme` and require a clean theme audit.
5. Run `pnpm.cmd build` and require a successful VitePress production build.

## Delivery

Commit the implementation with the English Conventional Commit message:

`chore: upgrade Node.js runtime to 24 LTS`
