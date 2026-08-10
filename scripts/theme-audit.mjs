import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

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

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length
}

function finding(rule, value, text, index) {
  return { rule, value, line: lineAt(text, index) }
}

function declarations(cssText) {
  const result = []
  const expression = /(?:^|[;{])\s*([\w-]+)\s*:\s*([^;}]*)/g
  let match
  while ((match = expression.exec(cssText))) {
    const propertyOffset = match[0].indexOf(match[1])
    const valueOffset = match[0].lastIndexOf(match[2])
    result.push({
      property: match[1].toLowerCase(),
      value: match[2],
      propertyIndex: match.index + propertyOffset,
      valueIndex: match.index + valueOffset,
    })
  }
  return result
}

export function findOddPixelValues(cssText) {
  const findings = []
  for (const declaration of declarations(cssText)) {
    const expression = /-?(?:\d+(?:\.\d+)?|\.\d+)px\b/gi
    let match
    while ((match = expression.exec(declaration.value))) {
      const pixels = Number.parseFloat(match[0])
      const isBorderHairline = declaration.property.startsWith('border') && pixels === 1
      if (!isBorderHairline && (!Number.isInteger(pixels) || Math.abs(pixels) % 2 === 1)) {
        findings.push(finding('odd-pixel-value', match[0], cssText, declaration.valueIndex + match.index))
      }
    }
  }
  return findings
}

export function findForbiddenColors(cssText, colors) {
  const forbidden = new Set(colors.map((color) => color.toLowerCase()))
  const findings = []
  const expression = /#[0-9a-f]{3,8}\b/gi
  for (const declaration of declarations(cssText)) {
    let match
    while ((match = expression.exec(declaration.value))) {
      if (forbidden.has(match[0].toLowerCase())) {
        findings.push(finding('forbidden-color', match[0], cssText, declaration.valueIndex + match.index))
      }
    }
    expression.lastIndex = 0
  }
  return findings
}

export function findFixedSvgColors(svgText) {
  const findings = []
  const expression = /\b(stroke|fill)\s*=\s*(["'])(.*?)\2/gi
  let match
  while ((match = expression.exec(svgText))) {
    const value = match[3]
    if (/^(?:#[0-9a-f]{3,8}|rgba?\()/i.test(value)) {
      findings.push(finding('fixed-svg-color', value, svgText, match.index + match[0].indexOf(value)))
    }
  }
  return findings
}

export function findMissingTokens(cssText, requiredTokens) {
  const defined = new Set(declarations(cssText).map(({ property }) => property))
  return requiredTokens
    .filter((token) => !defined.has(token))
    .map((token) => finding('missing-token', token, cssText, 0))
}

const paths = {
  css: 'docs/.vitepress/theme/style.css',
  icons: 'docs/public/icons',
}

function svgFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return svgFiles(path)
    return entry.isFile() && entry.name.endsWith('.svg') ? [path] : []
  })
}

function printFindings(path, findings) {
  for (const { line, rule, value } of findings) {
    console.log(`${path}:${line} ${rule} ${value}`)
  }
}

export function runAudit(scope = 'all') {
  const findings = []
  const includes = (section) => scope === 'all' || scope === section
  if (includes('tokens') || includes('css')) {
    const css = existsSync(paths.css) ? readFileSync(paths.css, 'utf8') : ''
    if (includes('tokens')) {
      findings.push(...findMissingTokens(css, REQUIRED_TOKENS).map((item) => ({ path: paths.css, ...item })))
    }
    if (includes('css')) {
      findings.push(...findOddPixelValues(css).map((item) => ({ path: paths.css, ...item })))
      findings.push(...findForbiddenColors(css, FORBIDDEN_COLORS).map((item) => ({ path: paths.css, ...item })))
    }
  }
  if (includes('icons')) {
    for (const path of svgFiles(paths.icons)) {
      findings.push(...findFixedSvgColors(readFileSync(path, 'utf8')).map((item) => ({ path, ...item })))
    }
  }
  for (const { path, ...item } of findings) printFindings(path, [item])
  return findings
}

export function parseScope(args) {
  if (args[0] === '--') args = args.slice(1)
  if (args.length === 0) return 'all'
  if (args.length === 2 && args[0] === '--scope' && ['all', 'tokens', 'css', 'icons'].includes(args[1])) {
    return args[1]
  }
  throw new Error('Usage: node scripts/theme-audit.mjs [--scope all|tokens|css|icons]')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (runAudit(parseScope(process.argv.slice(2))).length > 0) process.exitCode = 1
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
