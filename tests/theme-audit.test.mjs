import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  findFixedSvgColors,
  findForbiddenColors,
  findMissingTokens,
  findOddPixelValues,
  parseScope,
} from '../scripts/theme-audit.mjs'

test('allows 1px border hairlines, even px values, and rem values', () => {
  const css = '.a{border:1px solid;gap:8px;transform:translateY(-0.25rem)}'
  assert.deepEqual(findOddPixelValues(css), [])
})

test('homepage motion values avoid odd pixel units', () => {
  const css = `
    .VPFeature { transform: translateY(-0.25rem); border-radius: 0.75rem; }
    .VPNavBar { border-bottom: 1px solid transparent; }
  `
  assert.deepEqual(findOddPixelValues(css), [])
})

test('homepage focus indicators remain visible through hover states', () => {
  const css = readFileSync(new URL('../docs/.vitepress/theme/style.css', import.meta.url), 'utf8')
  const heroFocus = css.match(/\.VPHero \.actions \.VPButton:focus-visible \{[^}]+\}/)?.[0] ?? ''
  const searchFocus = css.match(/\.VPNavBarSearch \.DocSearch-Button:focus-visible \{[^}]+\}/)?.[0] ?? ''
  const reducedMotion = css.indexOf('@media (prefers-reduced-motion: reduce)')
  const brandHover = css.lastIndexOf('.VPHero .actions .VPButton.brand:hover {', reducedMotion)
  const brandHoverFocus = css.lastIndexOf(
    '.VPHero .actions .VPButton.brand:hover:focus-visible {',
    reducedMotion,
  )

  assert.match(heroFocus, /outline: 0\.125rem solid var\(--fenglan-brand\)/)
  assert.match(searchFocus, /outline: 0\.125rem solid var\(--fenglan-brand\)/)
  assert.ok(brandHoverFocus > brandHover, 'brand hover+focus must override the later hover shadow')
})

test('reduced motion overrides the higher-specificity Hero brand hover transform', () => {
  const css = readFileSync(new URL('../docs/.vitepress/theme/style.css', import.meta.url), 'utf8')
  const brandHover = css.indexOf('.VPHero .actions .VPButton.brand:hover {')
  const reducedMotion = css.indexOf('@media (prefers-reduced-motion: reduce)')
  const reducedBrandHover = css.lastIndexOf('.VPHero .actions .VPButton.brand:hover')
  const reducedHoverRule = css.slice(reducedMotion).match(
    /\.VPFeature:hover,\s*\.VPButton:hover,\s*\.VPHero \.actions \.VPButton\.brand:hover \{[^}]+\}/,
  )?.[0] ?? ''

  assert.ok(reducedMotion > brandHover, 'reduced-motion rules must follow the normal hover rule')
  assert.ok(
    reducedBrandHover > reducedMotion,
    'reduced motion must repeat the higher-specificity Hero brand hover selector',
  )
  assert.match(reducedHoverRule, /transform: none/)
})

test('tablet navigation collapses desktop controls into the existing nav screen', () => {
  const css = readFileSync(new URL('../docs/.vitepress/theme/style.css', import.meta.url), 'utf8')
  const tabletStart = css.indexOf('@media (min-width: 48rem) and (max-width: 64rem)')
  const nextMedia = css.indexOf('@media', tabletStart + 1)
  const tabletRules = tabletStart === -1 ? '' : css.slice(tabletStart, nextMedia)

  assert.match(
    tabletRules,
    /\.VPNavBar \.VPNavBarMenu,\s*\.VPNavBar \.VPFlyout\.VPNavBarExtra \{\s*display: none/,
  )
  assert.match(tabletRules, /\.VPNavBar \.VPNavBarHamburger \{\s*display: flex/)
  assert.match(tabletRules, /\.VPNav \.VPNavScreen \{\s*display: block/)
})

test('Dark muted text keeps WCAG AA contrast against the page surface', () => {
  const css = readFileSync(new URL('../docs/.vitepress/theme/style.css', import.meta.url), 'utf8')
  const darkTokens = css.match(/\.dark \{([^}]+)\}/)?.[1] ?? ''
  const muted = darkTokens.match(/--fenglan-text-muted:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''
  const page = darkTokens.match(/--fenglan-surface-page:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g)?.map((pair) => Number.parseInt(pair, 16) / 255) ?? []
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const ratio = (luminance(muted) + 0.05) / (luminance(page) + 0.05)

  assert.ok(ratio >= 4.5, `Dark muted contrast must be at least 4.5:1, received ${ratio}`)
})

test('mobile appearance switch exposes a 44px target around the restrained track', () => {
  const css = readFileSync(new URL('../docs/.vitepress/theme/style.css', import.meta.url), 'utf8')
  const target = css.match(
    /\.VPNavScreenAppearance \.VPSwitchAppearance \{[^}]+\}/,
  )?.[0] ?? ''
  const track = css.match(
    /\.VPNavScreenAppearance \.VPSwitchAppearance::before \{[^}]+\}/,
  )?.[0] ?? ''

  assert.match(target, /width: 2\.75rem/)
  assert.match(target, /height: 2\.75rem/)
  assert.match(target, /background: transparent/)
  assert.match(track, /width: 2\.5rem/)
  assert.match(track, /height: 1\.375rem/)
})

test('level-1 sidebar selectors match VitePress active ancestors and use semantic tokens', () => {
  const css = readFileSync(new URL('../docs/.vitepress/theme/style.css', import.meta.url), 'utf8')
  const inactiveText = css.match(
    /\.VPSidebarItem\.level-1 > \.item > \.link > \.text \{[^}]+\}/,
  )?.[0] ?? ''
  const activeLink = css.match(
    /\.VPSidebarItem\.level-1\.is-active > \.item > \.link \{[^}]+\}/,
  )?.[0] ?? ''
  const activeText = css.match(
    /\.VPSidebarItem\.level-1\.is-active > \.item > \.link > \.text \{[^}]+\}/,
  )?.[0] ?? ''
  const genericInteraction = css.match(
    /\.VPSidebarItem \.link:hover \.text,\s*\.VPSidebarItem \.link:focus-visible \.text,/,
  )?.[0] ?? ''
  const levelOneInteraction = css.match(
    /\.VPSidebarItem\.level-1 > \.item > \.link:hover > \.text,\s*\.VPSidebarItem\.level-1 > \.item > \.link:focus-visible > \.text,[^{]*\{[^}]+\}/,
  )?.[0] ?? ''
  const inactiveIndex = css.indexOf('.VPSidebarItem.level-1 > .item > .link > .text {')
  const levelOneInteractionIndex = css.indexOf(
    '.VPSidebarItem.level-1 > .item > .link:hover > .text,',
  )

  assert.match(inactiveText, /color: var\(--fenglan-text-secondary\)/)
  assert.match(activeLink, /background: var\(--fenglan-brand-soft\)/)
  assert.match(activeLink, /border-left: 0\.125rem solid var\(--fenglan-brand\)/)
  assert.match(activeText, /color: var\(--fenglan-brand\)/)
  assert.notEqual(genericInteraction, '', 'other sidebar levels must retain hover/focus styling')
  assert.match(levelOneInteraction, /color: var\(--fenglan-brand\)/)
  assert.ok(
    levelOneInteractionIndex > inactiveIndex,
    'level-1 hover/focus states must follow and outrank the inactive text rule',
  )
  assert.doesNotMatch(css, /\.VPSidebarItem\.level-1[^\{]*\.link\.active/)
  assert.doesNotMatch(css, /\.VPSidebarItem\.level-1[^}]+\{[^}]*color:\s*#5F6963/i)
})

test('rejects 1px outside borders and all other odd px values', () => {
  const findings = findOddPixelValues('.a{padding:1px 3px;border-radius:5px}')
  assert.deepEqual(findings.map(({ value }) => value), ['1px', '3px', '5px'])
})

test('rejects fractional pixel values as complete lengths', () => {
  const findings = findOddPixelValues('.a{gap:2.5px}')
  assert.deepEqual(findings.map(({ value }) => value), ['2.5px'])
})

test('finds legacy palette values case-insensitively', () => {
  const findings = findForbiddenColors('.a{color:#3D8B5E}', ['#3d8b5e'])
  assert.equal(findings.length, 1)
})

test('ignores legacy palette values outside CSS declarations', () => {
  const findings = findForbiddenColors('/* #3d8b5e */ .a{color:var(--x)}', ['#3d8b5e'])
  assert.deepEqual(findings, [])
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

test('accepts a package-manager argument sentinel before a scope', () => {
  assert.equal(parseScope(['--', '--scope', 'icons']), 'icons')
})
