# Node.js 24 LTS Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align local development, CI, GitHub Pages deployment, package metadata, and the DevOps example on Node.js 24 LTS.

**Architecture:** Treat the Node.js major version as one repository-wide runtime contract. GitHub Actions and `.nvmrc` consume the major line `24`, while `package.json` enforces `>=24 <25`; a focused static contract check prevents those declarations from drifting.

**Tech Stack:** Node.js 24 LTS, GitHub Actions, pnpm 9, VitePress 1.6, JSON, YAML, Markdown

## Global Constraints

- Use the Node.js 24 LTS major line rather than pinning an exact patch release.
- Declare `>=24 <25` in `package.json`.
- Keep `packageManager` pinned to `pnpm@9.15.0`; pnpm 9 supports Node.js 24.
- Do not change dependency versions, application behavior, content architecture, or unrelated examples.
- Use English Conventional Commits.

---

### Task 1: Align the repository runtime contract

**Files:**
- Create: `.nvmrc`
- Modify: `.github/workflows/ci.yml:24-28`
- Modify: `.github/workflows/deploy.yml:32-36`
- Modify: `package.json:17-19`
- Modify: `docs/engineering/devops.md:165-175`

**Interfaces:**
- Consumes: Node.js 24 LTS major line and the existing `pnpm@9.15.0` package-manager declaration.
- Produces: one consistent runtime contract: Actions and `.nvmrc` use `24`, `engines.node` uses `>=24 <25`, and the documentation example uses `24`.

- [ ] **Step 1: Run the desired-state contract check and verify RED**

Run:

```powershell
node -e "const fs=require('node:fs'); const read=p=>fs.readFileSync(p,'utf8'); const checks=[['.nvmrc',/^24\s*$/],['package.json',/\"node\"\s*:\s*\">=24 <25\"/],['.github/workflows/ci.yml',/node-version:\s*24/],['.github/workflows/deploy.yml',/node-version:\s*24/],['docs/engineering/devops.md',/node-version:\s*24/]]; for(const [p,re] of checks){const value=read(p); if(!re.test(value)) throw new Error(p+' does not declare Node.js 24');}"
```

Expected: FAIL before implementation because `.nvmrc` is missing and the existing declarations still use Node.js 18, 20, or 22.

- [ ] **Step 2: Implement the runtime declarations**

Create `.nvmrc` with:

```text
24
```

Change both GitHub Actions setup blocks to:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 24
```

Preserve `cache: pnpm` in the CI workflow immediately below `node-version`.

Change the package engine declaration to:

```json
"engines": {
  "node": ">=24 <25"
}
```

Change the DevOps teaching example to:

```yaml
with: { node-version: 24, cache: 'pnpm' }
```

- [ ] **Step 3: Re-run the contract check and verify GREEN**

Run the exact Node.js command from Step 1.

Expected: exit code 0 with no output.

- [ ] **Step 4: Verify configuration scope and syntax**

Run:

```powershell
node -e "const p=require('./package.json'); if(p.engines.node!=='>=24 <25') throw new Error('invalid Node engine range'); if(p.packageManager!=='pnpm@9.15.0') throw new Error('pnpm pin changed')"
git diff --exit-code -- pnpm-lock.yaml
rg -n "node-version:\s*(20|22)|\"node\"\s*:\s*\">=18\"" .github package.json docs/engineering/devops.md
```

Expected: the Node.js assertion and lockfile diff exit 0; `rg` returns no matches.

- [ ] **Step 5: Run the project verification suite**

Run:

```powershell
pnpm.cmd test:theme:unit
pnpm.cmd test:theme
pnpm.cmd build
```

Expected: 19/19 unit tests pass, theme audit exits 0, and VitePress production build exits 0.

- [ ] **Step 6: Review and commit the implementation**

Run:

```powershell
git diff --check
git diff -- .nvmrc package.json .github/workflows/ci.yml .github/workflows/deploy.yml docs/engineering/devops.md
git add -- .nvmrc package.json .github/workflows/ci.yml .github/workflows/deploy.yml docs/engineering/devops.md
git commit -m "chore: upgrade Node.js runtime to 24 LTS"
```

Expected: one focused implementation commit containing only the five runtime-contract files.
