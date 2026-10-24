#!/usr/bin/env node
/**
 * Fail if published docs content leaks internal details.
 * Prints file:line and category only — never the matched text.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES_DIR = join(ROOT, 'scripts/content-check/fixtures')
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

const PATTERNS = [
  { category: 'uuid', source: String.raw`\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b` },
  // Underscore form for Vercel prj_/team_/dpl_; hyphen form for bc- cloud-agent ids
  { category: 'vercel/cloud id', source: String.raw`\b((prj|team|dpl)_[A-Za-z0-9]{8,}|bc-[A-Za-z0-9-]{8,})` },
  { category: 'email', source: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` },
  // E.164 and common US formats; avoids ISO dates like 2026-10-23
  { category: 'phone', source: String.raw`(\+\d{10,15}\b|\(\d{3}\)\s?\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b)` },
  { category: 'internal path', source: String.raw`(/workspace|/home/|/cursor/|/opt/|avatars/[\w.-]+\.(jpg|png|json))` },
  { category: 'tool name', source: String.raw`\b(UpdateAvatar|SendToAgent|CloudAgent|PLAN\.json)\b` },
  {
    category: 'token/key',
    // Allow hyphenated sk- prefixes (e.g. sk-proj-...)
    source: String.raw`(\b(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9-]{20,}|\bAKIA[0-9A-Z]{16}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)`,
  },
]

const COMPILED = PATTERNS.map(({ category, source }) => ({
  category,
  re: new RegExp(source, 'i'),
}))

function loadExtraTerms({ required }) {
  const raw = process.env.CONTENT_CHECK_EXTRA_TERMS
  if (raw == null || raw.trim() === '') {
    if (required) {
      console.error(
        'content-check failed: CONTENT_CHECK_EXTRA_TERMS is empty or missing',
      )
      process.exit(1)
    }
    return []
  }
  return raw
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'))
}

async function walkDocs(collector) {
  const docsRoot = join(ROOT, 'docs')

  async function walk(dir) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (err) {
      if (err && err.code === 'ENOENT') return
      throw err
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.vitepress') continue
        await walk(full)
      } else if (entry.isFile()) {
        collector(full)
      }
    }
  }

  await walk(docsRoot)
}

async function collectTextTargets() {
  const files = [join(ROOT, 'README.md'), join(ROOT, 'docs/.vitepress/config.ts')]
  await walkDocs((full) => {
    if (full.endsWith('.md')) files.push(full)
  })
  return files.sort()
}

async function collectImageTargets() {
  const files = []
  await walkDocs((full) => {
    if (IMAGE_EXTS.has(extname(full).toLowerCase())) files.push(full)
  })
  return files.sort()
}

async function scanTextFile(filePath, extraTerms) {
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

function bufferIndexOf(buf, ascii) {
  return buf.indexOf(Buffer.from(ascii, 'latin1'))
}

function scanJpegMetadata(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return false
  if (bufferIndexOf(buf, 'Exif\u0000\u0000') !== -1) return true
  if (bufferIndexOf(buf, 'http://ns.adobe.com/xap/1.0/') !== -1) return true
  if (bufferIndexOf(buf, 'http://ns.adobe.com/exif/1.0/') !== -1) return true
  // GPS IFD tag often appears inside EXIF payloads
  if (bufferIndexOf(buf, 'GPS ') !== -1 || bufferIndexOf(buf, 'GPSInfo') !== -1) {
    return true
  }
  return false
}

function scanPngMetadata(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buf.length < 8 || !buf.subarray(0, 8).equals(sig)) return false

  let offset = 8
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    if (['tEXt', 'iTXt', 'zTXt', 'eXIf'].includes(type)) return true
    offset += 12 + length
    if (type === 'IEND') break
  }
  return false
}

function scanWebpMetadata(buf) {
  if (buf.length < 12) return false
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return false
  if (buf.toString('ascii', 8, 12) !== 'WEBP') return false
  // Chunk FourCCs used for EXIF / XMP in WebP
  if (bufferIndexOf(buf, 'EXIF') !== -1) return true
  if (bufferIndexOf(buf, 'XMP ') !== -1) return true
  return false
}

async function scanImageFile(filePath) {
  const buf = await readFile(filePath)
  const rel = relative(ROOT, filePath) || filePath
  const ext = extname(filePath).toLowerCase()
  let dirty = false
  if (ext === '.jpg' || ext === '.jpeg') dirty = scanJpegMetadata(buf)
  else if (ext === '.png') dirty = scanPngMetadata(buf)
  else if (ext === '.webp') dirty = scanWebpMetadata(buf)
  return dirty ? [{ file: rel, line: 1, category: 'image metadata' }] : []
}

function printHits(hits) {
  for (const hit of hits) {
    console.log(`${hit.file}:${hit.line}: ${hit.category}`)
  }
}

async function runScan() {
  const extraTerms = loadExtraTerms({ required: true })
  if (extraTerms.length === 0) {
    console.error(
      'content-check failed: CONTENT_CHECK_EXTRA_TERMS has no usable terms',
    )
    process.exit(1)
  }

  const textTargets = await collectTextTargets()
  const imageTargets = await collectImageTargets()
  const allHits = []

  for (const file of textTargets) {
    allHits.push(...(await scanTextFile(file, extraTerms)))
  }

  if (imageTargets.length === 0) {
    console.log('content-check: no docs images to scan; skipping image metadata check')
  } else {
    for (const file of imageTargets) {
      allHits.push(...(await scanImageFile(file)))
    }
  }

  printHits(allHits)
  if (allHits.length > 0) {
    console.error(`content-check failed: ${allHits.length} finding(s)`)
    process.exit(1)
  }
  console.log(
    `content-check passed: scanned ${textTargets.length} text file(s), ${imageTargets.length} image(s)`,
  )
}

async function runSelfTest() {
  const fixture = join(FIXTURES_DIR, 'planted-leaks.md')
  const hits = await scanTextFile(fixture, [])
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
  console.error('usage: node scripts/content-check.mjs [--self-test]')
  process.exit(2)
}
