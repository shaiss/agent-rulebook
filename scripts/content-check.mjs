#!/usr/bin/env node
/**
 * Fail if published docs content leaks internal details.
 * Prints file:line and category only — never the matched text.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES_DIR = join(ROOT, 'scripts/content-check/fixtures')

const PATTERNS = [
  { category: 'uuid', source: String.raw`\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b` },
  { category: 'vercel/cloud id', source: String.raw`\b(prj|team|dpl|bc)[-_][A-Za-z0-9]{8,}` },
  { category: 'email', source: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` },
  // E.164 and common US formats; avoids ISO dates like 2026-10-23
  { category: 'phone', source: String.raw`(\+\d{10,15}\b|\(\d{3}\)\s?\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b)` },
  { category: 'internal path', source: String.raw`(/workspace|/home/|/cursor/|/opt/|avatars/[\w.-]+\.(jpg|png|json))` },
  { category: 'tool name', source: String.raw`\b(UpdateAvatar|SendToAgent|CloudAgent|PLAN\.json)\b` },
]

const COMPILED = PATTERNS.map(({ category, source }) => ({
  category,
  re: new RegExp(source, 'i'),
}))

function loadExtraTerms() {
  const raw = process.env.CONTENT_CHECK_EXTRA_TERMS
  if (raw == null || raw.trim() === '') {
    console.log(
      'notice: CONTENT_CHECK_EXTRA_TERMS is unset; running generic checks only',
    )
    return []
  }
  return raw
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'))
}

async function collectScanTargets() {
  const files = [join(ROOT, 'README.md'), join(ROOT, 'docs/.vitepress/config.ts')]
  const docsRoot = join(ROOT, 'docs')

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.vitepress') continue
        await walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full)
      }
    }
  }

  await walk(docsRoot)
  return files.sort()
}

async function scanFile(filePath, extraTerms) {
  const text = await readFile(filePath, 'utf8')
  const rel = relative(ROOT, filePath) || filePath
  const hits = []

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const lineNo = index + 1
    for (const { category, re } of COMPILED) {
      if (re.test(line)) hits.push({ file: rel, line: lineNo, category })
    }
    const lower = line.toLowerCase()
    for (const term of extraTerms) {
      if (lower.includes(term)) {
        hits.push({ file: rel, line: lineNo, category: 'private term' })
      }
    }
  }

  return hits
}

function printHits(hits) {
  for (const hit of hits) {
    console.log(`${hit.file}:${hit.line}: ${hit.category}`)
  }
}

async function runScan() {
  const extraTerms = loadExtraTerms()
  const targets = await collectScanTargets()
  const allHits = []
  for (const file of targets) {
    allHits.push(...(await scanFile(file, extraTerms)))
  }
  printHits(allHits)
  if (allHits.length > 0) {
    console.error(`content-check failed: ${allHits.length} finding(s)`)
    process.exit(1)
  }
  console.log(`content-check passed: scanned ${targets.length} file(s)`)
}

async function runSelfTest() {
  // Extra terms intentionally empty so the fixture proves built-in patterns.
  const previous = process.env.CONTENT_CHECK_EXTRA_TERMS
  delete process.env.CONTENT_CHECK_EXTRA_TERMS

  const fixture = join(FIXTURES_DIR, 'planted-leaks.md')
  const hits = await scanFile(fixture, [])

  if (previous === undefined) delete process.env.CONTENT_CHECK_EXTRA_TERMS
  else process.env.CONTENT_CHECK_EXTRA_TERMS = previous

  const categories = new Set(hits.map((h) => h.category))
  const required = ['internal path', 'email']
  const missing = required.filter((c) => !categories.has(c))

  if (hits.length === 0 || missing.length > 0) {
    console.error(
      `content-check self-test failed: expected failures for ${required.join(', ')}; got ${[...categories].join(', ') || '(none)'}`,
    )
    process.exit(1)
  }

  console.log(
    `content-check self-test passed: fixture triggered ${[...categories].sort().join(', ')}`,
  )
}

const mode = process.argv[2]
if (mode === '--self-test') {
  await runSelfTest()
} else if (mode === undefined) {
  await runScan()
} else {
  console.error(`usage: node scripts/content-check.mjs [--self-test]`)
  process.exit(2)
}
