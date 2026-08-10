# Fenglan Ink Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing Fenglan ink-theme draft so every VitePress surface uses one restrained Light/Dark token system without changing content, routes, behavior, navigation, or component hierarchy.

**Architecture:** Keep VitePress 1.6 and the default theme intact. Consolidate all visual decisions in `docs/.vitepress/theme/style.css`, map semantic `--fenglan-*` tokens onto VitePress `--vp-*` variables, and keep homepage icon references in Markdown backed by static SVGs in `docs/public/icons/`. Add a dependency-free Node audit so token drift, fixed SVG colors, legacy colors, and disallowed odd pixel values are caught before completion.

**Tech Stack:** VitePress 1.6, CSS Custom Properties, Markdown/YAML frontmatter, static SVG, Node.js 18 built-ins, `node:test`, pnpm 9.

## Global Constraints

- Treat the current uncommitted ink-theme changes as the implementation baseline; do not reset or discard them.
- Do not change business logic, page copy, navigation information architecture, route paths, or VitePress component hierarchy.
- Do not add Vue business components or runtime theme dependencies.
- Light and Dark must use the same semantic token names with different values.
- Page background remains approximately 70% paper white/fog gray, 20% ink text, 8% mist/bamboo green, and 2% tea brown accent.
- Ink decorations must stay at or below 8% opacity and must not reduce readability.
- Use `rem` for spacing, size, radius, and displacement when practical.
- If `px` is used, only even pixel values are allowed, except `1px` hairline borders.
- Preserve `1px` borders; do not convert them to `2px` merely to satisfy the even-value rule.
- SVG feature icons must inherit `currentColor` in Light and Dark modes.
- Preserve responsive behavior and ensure body copy remains readable in both themes.

---

## File Map

- `docs/.vitepress/theme/style.css`: sole visual-theme implementation; semantic tokens, Light/Dark values, public component styling, responsive rules, and reduced-motion handling.
- `docs/.vitepress/config.mts`: only the browser `theme-color` visual metadata may change.
- `docs/index.md`: retains existing hero/features content and links; only existing presentation markup and SVG references may be normalized.
- `docs/public/icons/*.svg`: canonical homepage feature icon set, served from `/icons/*.svg`.
- `docs/.vitepress/theme/icons/*.svg`: remove after confirming no source references remain; this is a duplicate unserved icon directory.
- `scripts/theme-audit.mjs`: dependency-free static audit for palette drift, token presence, odd pixel values, and SVG color inheritance.
- `tests/theme-audit.test.mjs`: unit tests for the audit rules using small inline fixtures.
- `package.json`: exposes `test:theme` and `test:theme:unit` commands.

---

### Task 1: Add Theme Audit Guardrails

**Files:**
- Create: `scripts/theme-audit.mjs`
- Create: `tests/theme-audit.test.mjs`
- Modify: `package.json:5-9`

**Interfaces:**
- Produces: `findOddPixelValues(cssText: string): AuditFinding[]`
- Produces: `findForbiddenColors(cssText: string, colors: string[]): AuditFinding[]`
- Produces: `findFixedSvgColors(svgText: string): AuditFinding[]`
- Produces: `findMissingTokens(cssText: string, requiredTokens: string[]): AuditFinding[]`
- Produces: CLI `node scripts/theme-audit.mjs [--scope all|tokens|css|icons]`
- `AuditFinding` is `{ rule: string, value: string, line: number }`.

- [ ] **Step 1: Write unit tests for the audit rules**

Create `tests/theme-audit.test.mjs` with tests that prove:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findFixedSvgColors,
  findForbiddenColors,
  findMissingTokens,
  findOddPixelValues,
} from '../scripts/theme-audit.mjs'

test('allows 1px border hairlines, even px values, and rem values', () => {
  const css = '.a{border:1px solid;gap:8px;transform:translateY(-0.25rem)}'
  assert.deepEqual(findOddPixelValues(css), [])
})

test('rejects 1px outside borders and all other odd px values', () => {
  const findings = findOddPixelValues('.a{padding:1px 3px;border-radius:5px}')
  assert.deepEqual(findings.map(({ value }) => value), ['1px', '3px', '5px'])
})

test('finds legacy palette values case-insensitively', () => {
  const findings = findForbiddenColors('.a{color:#3D8B5E}', ['#3d8b5e'])
  assert.equal(findings.length, 1)
})

test('requires SVG presentation colors to inherit currentColor', () => {
  assert.equal(findFixedSvgColors('<svg stroke="#2F6F59"></svg>').length, 1)
  assert.equal(findFixedSvgColors('<svg stroke="currentColor"></svg>').length, 0)
})

test('reports missing semantic tokens', () => {
  const findings = findMissingTokens(':root{--fenglan-surface-page:#fff}', [
    '--fenglan-surface-page',
    '--fenglan-text-primary',
  ])
  assert.deepEqual(findings.map(({ value }) => value), ['--fenglan-text-primary'])
})
```

- [ ] **Step 2: Run the unit test and verify it fails because the audit module does not exist**

Run: `node --test tests/theme-audit.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/theme-audit.mjs`.

- [ ] **Step 3: Implement the audit functions and CLI**

Create `scripts/theme-audit.mjs` using Node built-ins only. Define these constants exactly:

```js
export const REQUIRED_TOKENS = [
  '--fenglan-surface-page',
  '--fenglan-surface-subtle',
  '--fenglan-surface-paper',
  '--fenglan-surface-elevated',
  '--fenglan-text-primary',
  '--fenglan-text-secondary',
  '--fenglan-text-muted',
  '--fenglan-border-subtle',
  '--fenglan-border-interactive',
  '--fenglan-brand',
  '--fenglan-brand-hover',
  '--fenglan-brand-soft',
  '--fenglan-accent-tea',
  '--fenglan-shadow-soft',
  '--fenglan-shadow-hover',
  '--fenglan-focus-ring',
]

export const FORBIDDEN_COLORS = [
  '#3d8b5e', '#52b788', '#e8f5e9', '#d8dcd0',
  '#dee2d6', '#232e27', '#242e28',
]
```

Implement line-aware declaration scanning. `findOddPixelValues` must allow `1px` only when the declaration property starts with `border`; all other pixel values must be even integers, and non-pixel units remain allowed. `findFixedSvgColors` must reject hex/rgb values in `stroke` or `fill`, while allowing `none` and `currentColor`.

The CLI must audit:

```js
const paths = {
  css: 'docs/.vitepress/theme/style.css',
  icons: 'docs/public/icons',
}
```

It must print one finding per line as `path:line rule value` and exit with code `1` when findings exist.

- [ ] **Step 4: Add package scripts**

Modify `package.json` scripts to contain:

```json
"scripts": {
  "dev": "vitepress dev docs",
  "build": "vitepress build docs",
  "preview": "vitepress preview docs",
  "test:theme:unit": "node --test tests/theme-audit.test.mjs",
  "test:theme": "node scripts/theme-audit.mjs"
}
```

- [ ] **Step 5: Run unit tests and capture the current baseline audit failures**

Run: `pnpm.cmd test:theme:unit`

Expected: all five tests PASS.

Run: `pnpm.cmd test:theme`

Expected: FAIL because the current draft still contains missing `--fenglan-*` tokens, odd pixel values, legacy surface colors, and fixed SVG colors. Save the reported categories in the task notes; do not weaken the rules.

- [ ] **Step 6: Commit the audit harness**

```bash
git add package.json scripts/theme-audit.mjs tests/theme-audit.test.mjs
git commit -m "test: add Fenglan theme audit guardrails"
```

---

### Task 2: Consolidate the Feature Icon System

**Files:**
- Modify: `docs/public/icons/algo.svg`
- Modify: `docs/public/icons/auth.svg`
- Modify: `docs/public/icons/browser.svg`
- Modify: `docs/public/icons/build.svg`
- Modify: `docs/public/icons/chart.svg`
- Modify: `docs/public/icons/contribute.svg`
- Modify: `docs/public/icons/css-deep.svg`
- Modify: `docs/public/icons/css.svg`
- Modify: `docs/public/icons/debug.svg`
- Modify: `docs/public/icons/devops.svg`
- Modify: `docs/public/icons/engineering.svg`
- Modify: `docs/public/icons/interview.svg`
- Modify: `docs/public/icons/js.svg`
- Modify: `docs/public/icons/mobile.svg`
- Modify: `docs/public/icons/network.svg`
- Modify: `docs/public/icons/node.svg`
- Modify: `docs/public/icons/perf.svg`
- Modify: `docs/public/icons/prep.svg`
- Modify: `docs/public/icons/react.svg`
- Modify: `docs/public/icons/ssr.svg`
- Modify: `docs/public/icons/ts.svg`
- Modify: `docs/public/icons/vue.svg`
- Verify: `docs/index.md:19-138`
- Delete: `docs/.vitepress/theme/icons/` after reference verification

**Interfaces:**
- Consumes: `/icons/<name>.svg` URLs already used by VitePress home features.
- Produces: one canonical static icon directory where every visible stroke/fill inherits CSS color through `currentColor`.

- [ ] **Step 1: Run the icon audit and verify it fails on fixed colors**

Run: `pnpm.cmd test:theme -- --scope icons`

Expected: FAIL with findings such as `stroke="#2F6F59"` in `docs/public/icons/*.svg`.

- [ ] **Step 2: Normalize every canonical SVG**

For every file in `docs/public/icons/`, preserve `viewBox`, path geometry, `stroke-width`, line caps, and joins. Replace presentation colors with the same pattern:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <!-- preserve the file's existing geometry -->
</svg>
```

Do not introduce inline style attributes, embedded CSS, emoji, gradients, or per-icon brand colors.

- [ ] **Step 3: Verify homepage references and duplicate-directory safety**

Run: `rg -n "theme/icons|/icons/" docs --glob '!docs/.vitepress/cache/**' --glob '!docs/.vitepress/dist/**'`

Expected: homepage references point only to `/icons/*.svg`; no source file references `docs/.vitepress/theme/icons/`.

- [ ] **Step 4: Remove the unreferenced duplicate icon directory**

Delete only `docs/.vitepress/theme/icons/*.svg`. Do not remove `docs/public/icons/`.

- [ ] **Step 5: Verify icon audit and build**

Run: `pnpm.cmd test:theme -- --scope icons`

Expected: PASS.

Run: `pnpm.cmd build`

Expected: VitePress build exits `0` and each `/icons/*.svg` asset resolves.

- [ ] **Step 6: Commit the icon consolidation**

```bash
git add docs/index.md docs/public/icons
git commit -m "style: unify Fenglan feature icons"
```

---

### Task 3: Establish Semantic Light/Dark Tokens and Base Surfaces

**Files:**
- Modify: `docs/.vitepress/theme/style.css:1-137`
- Modify: `docs/.vitepress/theme/style.css:688-813`
- Modify: `docs/.vitepress/config.mts:9-11`

**Interfaces:**
- Consumes: required token names from `scripts/theme-audit.mjs`.
- Produces: all `--fenglan-*` semantic values plus VitePress `--vp-*` mappings used by Tasks 4–6.

- [ ] **Step 1: Run the token audit and verify the current draft fails**

Run: `pnpm.cmd test:theme -- --scope tokens`

Expected: FAIL listing the missing `--fenglan-*` semantic tokens.

- [ ] **Step 2: Replace the Light token block with semantic tokens**

At the start of `style.css`, define the required tokens and map VitePress variables to them. The Light foundation must use these exact primary values:

```css
:root {
  --fenglan-surface-page: #f7f7f2;
  --fenglan-surface-subtle: #f1f2ed;
  --fenglan-surface-paper: rgba(255, 255, 255, 0.72);
  --fenglan-surface-elevated: rgba(250, 250, 247, 0.92);
  --fenglan-text-primary: #202522;
  --fenglan-text-secondary: #5f6963;
  --fenglan-text-muted: #8b938e;
  --fenglan-border-subtle: rgba(38, 58, 48, 0.10);
  --fenglan-border-interactive: rgba(47, 111, 89, 0.36);
  --fenglan-brand: #2f6f59;
  --fenglan-brand-hover: #275d4b;
  --fenglan-brand-soft: #e7efea;
  --fenglan-accent-tea: #9b7b4f;
  --fenglan-shadow-soft: 0 0.25rem 1.25rem rgba(32, 50, 41, 0.04);
  --fenglan-shadow-hover: 0 0.625rem 1.875rem rgba(32, 50, 41, 0.08);
  --fenglan-focus-ring: 0 0 0 0.125rem rgba(47, 111, 89, 0.20);
  --fenglan-radius-sm: 0.5rem;
  --fenglan-radius-md: 0.75rem;

  --vp-c-bg: var(--fenglan-surface-page);
  --vp-c-bg-alt: var(--fenglan-surface-subtle);
  --vp-c-bg-elv: var(--fenglan-surface-elevated);
  --vp-c-bg-soft: var(--fenglan-surface-subtle);
  --vp-c-text-1: var(--fenglan-text-primary);
  --vp-c-text-2: var(--fenglan-text-secondary);
  --vp-c-text-3: var(--fenglan-text-muted);
  --vp-c-brand-1: var(--fenglan-brand);
  --vp-c-brand-2: var(--fenglan-brand-hover);
  --vp-c-brand-soft: var(--fenglan-brand-soft);
  --vp-c-border: var(--fenglan-border-subtle);
  --vp-c-divider: rgba(38, 58, 48, 0.08);
}
```

Keep warning, danger, info, and details colors semantic and low saturation. Do not map warning/danger to the brand green.

- [ ] **Step 3: Add the Dark values with the same token names**

```css
.dark {
  --fenglan-surface-page: #111714;
  --fenglan-surface-subtle: #151c18;
  --fenglan-surface-paper: #18201c;
  --fenglan-surface-elevated: rgba(24, 32, 28, 0.96);
  --fenglan-text-primary: #e8ece9;
  --fenglan-text-secondary: #9ba69f;
  --fenglan-text-muted: #748078;
  --fenglan-border-subtle: rgba(180, 210, 195, 0.10);
  --fenglan-border-interactive: rgba(98, 169, 138, 0.38);
  --fenglan-brand: #62a98a;
  --fenglan-brand-hover: #76b99b;
  --fenglan-brand-soft: rgba(98, 169, 138, 0.10);
  --fenglan-accent-tea: #b6975a;
  --fenglan-shadow-soft: 0 0.25rem 1.25rem rgba(0, 0, 0, 0.18);
  --fenglan-shadow-hover: 0 0.625rem 1.875rem rgba(0, 0, 0, 0.24);
  --fenglan-focus-ring: 0 0 0 0.125rem rgba(98, 169, 138, 0.24);
}
```

Do not redeclare component-specific colors in `.dark` when a semantic token already expresses the difference.

- [ ] **Step 4: Apply tokens to global page and metadata surfaces**

Use `var(--fenglan-surface-page)` for `body` and update `config.mts` theme metadata to `#F7F7F2`. Keep the existing page title, description, head structure, navigation, and search configuration unchanged.

- [ ] **Step 5: Verify tokens and build**

Run: `pnpm.cmd test:theme -- --scope tokens`

Expected: PASS.

Run: `pnpm.cmd build`

Expected: exit `0` with no missing CSS or asset errors.

- [ ] **Step 6: Commit the token foundation**

```bash
git add docs/.vitepress/theme/style.css docs/.vitepress/config.mts
git commit -m "style: establish Fenglan design tokens"
```

---

### Task 4: Refine Homepage, Navigation, Buttons, and Feature Cards

**Files:**
- Modify: `docs/.vitepress/theme/style.css:98-351`
- Verify: `docs/index.md:4-138`

**Interfaces:**
- Consumes: semantic tokens from Task 3 and canonical `/icons/*.svg` assets from Task 2.
- Produces: final homepage, navbar, hero, action-button, search-trigger, and feature-card styling.

- [ ] **Step 1: Add a static CSS fixture to the audit unit test for numeric constraints**

Extend `tests/theme-audit.test.mjs` with:

```js
test('homepage motion values avoid odd pixel units', () => {
  const css = `
    .VPFeature { transform: translateY(-0.25rem); border-radius: 0.75rem; }
    .VPNavBar { border-bottom: 1px solid transparent; }
  `
  assert.deepEqual(findOddPixelValues(css), [])
})
```

- [ ] **Step 2: Run the unit test**

Run: `pnpm.cmd test:theme:unit`

Expected: PASS, proving the accepted homepage values satisfy the numeric rule.

- [ ] **Step 3: Rebuild the Hero atmosphere and hierarchy**

Update `.VPHero` and pseudo-elements so:

```css
.VPHero {
  position: relative;
  overflow: hidden;
  padding-block: 5rem 4.5rem !important;
}

.VPHero::after {
  opacity: 0.08;
  pointer-events: none;
}

.VPHero .name {
  font-weight: 800 !important;
  letter-spacing: 0.02em;
}
```

Use radial gradients to suggest distant mountains only on the right side. Do not add images or modify homepage copy. Preserve the `FRONTEND NOTES` pseudo-element and ensure it remains readable in Dark mode.

- [ ] **Step 4: Tokenize buttons and interactions**

Apply `--fenglan-brand`, `--fenglan-brand-hover`, `--fenglan-border-interactive`, `--fenglan-brand-soft`, and `--fenglan-focus-ring` to all hero buttons. Use `0.5rem` radius and keep the primary shadow subtle. Add keyboard-visible styling with `:focus-visible`.

- [ ] **Step 5: Tokenize feature cards and icon containers**

Replace the draft `#D8DCD0` and other direct surfaces with:

```css
.VPFeature {
  background: var(--fenglan-surface-paper);
  border: 1px solid var(--fenglan-border-subtle);
  border-radius: var(--fenglan-radius-md);
  box-shadow: var(--fenglan-shadow-soft);
  backdrop-filter: blur(0.375rem);
  transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}

.VPFeature:hover {
  transform: translateY(-0.25rem);
  border-color: var(--fenglan-border-interactive);
  box-shadow: var(--fenglan-shadow-hover);
}

.VPFeature .icon {
  color: var(--fenglan-brand);
  background: var(--fenglan-brand-soft);
}
```

Retain the current feature order, titles, details, and links.

- [ ] **Step 6: Refine navbar, active indicator, and search trigger**

Use the elevated paper surface, a `1px` divider, and subtle backdrop blur. Keep the active state as brand text plus a short underline. If adding the mountain-line logo, use a CSS mask or inline data SVG in a pseudo-element and inherit `currentColor`; do not change the site title or add a DOM wrapper.

- [ ] **Step 7: Verify homepage behavior**

Run: `pnpm.cmd test:theme:unit`

Expected: PASS.

Run: `pnpm.cmd build`

Expected: exit `0`.

In the local preview, verify homepage links still resolve to the exact existing routes and the DOM text is unchanged.

- [ ] **Step 8: Commit homepage and navigation styling**

```bash
git add docs/.vitepress/theme/style.css docs/index.md tests/theme-audit.test.mjs
git commit -m "style: refine Fenglan home and navigation"
```

---

### Task 5: Unify Documentation, Search, Dropdown, and Reading Surfaces

**Files:**
- Modify: `docs/.vitepress/theme/style.css:355-687`

**Interfaces:**
- Consumes: token foundation from Task 3.
- Produces: shared styling for article pages, interview pages, preparation pages, contribute page, sidebars, search modal, dropdowns, code, tables, custom blocks, outline, and pagination.

- [ ] **Step 1: Record current representative pages for visual comparison**

Start the local server with `pnpm.cmd dev --host 127.0.0.1`. Capture viewport screenshots for:

- `/framework/vue`
- `/interview/practice`
- `/contribute`

Record the current issue visible on article pages: the main `.VPDoc` surface is a large gray-green block and Dark mode is excessively green. Do not edit content to solve a visual issue.

- [ ] **Step 2: Replace the article shell with a restrained paper surface**

Use tokens instead of the draft `#DEE2D6`, `#232E27`, and `#242E28` surfaces:

```css
.VPDoc {
  background: transparent;
}

.VPDoc .content-container {
  background: var(--fenglan-surface-paper);
  border: 1px solid var(--fenglan-border-subtle);
  border-radius: var(--fenglan-radius-md);
  box-shadow: var(--fenglan-shadow-soft);
}
```

Apply padding only through existing content containers and responsive rules. Do not add wrappers or change VitePress layout hierarchy. If VitePress places the background on a different existing element, target that existing element after DOM inspection.

- [ ] **Step 3: Tokenize typography and article content**

Map headings, paragraphs, lists, strong text, links, horizontal rules, inline code, code blocks, tables, blockquotes, and custom containers to semantic tokens. Keep body copy sans-serif and line-height at approximately `1.75` without hardcoding duplicated colors per heading level.

- [ ] **Step 4: Tokenize sidebar, outline, pagination, and footer**

Use `surface-subtle` for the sidebar, `text-secondary`/`text-muted` for inactive hierarchy, `brand` for active links, and `border-subtle` for separators. Preserve collapsing, active route behavior, previous/next links, edit links, and footer text.

- [ ] **Step 5: Cover search modal, dropdowns, and mobile overlays**

Inspect the rendered VitePress DOM and style existing selectors for:

- `.VPMenu`
- `.VPNavScreen`
- `.VPLocalSearchBox`
- search result items and selected result state

Use `surface-elevated`, `border-subtle`, `shadow-hover`, and `focus-ring`. Do not alter search provider configuration or event behavior.

- [ ] **Step 6: Verify representative content and interactions**

Run: `pnpm.cmd build`

Expected: exit `0`.

Using the local preview, verify:

- Vue article headings, code blocks, table/quote examples, sidebar, and outline;
- interview question content and anchors;
- contribute page links;
- nav dropdown opening and closing;
- local search opening, result selection, reset, and close;
- previous/next navigation.

- [ ] **Step 7: Commit shared documentation surfaces**

```bash
git add docs/.vitepress/theme/style.css
git commit -m "style: unify Fenglan documentation surfaces"
```

---

### Task 6: Finish Dark Mode, Responsive Behavior, and Motion Preferences

**Files:**
- Modify: `docs/.vitepress/theme/style.css:688-end`

**Interfaces:**
- Consumes: all semantic tokens and component rules from Tasks 3–5.
- Produces: final Dark theme, mobile behavior, focus states, and reduced-motion behavior without duplicated component palettes.

- [ ] **Step 1: Run the complete CSS audit and record remaining failures**

Run: `pnpm.cmd test:theme -- --scope css`

Expected: FAIL only for remaining hardcoded component colors or odd pixel values. Any missing tokens or legacy icon-color failures indicate an earlier task regression and must be fixed before continuing.

- [ ] **Step 2: Remove redundant Dark component color overrides**

Delete `.dark` component declarations that only restate colors already represented by `--fenglan-*` tokens. Keep only structural Dark differences such as further-reduced mountain opacity or a genuinely different translucency value.

- [ ] **Step 3: Add reduced-motion behavior**

Add:

```css
@media (prefers-reduced-motion: reduce) {
  .VPFeature,
  .VPButton,
  .VPNavBarMenuLink,
  .VPBackToTop {
    transition-duration: 0.01ms !important;
  }

  .VPFeature:hover,
  .VPButton:hover {
    transform: none;
  }
}
```

- [ ] **Step 4: Refine existing responsive breakpoints**

Keep VitePress breakpoints and current component hierarchy. At the existing small-screen breakpoint:

- reduce Hero typography using `rem` values;
- preserve touch target height;
- avoid feature-card and article overflow;
- ensure code blocks and tables remain horizontally scrollable inside their own containers;
- keep the mountain decoration away from Hero text.

- [ ] **Step 5: Make the full static audit pass**

Run: `pnpm.cmd test:theme`

Expected: PASS with no missing tokens, forbidden legacy colors, disallowed odd pixel values, or fixed SVG presentation colors.

Run: `pnpm.cmd test:theme:unit`

Expected: PASS.

- [ ] **Step 6: Run the production build**

Run: `pnpm.cmd build`

Expected: exit `0` with no missing assets or theme compilation errors.

- [ ] **Step 7: Commit Dark, responsive, and motion completion**

```bash
git add docs/.vitepress/theme/style.css
git commit -m "style: finish Fenglan dark and responsive theme"
```

---

### Task 7: Perform Full Browser and Regression Verification

**Files:**
- Verify: `docs/.vitepress/theme/style.css`
- Verify: `docs/.vitepress/config.mts`
- Verify: `docs/index.md`
- Verify: `docs/public/icons/*.svg`
- Verify: all existing Markdown routes under `docs/`

**Interfaces:**
- Consumes: completed theme and audit commands from Tasks 1–6.
- Produces: evidence that visual changes do not alter behavior, content, routes, navigation, or responsive layout.

- [ ] **Step 1: Run the complete automated verification suite**

Run:

```bash
pnpm.cmd test:theme:unit
pnpm.cmd test:theme
pnpm.cmd build
```

Expected: all commands exit `0`.

- [ ] **Step 2: Verify Light desktop pages**

At a desktop viewport, inspect:

- `/`
- `/framework/vue`
- `/interview/practice`
- `/contribute`

Confirm paper-white/fog-gray dominance, readable text, restrained green, card/icon consistency, no gray-green article slab, no clipping, and unchanged copy/links.

- [ ] **Step 3: Verify Dark desktop pages**

Switch to Dark mode using the existing theme control and revisit the same routes. Confirm the background is `#111714`-based rather than pure black, paper surfaces are only slightly elevated, links and secondary text remain readable, icons inherit the Dark brand token, and mountains are less visible than in Light mode.

- [ ] **Step 4: Verify interactive surfaces**

Open and exercise:

- every top-navigation dropdown;
- search trigger, query entry, result navigation, reset, and close;
- sidebar collapse controls;
- right-side outline links;
- previous/next links;
- Light/Dark toggle.

Expected: behavior and target routes match the pre-refactor site; focus-visible styles are clear and no overlay uses the legacy palette.

- [ ] **Step 5: Verify responsive layouts**

Check at least one viewport below the existing mobile breakpoint and one tablet-width viewport. Confirm mobile nav, search, Hero, cards, article surface, tables, and code blocks have no page-level horizontal overflow and touch targets remain usable.

- [ ] **Step 6: Check browser console and visual token usage**

Expected: no asset 404s, runtime errors, or CSS parsing errors. Inspect representative computed styles to confirm page, card, text, border, and brand values resolve through semantic tokens.

- [ ] **Step 7: Review the final diff for scope**

Run: `git diff --stat 5cc81d7..HEAD` and `git diff 5cc81d7..HEAD -- docs/.vitepress/config.mts docs/index.md`.

Expected: changes are limited to theme styling, visual metadata, icon presentation, and audit tooling; no route, navigation, page copy, or functional logic changes appear.

- [ ] **Step 8: Record final evidence**

In the handoff, report exact outputs for unit audit, static theme audit, production build, desktop/mobile Light/Dark browser checks, and any residual limitations. Do not claim completion without fresh command output from this task.
