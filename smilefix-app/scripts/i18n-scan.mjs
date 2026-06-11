#!/usr/bin/env node
/**
 * Scans src/ for i18n keys used via t() / i18n.t() and reports keys missing
 * from English or Arabic locale files.
 *
 * Usage: npm run i18n:scan
 * Output: console summary + .i18n-missing-keys.json (gitignored)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'src')
const LOCALES = {
  en: path.join(ROOT, 'src/i18n/locales/en/translation.json'),
  ar: path.join(ROOT, 'src/i18n/locales/ar/translation.json'),
}
const OUTPUT_FILE = path.join(ROOT, '.i18n-missing-keys.json')

/** @typedef {{ key: string, file: string, line: number, kind: 'static' | 'labelKey' | 'dynamic' }} KeyUsage */

const STATIC_T_RE = /\b(?:i18n\.)?t\s*\(\s*(['"`])([^'"`\\]+)\1/g
const DYNAMIC_T_RE = /\b(?:i18n\.)?t\s*\(\s*`([^`]*\$\{[^}]+\}[^`]*)`/g
const LABEL_KEY_RE = /\blabelKey\s*:\s*(['"])([^'"]+)\1/g
const I18N_MAP_VALUE_RE = /:\s*(['"])([a-z][a-z0-9]*\.[a-zA-Z0-9.]+)\1/g

/**
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {Set<string>}
 */
function flattenKeys(obj, prefix = '') {
  const keys = new Set()
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of flattenKeys(/** @type {Record<string, unknown>} */ (value), full)) {
        keys.add(nested)
      }
    } else {
      keys.add(full)
    }
  }
  return keys
}

/** @param {string} dir */
function walkTsFiles(dir) {
  /** @type {string[]} */
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

/**
 * @param {string} content
 * @param {string} file
 * @returns {KeyUsage[]}
 */
function extractKeysFromFile(content, file) {
  /** @type {KeyUsage[]} */
  const usages = []
  const relFile = path.relative(ROOT, file).replace(/\\/g, '/')
  const lines = content.split('\n')

  const addUsage = (key, line, kind) => {
    if (!key || key.includes('${')) return
    usages.push({ key, file: relFile, line, kind })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNo = i + 1

    for (const re of [STATIC_T_RE, LABEL_KEY_RE]) {
      re.lastIndex = 0
      let match
      while ((match = re.exec(line)) !== null) {
        addUsage(match[2], lineNo, re === LABEL_KEY_RE ? 'labelKey' : 'static')
      }
    }

    DYNAMIC_T_RE.lastIndex = 0
    let dynamicMatch
    while ((dynamicMatch = DYNAMIC_T_RE.exec(line)) !== null) {
      usages.push({
        key: dynamicMatch[1],
        file: relFile,
        line: lineNo,
        kind: 'dynamic',
      })
    }

    // PATH_TO_KEY-style maps: '/path': 'nav.dashboard'
    if (line.includes('PATH_TO_KEY') || line.includes('path') && line.includes('nav.')) {
      I18N_MAP_VALUE_RE.lastIndex = 0
      let mapMatch
      while ((mapMatch = I18N_MAP_VALUE_RE.exec(line)) !== null) {
        const candidate = mapMatch[2]
        if (/^[a-z]+\.[a-zA-Z]/.test(candidate)) {
          addUsage(candidate, lineNo, 'static')
        }
      }
    }
  }

  return usages
}

/**
 * Expand `prefix.${var}` into concrete keys using locale children under prefix.
 * @param {string} template
 * @param {Set<string>} localeKeys
 * @returns {string[] | null}
 */
function expandDynamicTemplate(template, localeKeys) {
  const match = template.match(/^([a-z][a-z0-9]*\.[^$]*)\$\{[^}]+\}(.*)$/)
  if (!match) return null

  const prefix = match[1].replace(/\.$/, '')
  const suffix = match[2] ?? ''
  const expanded = []

  for (const key of localeKeys) {
    if (!key.startsWith(`${prefix}.`)) continue
    const rest = key.slice(prefix.length + 1)
    if (!rest.includes('.')) {
      expanded.push(`${prefix}.${rest}${suffix}`)
    }
  }

  return expanded.length ? expanded : null
}

function main() {
  const localeData = {}
  const localeKeys = {}

  for (const [lang, filePath] of Object.entries(LOCALES)) {
    if (!fs.existsSync(filePath)) {
      console.error(`Locale file not found: ${filePath}`)
      process.exit(1)
    }
    localeData[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    localeKeys[lang] = flattenKeys(localeData[lang])
  }

  const files = walkTsFiles(SRC_DIR)
  /** @type {KeyUsage[]} */
  const allUsages = []

  for (const file of files) {
    if (file.replace(/\\/g, '/').includes('/i18n/locales/')) continue
    const content = fs.readFileSync(file, 'utf8')
    allUsages.push(...extractKeysFromFile(content, file))
  }

  /** @type {Map<string, { files: Set<string>, kind: KeyUsage['kind'] }>} */
  const usedKeys = new Map()
  /** @type {KeyUsage[]} */
  const dynamicUsages = []

  for (const usage of allUsages) {
    if (usage.kind === 'dynamic') {
      dynamicUsages.push(usage)
      const expandedEn = expandDynamicTemplate(usage.key, localeKeys.en)
      const expandedAr = expandDynamicTemplate(usage.key, localeKeys.ar)
      const expanded = expandedEn ?? expandedAr
      if (expanded) {
        for (const key of expanded) {
          if (!usedKeys.has(key)) {
            usedKeys.set(key, { files: new Set(), kind: 'dynamic' })
          }
          usedKeys.get(key).files.add(`${usage.file}:${usage.line}`)
        }
      }
      continue
    }

    if (!usedKeys.has(usage.key)) {
      usedKeys.set(usage.key, { files: new Set(), kind: usage.kind })
    }
    usedKeys.get(usage.key).files.add(`${usage.file}:${usage.line}`)
  }

  /** @type {string[]} */
  const missingInEn = []
  /** @type {string[]} */
  const missingInAr = []
  /** @type {Record<string, { missingInEn: string[], missingInAr: string[] }>} */
  const byFile = {}

  for (const [key, meta] of [...usedKeys.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const missingEn = !localeKeys.en.has(key)
    const missingAr = !localeKeys.ar.has(key)

    if (missingEn) missingInEn.push(key)
    if (missingAr) missingInAr.push(key)

    if (missingEn || missingAr) {
      for (const loc of meta.files) {
        const file = loc.split(':')[0]
        if (!byFile[file]) {
          byFile[file] = { missingInEn: [], missingInAr: [] }
        }
        if (missingEn && !byFile[file].missingInEn.includes(key)) {
          byFile[file].missingInEn.push(key)
        }
        if (missingAr && !byFile[file].missingInAr.includes(key)) {
          byFile[file].missingInAr.push(key)
        }
      }
    }
  }

  /** @type {KeyUsage[]} */
  const unresolvedDynamic = dynamicUsages.filter((usage) => {
    return !expandDynamicTemplate(usage.key, localeKeys.en)
  })

  const report = {
    scannedAt: new Date().toISOString(),
    scannedFiles: files.length,
    localeFiles: LOCALES,
    summary: {
      totalStaticKeys: usedKeys.size,
      missingInEn: missingInEn.length,
      missingInAr: missingInAr.length,
      dynamicPatterns: dynamicUsages.length,
      unresolvedDynamic: unresolvedDynamic.length,
    },
    missingInEn,
    missingInAr,
    byFile,
    dynamic: dynamicUsages.map((u) => ({
      pattern: u.key,
      file: u.file,
      line: u.line,
      expandedKeys: expandDynamicTemplate(u.key, localeKeys.en) ?? [],
    })),
    unresolvedDynamic: unresolvedDynamic.map((u) => ({
      pattern: u.key,
      file: u.file,
      line: u.line,
      note: 'Could not expand automatically — verify runtime values manually.',
    })),
  }

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log('\n=== i18n missing key scan ===\n')
  console.log(`Scanned ${files.length} files under src/`)
  console.log(`Found ${usedKeys.size} unique translation keys in use`)
  console.log(`Report written to ${path.relative(ROOT, OUTPUT_FILE)}\n`)

  if (missingInEn.length === 0 && missingInAr.length === 0) {
    console.log('✓ All used keys exist in both en and ar locale files.')
  } else {
    if (missingInEn.length) {
      console.log(`Missing in English (${missingInEn.length}):`)
      for (const key of missingInEn) console.log(`  - ${key}`)
      console.log()
    }
    if (missingInAr.length) {
      console.log(`Missing in Arabic (${missingInAr.length}):`)
      for (const key of missingInAr) console.log(`  - ${key}`)
      console.log()
    }
  }

  if (dynamicUsages.length) {
    console.log(`Dynamic t() patterns (${dynamicUsages.length}) — see report for details:`)
    for (const u of dynamicUsages) {
      console.log(`  - ${u.file}:${u.line}  \`${u.key}\``)
    }
    console.log()
  }

  if (unresolvedDynamic.length) {
    console.warn(`Warning: ${unresolvedDynamic.length} dynamic pattern(s) could not be expanded.`)
  }

  const hasProblems = missingInEn.length > 0 || missingInAr.length > 0
  process.exit(hasProblems ? 1 : 0)
}

main()
