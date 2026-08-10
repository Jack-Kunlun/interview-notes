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
