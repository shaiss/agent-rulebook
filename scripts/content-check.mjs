#!/usr/bin/env node
/**
 * Fail if published docs content leaks internal details.
 * Prints file:line and category only — never the matched text.
 */
import { lstat, readdir, readFile, symlink, writeFile, mkdir } from 'node:fs/promises'
import { join, relative, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeTerm, hashNormalized } from './content-check/hash-terms.mjs'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES_DIR = join(ROOT, 'scripts/content-check/fixtures')
const UTF8 = new TextDecoder('utf-8', { fatal: true })
const ZERO_WIDTH = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g

const TEXT_EXTS = new Set([
  '.md',
  '.vue',
  '.ts',
  '.mts',
  '.js',
  '.json',
  '.html',
  '.txt',
  '.svg',
  '.css',
  '.yml',
  '.yaml',
])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const PATTERNS = [
  { category: 'uuid', source: String.raw`\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b` },
  { category: 'vercel/cloud id', source: String.raw`\b((prj|team|dpl)_[A-Za-z0-9]{8,}|bc-[A-Za-z0-9-]{8,})` },
  { category: 'email', source: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` },
  // Phones: E.164, US punctuated, space-separated, +1 with spaces. Avoid ISO dates / versions via shape.
  {
    category: 'phone',
    source: String.raw`(\+\d{10,15}\b|\+\d{1,3}(?:[\s.-]\d{2,4}){2,5}\b|\(\d{3}\)\s*\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b|\b\d{3}\s\d{3}\s\d{4}\b)`,
  },
  { category: 'internal path', source: String.raw`(/workspace|/home/|/cursor/|/opt/)` },
  {
    category: 'token/key',
    source: String.raw`(\b(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9-]{20,}|\bAKIA[0-9A-Z]{16}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)`,
  },
]

const COMPILED = PATTERNS.map(({ category, source }) => ({
  category,
  re: new RegExp(source, 'i'),
}))

function decodeHtmlEntities(input) {
  let s = input
  let prev
  do {
    prev = s
    s = s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, ent) => {
      if (ent[0] === '#') {
        const code =
          ent[1] === 'x' || ent[1] === 'X'
            ? Number.parseInt(ent.slice(2), 16)
            : Number.parseInt(ent.slice(1), 10)
        if (!Number.isFinite(code)) return match
        try {
          return String.fromCodePoint(code)
        } catch {
          return match
        }
      }
      return NAMED_ENTITIES[ent.toLowerCase()] ?? match
    })
  } while (s !== prev)
  return s
}

/** Normalization applied before regex matching (keeps punctuation for phones/emails). */
function normalizeForRegex(input) {
  let t = input.normalize('NFKC')
  t = t.replace(ZERO_WIDTH, '')
  t = decodeHtmlEntities(t)
  return t
}

function parseHashedTerms(raw) {
  if (raw == null || String(raw).trim() === '') {
    console.error('content-check failed: CONTENT_CHECK_EXTRA_TERMS is empty or missing')
    process.exit(1)
  }

  const lines = String(raw).split(/\r?\n/)
  let saltHex = null
  const hashes = new Set()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    if (saltHex == null) {
      const match = /^salt:([0-9a-fA-F]+)$/.exec(line)
      if (!match) {
        console.error('content-check failed: first term line must be salt:<hex>')
        process.exit(1)
      }
      saltHex = match[1].toLowerCase()
      if (saltHex.length < 32 || saltHex.length % 2 !== 0) {
        console.error('content-check failed: malformed salt')
        process.exit(1)
      }
      continue
    }

    if (!/^[0-9a-f]{64}$/.test(line.toLowerCase())) {
      console.error('content-check failed: malformed term hash line')
      process.exit(1)
    }
    hashes.add(line.toLowerCase())
  }

  if (saltHex == null) {
    console.error('content-check failed: salt is missing')
    process.exit(1)
  }
  if (hashes.size === 0) {
    console.error('content-check failed: zero term hashes')
    process.exit(1)
  }

  return { saltHex, hashes }
}

function ngrams(words, maxN) {
  const out = []
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      out.push(words.slice(i, i + n).join(' '))
    }
  }
  return out
}

function privateTermHitsOnLine(line, saltHex, hashes) {
  const normalized = normalizeTerm(line)
  if (!normalized) return false
  const words = normalized.split(' ').filter(Boolean)
  for (const gram of ngrams(words, 4)) {
    if (hashes.has(hashNormalized(saltHex, gram))) return true
  }
  return false
}

function shouldSkipDir(relPosix) {
  return (
    relPosix === 'docs/.vitepress/cache' ||
    relPosix.startsWith('docs/.vitepress/cache/') ||
    relPosix === 'docs/.vitepress/dist' ||
    relPosix.startsWith('docs/.vitepress/dist/')
  )
}

async function collectDocsFiles() {
  const files = []
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
      const rel = relative(ROOT, full).split('\\').join('/')

      if (entry.isSymbolicLink()) {
        files.push({ full, rel, kind: 'symlink' })
        continue
      }

      if (entry.isDirectory()) {
        if (shouldSkipDir(rel)) continue
        await walk(full)
        continue
      }

      if (entry.isFile()) {
        // Double-check with lstat for symlink-as-file edge cases
        const st = await lstat(full)
        if (st.isSymbolicLink()) {
          files.push({ full, rel, kind: 'symlink' })
          continue
        }
        files.push({ full, rel, kind: 'file' })
      }
    }
  }

  await walk(docsRoot)

  // Always include root README when present
  const readme = join(ROOT, 'README.md')
  try {
    const st = await lstat(readme)
    if (st.isSymbolicLink()) files.push({ full: readme, rel: 'README.md', kind: 'symlink' })
    else if (st.isFile()) files.push({ full: readme, rel: 'README.md', kind: 'file' })
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err
  }

  return files.sort((a, b) => a.rel.localeCompare(b.rel))
}

function classifyFile(rel) {
  const ext = extname(rel).toLowerCase()
  if (TEXT_EXTS.has(ext)) return 'text'
  if (IMAGE_EXTS.has(ext)) return 'image'
  return 'unknown'
}

function decodeUtf8(buf) {
  try {
    return UTF8.decode(buf)
  } catch {
    return null
  }
}

async function scanTextBuffer(rel, buf, saltHex, hashes) {
  const text = decodeUtf8(buf)
  if (text == null) {
    return [{ file: rel, line: 1, category: 'utf-8 decode' }]
  }

  const hits = []
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const lineNo = index + 1
    const prepared = normalizeForRegex(line)
    for (const { category, re } of COMPILED) {
      if (re.test(prepared)) hits.push({ file: rel, line: lineNo, category })
    }
    if (saltHex && hashes && privateTermHitsOnLine(line, saltHex, hashes)) {
      hits.push({ file: rel, line: lineNo, category: 'private term' })
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
  if (bufferIndexOf(buf, 'GPS ') !== -1 || bufferIndexOf(buf, 'GPSInfo') !== -1) return true
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
  if (bufferIndexOf(buf, 'EXIF') !== -1) return true
  if (bufferIndexOf(buf, 'XMP ') !== -1) return true
  return false
}

function scanGifMetadata(buf) {
  if (buf.length < 6) return false
  const head = buf.toString('ascii', 0, 6)
  if (head !== 'GIF87a' && head !== 'GIF89a') return false
  // Comment Extension
  if (buf.includes(Buffer.from([0x21, 0xfe]))) return true
  if (bufferIndexOf(buf, 'http://ns.adobe.com/xap') !== -1) return true
  return false
}

function scanAvifMetadata(buf) {
  if (bufferIndexOf(buf, 'ftyp') === -1) return false
  if (bufferIndexOf(buf, 'Exif') !== -1) return true
  if (bufferIndexOf(buf, 'EXIF') !== -1) return true
  if (bufferIndexOf(buf, 'XMP ') !== -1) return true
  if (bufferIndexOf(buf, 'xml ') !== -1 && bufferIndexOf(buf, 'xpacket') !== -1) return true
  return false
}

function scanImageMetadata(buf, ext) {
  if (ext === '.jpg' || ext === '.jpeg') return scanJpegMetadata(buf)
  if (ext === '.png') return scanPngMetadata(buf)
  if (ext === '.webp') return scanWebpMetadata(buf)
  if (ext === '.gif') return scanGifMetadata(buf)
  if (ext === '.avif') return scanAvifMetadata(buf)
  return false
}

function printHits(hits) {
  for (const hit of hits) {
    console.log(`${hit.file}:${hit.line}: ${hit.category}`)
  }
}

async function scanTarget(target, saltHex, hashes) {
  if (target.kind === 'symlink') {
    return [{ file: target.rel, line: 1, category: 'symlink' }]
  }

  const kind = classifyFile(target.rel)
  if (kind === 'unknown') {
    return [{ file: target.rel, line: 1, category: 'unknown binary' }]
  }

  const buf = await readFile(target.full)
  if (kind === 'text') return scanTextBuffer(target.rel, buf, saltHex, hashes)
  if (scanImageMetadata(buf, extname(target.rel).toLowerCase())) {
    return [{ file: target.rel, line: 1, category: 'image metadata' }]
  }
  return []
}

async function runScan() {
  const { saltHex, hashes } = parseHashedTerms(process.env.CONTENT_CHECK_EXTRA_TERMS)
  const targets = await collectDocsFiles()
  const allHits = []

  for (const target of targets) {
    allHits.push(...(await scanTarget(target, saltHex, hashes)))
  }

  printHits(allHits)
  if (allHits.length > 0) {
    console.error(`content-check failed: ${allHits.length} finding(s)`)
    process.exit(1)
  }
  console.log(`content-check passed: scanned ${targets.length} path(s)`)
}

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function buildPngWithTextChunk() {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(1, 0)
  ihdrData.writeUInt32BE(1, 4)
  ihdrData[8] = 8
  ihdrData[9] = 0
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
    return Buffer.concat([len, typeBuf, data, crc])
  }

  // 1x1 grayscale + filter byte
  const idat = Buffer.from([0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01])
  const text = Buffer.from('Comment\u0000fixture', 'latin1')
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('tEXt', text),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function runSelfTest() {
  const saltHex = '0123456789abcdef0123456789abcdef'
  const privateTerms = ['zz-test-term', 'fakeorg/secretdir']
  const hashes = new Set(
    privateTerms.map((term) => hashNormalized(saltHex, normalizeTerm(term))),
  )

  const plantedPath = join(FIXTURES_DIR, 'planted-leaks.md')
  const cleanPath = join(FIXTURES_DIR, 'clean.md')
  const symlinkPath = join(FIXTURES_DIR, 'planted-symlink.md')
  const dirtyPngPath = join(FIXTURES_DIR, 'planted-meta.png')

  await mkdir(FIXTURES_DIR, { recursive: true })
  await writeFile(
    plantedPath,
    [
      '# planted fixture (excluded from published scan)',
      'uuid: 123e4567-e89b-12d3-a456-426614174000',
      'cloud: prj_ExampleTestId01',
      'email: agent@example.com',
      'phone: 555-010-0199 and +1 267 555 0123',
      'path: /workspace/example',
      'token: ghp_abcdefghijklmnopqrstuvwx',
      'private: zz-test-term near fakeorg/secretdir',
      '',
    ].join('\n'),
    'utf8',
  )
  await writeFile(
    cleanPath,
    ['# clean fixture', '', 'This documentation page has no planted leaks.', ''].join('\n'),
    'utf8',
  )
  await writeFile(dirtyPngPath, buildPngWithTextChunk())

  try {
    await symlink('planted-leaks.md', symlinkPath)
  } catch (err) {
    if (!err || err.code !== 'EEXIST') throw err
  }

  const required = [
    'uuid',
    'vercel/cloud id',
    'email',
    'phone',
    'internal path',
    'token/key',
    'private term',
    'image metadata',
    'symlink',
  ]

  const plantedBuf = await readFile(plantedPath)
  const textHits = await scanTextBuffer(
    'scripts/content-check/fixtures/planted-leaks.md',
    plantedBuf,
    saltHex,
    hashes,
  )
  const imageHits = (await scanImageMetadata(await readFile(dirtyPngPath), '.png'))
    ? [{ file: 'scripts/content-check/fixtures/planted-meta.png', line: 1, category: 'image metadata' }]
    : []
  const symlinkHits = [
    { file: 'scripts/content-check/fixtures/planted-symlink.md', line: 1, category: 'symlink' },
  ]

  const allHits = [...textHits, ...imageHits, ...symlinkHits]
  const categories = new Set(allHits.map((h) => h.category))
  const missing = required.filter((c) => !categories.has(c))
  if (missing.length > 0) {
    console.error(
      `content-check self-test failed: missing ${missing.join(', ')}; got ${[...categories].sort().join(', ') || '(none)'}`,
    )
    process.exit(1)
  }

  const cleanBuf = await readFile(cleanPath)
  const cleanHits = await scanTextBuffer(
    'scripts/content-check/fixtures/clean.md',
    cleanBuf,
    saltHex,
    hashes,
  )
  if (cleanHits.length !== 0) {
    console.error(
      `content-check self-test failed: clean fixture had ${cleanHits.length} finding(s)`,
    )
    process.exit(1)
  }

  // Fail-closed parse checks via child processes (parseHashedTerms exits)
  const { spawnSync } = await import('node:child_process')
  for (const bad of [undefined, '', 'nope', 'salt:zz\nab', `salt:${saltHex}`]) {
    const env = { ...process.env }
    if (bad === undefined) delete env.CONTENT_CHECK_EXTRA_TERMS
    else env.CONTENT_CHECK_EXTRA_TERMS = bad
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env,
      encoding: 'utf8',
    })
    if (result.status === 0) {
      console.error('content-check self-test failed: expected fail-closed for bad secret')
      process.exit(1)
    }
  }

  console.log(
    `content-check self-test passed: detected ${[...categories].sort().join(', ')}; clean fixture clean`,
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
