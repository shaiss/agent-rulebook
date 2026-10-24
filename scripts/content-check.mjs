#!/usr/bin/env node
/**
 * Fail if published docs content leaks internal details.
 * Prints file:line and category only — never the matched text.
 */
import { lstat, mkdtemp, readdir, readFile, rm, symlink, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashNormalized } from './content-check/hash-terms.mjs'
import {
  isValidSaltHex,
  MAX_TERM_WORDS,
  normalizeForRegex,
  normalizeTerm,
} from './content-check/normalize.mjs'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const FIXTURES_DIR = join(ROOT, 'scripts/content-check/fixtures')
const UTF8 = new TextDecoder('utf-8', { fatal: true })

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
      if (!isValidSaltHex(saltHex)) {
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
  for (const gram of ngrams(words, MAX_TERM_WORDS)) {
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

  const lines = text.split(/\r?\n/)
  const hits = []
  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1
    const prepared = normalizeForRegex(line)
    for (const { category, re } of COMPILED) {
      if (re.test(prepared)) hits.push({ file: rel, line: lineNo, category })
    }
    if (saltHex && hashes && privateTermHitsOnLine(line, saltHex, hashes)) {
      hits.push({ file: rel, line: lineNo, category: 'private term' })
    }
    // L6: also match private terms across one line break
    if (saltHex && hashes && index + 1 < lines.length) {
      const joined = `${line} ${lines[index + 1]}`
      if (privateTermHitsOnLine(joined, saltHex, hashes)) {
        hits.push({ file: rel, line: lineNo, category: 'private term' })
      }
    }
  }
  return hits
}

function bufferIndexOf(buf, ascii) {
  return buf.indexOf(Buffer.from(ascii, 'latin1'))
}

function matchesImageMagic(buf, ext) {
  if (ext === '.png') {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    return buf.length >= 8 && buf.subarray(0, 8).equals(sig)
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8
  }
  if (ext === '.gif') {
    if (buf.length < 6) return false
    const head = buf.toString('ascii', 0, 6)
    return head === 'GIF87a' || head === 'GIF89a'
  }
  if (ext === '.webp') {
    return (
      buf.length >= 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP'
    )
  }
  if (ext === '.avif') {
    if (buf.length < 12) return false
    if (buf.toString('ascii', 4, 8) !== 'ftyp') return false
    const brands = buf.toString('latin1', 8, Math.min(buf.length, 64))
    return /avif|avis|mif1|miaf/i.test(brands)
  }
  return false
}

function scanJpegMetadata(buf) {
  // Caller verified SOI magic. Walk markers for COM / APP13 / EXIF / XMP / GPS.
  let offset = 2
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) return 'image metadata: unparseable jpeg'
    let marker = buf[offset + 1]
    while (marker === 0xff && offset + 2 < buf.length) {
      offset += 1
      marker = buf[offset + 1]
    }
    if (marker === 0xd9) break // EOI
    if (marker === 0xda) break // SOS
    // Standalone markers without length
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0x00) {
      offset += 2
      continue
    }
    if (offset + 4 > buf.length) return 'image metadata: unparseable jpeg'
    const len = buf.readUInt16BE(offset + 2)
    if (len < 2 || offset + 2 + len > buf.length) return 'image metadata: unparseable jpeg'
    if (marker === 0xfe || marker === 0xed) {
      return 'image metadata'
    }
    const seg = buf.subarray(offset + 4, offset + 2 + len)
    if (
      bufferIndexOf(seg, 'Exif\u0000\u0000') !== -1 ||
      bufferIndexOf(seg, 'http://ns.adobe.com/xap/1.0/') !== -1 ||
      bufferIndexOf(seg, 'http://ns.adobe.com/exif/1.0/') !== -1 ||
      bufferIndexOf(seg, 'GPS ') !== -1 ||
      bufferIndexOf(seg, 'GPSInfo') !== -1
    ) {
      return 'image metadata'
    }
    offset += 2 + len
  }
  return false
}

function scanPngMetadata(buf) {
  // Caller verified PNG signature.
  let offset = 8
  let sawIend = false
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    if (offset + 12 + length > buf.length) return 'image metadata: unparseable png'
    const type = buf.toString('ascii', offset + 4, offset + 8)
    if (['tEXt', 'iTXt', 'zTXt', 'eXIf'].includes(type)) return 'image metadata'
    offset += 12 + length
    if (type === 'IEND') {
      sawIend = true
      break
    }
  }
  if (!sawIend) return 'image metadata: unparseable png'
  return false
}

function scanWebpMetadata(buf) {
  // Caller verified RIFF/WEBP magic.
  if (bufferIndexOf(buf, 'EXIF') !== -1) return 'image metadata'
  if (bufferIndexOf(buf, 'XMP ') !== -1) return 'image metadata'
  return false
}

function skipGifSubBlocks(buf, offset) {
  while (offset < buf.length) {
    const size = buf[offset]
    offset += 1
    if (size === 0) return offset
    if (offset + size > buf.length) return -1
    offset += size
  }
  return -1
}

/**
 * Walk GIF blocks. Returns false (clean/not a GIF), or a finding category string.
 * Never silently passes truncated/malformed GIFs.
 */
function scanGifMetadata(buf) {
  if (buf.length < 6) return false
  const head = buf.toString('ascii', 0, 6)
  if (head !== 'GIF87a' && head !== 'GIF89a') return false

  // Logical Screen Descriptor (7 bytes)
  if (buf.length < 13) return 'image metadata: unparseable gif'
  let offset = 6
  offset += 4 // width, height
  const packed = buf[offset]
  offset += 3 // packed + bg color + aspect

  if (packed & 0x80) {
    const gctBytes = 3 * 2 ** ((packed & 0x07) + 1)
    if (offset + gctBytes > buf.length) return 'image metadata: unparseable gif'
    offset += gctBytes
  }

  while (offset < buf.length) {
    const introducer = buf[offset]
    offset += 1

    if (introducer === 0x3b) {
      // L2: bytes after the trailer are malformed
      if (offset < buf.length) return 'image metadata: unparseable gif'
      return false
    }

    if (introducer === 0x2c) {
      // Image Descriptor: 9 bytes after introducer
      if (offset + 9 > buf.length) return 'image metadata: unparseable gif'
      offset += 8
      const ipacked = buf[offset]
      offset += 1
      if (ipacked & 0x80) {
        const lctBytes = 3 * 2 ** ((ipacked & 0x07) + 1)
        if (offset + lctBytes > buf.length) return 'image metadata: unparseable gif'
        offset += lctBytes
      }
      if (offset >= buf.length) return 'image metadata: unparseable gif'
      offset += 1 // LZW minimum code size
      const next = skipGifSubBlocks(buf, offset)
      if (next < 0) return 'image metadata: unparseable gif'
      offset = next
      continue
    }

    if (introducer === 0x21) {
      if (offset >= buf.length) return 'image metadata: unparseable gif'
      const label = buf[offset]
      offset += 1

      if (label === 0xfe) {
        return 'image metadata'
      }

      if (label === 0xff) {
        if (offset >= buf.length) return 'image metadata: unparseable gif'
        const appSize = buf[offset]
        if (offset + 1 + appSize > buf.length) return 'image metadata: unparseable gif'
        offset += 1
        const appId = buf.toString('latin1', offset, offset + appSize)
        offset += appSize

        if (appId === 'XMP DataXMP') {
          // XMP application extension counts as metadata; xap URI check stays inside this path only.
          let dataOffset = offset
          while (dataOffset < buf.length) {
            const size = buf[dataOffset]
            dataOffset += 1
            if (size === 0) {
              return 'image metadata'
            }
            if (dataOffset + size > buf.length) return 'image metadata: unparseable gif'
            const chunk = buf.subarray(dataOffset, dataOffset + size)
            if (chunk.includes(Buffer.from('http://ns.adobe.com/xap', 'latin1'))) {
              return 'image metadata'
            }
            dataOffset += size
          }
          return 'image metadata: unparseable gif'
        }

        // L3: allow only common animation app extensions; anything else is metadata
        if (appId === 'NETSCAPE2.0' || appId === 'ANIMEXTS1.0') {
          const next = skipGifSubBlocks(buf, offset)
          if (next < 0) return 'image metadata: unparseable gif'
          offset = next
          continue
        }

        return 'image metadata'
      }

      const next = skipGifSubBlocks(buf, offset)
      if (next < 0) return 'image metadata: unparseable gif'
      offset = next
      continue
    }

    return 'image metadata: unparseable gif'
  }

  return 'image metadata: unparseable gif'
}

function scanAvifMetadata(buf) {
  // Caller verified ftyp/avif magic.
  if (bufferIndexOf(buf, 'Exif') !== -1) return 'image metadata'
  if (bufferIndexOf(buf, 'EXIF') !== -1) return 'image metadata'
  if (bufferIndexOf(buf, 'XMP ') !== -1) return 'image metadata'
  if (bufferIndexOf(buf, 'xml ') !== -1 && bufferIndexOf(buf, 'xpacket') !== -1) {
    return 'image metadata'
  }
  return false
}

function scanImageMetadata(buf, ext) {
  if (ext === '.gif') return scanGifMetadata(buf)
  if (ext === '.jpg' || ext === '.jpeg') return scanJpegMetadata(buf)
  if (ext === '.png') return scanPngMetadata(buf)
  if (ext === '.webp') return scanWebpMetadata(buf)
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
  const ext = extname(target.rel).toLowerCase()
  if (!matchesImageMagic(buf, ext)) {
    return [{ file: target.rel, line: 1, category: 'unknown binary' }]
  }
  const meta = scanImageMetadata(buf, ext)
  if (meta) {
    return [{ file: target.rel, line: 1, category: meta }]
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

/** Minimal GIF89a helpers for self-test (generated at runtime). */
function buildGif({
  comment = false,
  xmp = false,
  lzwPoison = false,
  truncate = false,
  afterTrailer = false,
  appId = null,
} = {}) {
  const parts = []
  parts.push(Buffer.from('GIF89a', 'ascii'))
  // Logical screen: 1x1, no global color table
  const lsd = Buffer.alloc(7)
  lsd.writeUInt16LE(1, 0)
  lsd.writeUInt16LE(1, 2)
  parts.push(lsd)

  if (comment) {
    parts.push(Buffer.from([0x21, 0xfe, 0x03, 0x68, 0x69, 0x21, 0x00]))
  }

  if (xmp) {
    parts.push(Buffer.from([0x21, 0xff, 0x0b]))
    parts.push(Buffer.from('XMP DataXMP', 'ascii'))
    const xap = Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'ascii')
    parts.push(Buffer.from([xap.length]))
    parts.push(xap)
    parts.push(Buffer.from([0x00]))
  }

  if (appId) {
    const idBuf = Buffer.from(appId, 'latin1')
    parts.push(Buffer.from([0x21, 0xff, idBuf.length]))
    parts.push(idBuf)
    parts.push(Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]))
  }

  // Image descriptor, no local color table
  const img = Buffer.alloc(10)
  img[0] = 0x2c
  img.writeUInt16LE(1, 5)
  img.writeUInt16LE(1, 7)
  parts.push(img)
  parts.push(Buffer.from([0x02])) // LZW minimum code size

  if (lzwPoison) {
    // Sub-block whose payload contains 0x21 0xFE (must not be treated as a comment)
    parts.push(Buffer.from([0x04, 0x00, 0x21, 0xfe, 0x01, 0x00]))
  } else {
    parts.push(Buffer.from([0x02, 0x4c, 0x01, 0x00]))
  }

  if (!truncate) {
    parts.push(Buffer.from([0x3b]))
  }

  const full = Buffer.concat(parts)
  if (truncate) {
    return full.subarray(0, Math.max(10, full.length - 3))
  }
  if (afterTrailer) {
    return Buffer.concat([full, Buffer.from([0x00, 0x01, 0x02])])
  }
  return full
}

/** Minimal JPEG with optional COM / APP13 segments. */
function buildJpeg({ com = false, app13 = false } = {}) {
  const parts = [Buffer.from([0xff, 0xd8])] // SOI
  if (com) {
    const data = Buffer.from('fixture', 'latin1')
    const len = Buffer.alloc(2)
    len.writeUInt16BE(2 + data.length, 0)
    parts.push(Buffer.from([0xff, 0xfe]), len, data)
  }
  if (app13) {
    const data = Buffer.from('Photoshop 3.0\0', 'latin1')
    const len = Buffer.alloc(2)
    len.writeUInt16BE(2 + data.length, 0)
    parts.push(Buffer.from([0xff, 0xed]), len, data)
  }
  // Minimal SOF0 + empty scan is unnecessary; close with EOI
  parts.push(Buffer.from([0xff, 0xd9]))
  return Buffer.concat(parts)
}

function buildPng({ truncate = false, overrun = false } = {}) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(1, 0)
  ihdrData.writeUInt32BE(1, 4)
  ihdrData[8] = 8
  ihdrData[9] = 0

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
    return Buffer.concat([len, typeBuf, data, crc])
  }

  const idat = Buffer.from([0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01])
  if (overrun) {
    // Claim a huge chunk length so the walker runs past EOF
    const bogus = Buffer.alloc(8)
    bogus.writeUInt32BE(0xffff, 0)
    bogus.write('IDAT', 4, 4, 'ascii')
    return Buffer.concat([signature, chunk('IHDR', ihdrData), bogus])
  }
  if (truncate) {
    return Buffer.concat([signature, chunk('IHDR', ihdrData), chunk('IDAT', idat)])
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function selfTestFail(message) {
  console.error(message)
  process.exitCode = 1
  throw new Error(message)
}

async function runSelfTest() {
  const saltHex = '0123456789abcdef0123456789abcdef'
  let tmpRoot = null
  try {
    if (!isValidSaltHex(saltHex)) {
      selfTestFail('content-check self-test failed: synthetic salt is invalid')
    }

    // Normalization: entity-encoded accents/marks/ZW and double-encoding fold to zorvik
    const zorvikVariants = [
      'Zorvík',
      'Zo&#8203;rvik',
      'Zorv&#237;k',
      'Zorvi&#769;k',
      'Zorv&amp;#237;k',
      'Zorv&#x200B;ík',
    ]
    for (const variant of zorvikVariants) {
      if (normalizeTerm(variant) !== 'zorvik') {
        selfTestFail('content-check self-test failed: normalization mismatch')
      }
    }

    // Plain ASCII term hashing is unchanged (NFKC/NFKD/entity order is a no-op on ASCII).
    const asciiGolden = {
      'zz-test-term': '5e325c0a5da6a8d6b32abc20d6173a97230b2d0608f03c1ff92248b5d81d8c66',
      'fakeorg/secretdir': '9e7ccafc227062a073abc99d69bacbb547f7faf684a26bffcad59606abcd1a3c',
    }
    for (const [term, expected] of Object.entries(asciiGolden)) {
      const actual = hashNormalized(saltHex, normalizeTerm(term))
      if (actual !== expected) {
        selfTestFail('content-check self-test failed: ASCII term hash changed')
      }
    }

    const privateTerms = ['zz-test-term', 'fakeorg/secretdir', 'zorvik']
    const hashes = new Set(
      privateTerms.map((term) => hashNormalized(saltHex, normalizeTerm(term))),
    )

    const plantedPath = join(FIXTURES_DIR, 'planted-leaks.md')
    const cleanPath = join(FIXTURES_DIR, 'clean.md')
    const dirtyPngPath = join(FIXTURES_DIR, 'planted-meta.png')

    await mkdir(FIXTURES_DIR, { recursive: true })
    await writeFile(
      plantedPath,
      [
        '# planted fixture (excluded from published scan)',
        'uuid: 123e4567-e89b-12d3-a456-426614174000',
        'cloud: prj_ExampleTestId01',
        'email: agent@example.com',
        'phone: 555-010-0199 and +1 202 555 0123',
        'path: /workspace/example',
        'token: ghp_abcdefghijklmnopqrstuvwx',
        'private: zz-test-term near fakeorg/secretdir',
        'entity: Zorv&#237;k and Zorvi&#769;k and Zorv&amp;#237;k and Zo&#8203;rvik',
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
      'unknown binary',
      'utf-8 decode',
    ]

    const plantedBuf = await readFile(plantedPath)
    const textHits = await scanTextBuffer(
      'scripts/content-check/fixtures/planted-leaks.md',
      plantedBuf,
      saltHex,
      hashes,
    )
    const imageHits = await scanTarget(
      {
        full: dirtyPngPath,
        rel: 'scripts/content-check/fixtures/planted-meta.png',
        kind: 'file',
      },
      saltHex,
      hashes,
    )

    tmpRoot = await mkdtemp(join(tmpdir(), 'content-check-'))
    const targetMd = join(tmpRoot, 'target.md')
    const linkMd = join(tmpRoot, 'link.md')
    const unknownBin = join(tmpRoot, 'blob.bin')
    const badUtf8 = join(tmpRoot, 'bad.md')
    await writeFile(targetMd, 'ok\n', 'utf8')
    await symlink('target.md', linkMd)
    await writeFile(unknownBin, Buffer.from([0x00, 0x01, 0x02, 0xff]))
    await writeFile(badUtf8, Buffer.from([0xe2, 0x28, 0xa1])) // invalid UTF-8

    const linkStat = await lstat(linkMd)
    if (!linkStat.isSymbolicLink()) {
      selfTestFail('content-check self-test failed: temp path is not a symlink')
    }
    const symlinkHits = await scanTarget(
      { full: linkMd, rel: 'tmp/link.md', kind: 'symlink' },
      saltHex,
      hashes,
    )
    const unknownHits = await scanTarget(
      { full: unknownBin, rel: 'tmp/blob.bin', kind: 'file' },
      saltHex,
      hashes,
    )
    const utf8Hits = await scanTarget(
      { full: badUtf8, rel: 'tmp/bad.md', kind: 'file' },
      saltHex,
      hashes,
    )

    // GIF walker cases (runtime-generated fixtures)
    const cleanGifPath = join(tmpRoot, 'clean-poison.gif')
    const commentGifPath = join(tmpRoot, 'comment.gif')
    const xmpGifPath = join(tmpRoot, 'xmp.gif')
    const truncGifPath = join(tmpRoot, 'truncated.gif')
    await writeFile(cleanGifPath, buildGif({ lzwPoison: true }))
    await writeFile(commentGifPath, buildGif({ comment: true }))
    await writeFile(xmpGifPath, buildGif({ xmp: true }))
    await writeFile(truncGifPath, buildGif({ truncate: true }))

    const cleanGifHits = await scanTarget(
      { full: cleanGifPath, rel: 'tmp/clean-poison.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    if (cleanGifHits.length !== 0) {
      selfTestFail(
        'content-check self-test failed: clean GIF with 0x21 0xFE in LZW data had findings',
      )
    }
    const commentGifHits = await scanTarget(
      { full: commentGifPath, rel: 'tmp/comment.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    const xmpGifHits = await scanTarget(
      { full: xmpGifPath, rel: 'tmp/xmp.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    const truncGifHits = await scanTarget(
      { full: truncGifPath, rel: 'tmp/truncated.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    if (!commentGifHits.some((h) => h.category === 'image metadata')) {
      selfTestFail('content-check self-test failed: GIF comment extension not detected')
    }
    if (!xmpGifHits.some((h) => h.category === 'image metadata')) {
      selfTestFail('content-check self-test failed: GIF XMP application extension not detected')
    }
    if (!truncGifHits.some((h) => h.category === 'image metadata: unparseable gif')) {
      selfTestFail('content-check self-test failed: truncated GIF not reported as unparseable')
    }

    // Entity-encoded private term variants must hash-match "zorvik"
    const entityHits = await scanTextBuffer(
      'scripts/content-check/fixtures/planted-leaks.md',
      plantedBuf,
      saltHex,
      hashes,
    )
    if (!entityHits.some((h) => h.category === 'private term' && h.line >= 8)) {
      selfTestFail('content-check self-test failed: entity-encoded private term not detected')
    }

    // M1: HTML5 named entities (entities package) fold into zorvik and are detected
    const namedEntityVariants = ['Zorv&iacute;k', 'Zor&shy;vik', 'Zor&ZeroWidthSpace;vik']
    for (const variant of namedEntityVariants) {
      if (normalizeTerm(variant) !== 'zorvik') {
        selfTestFail('content-check self-test failed: named-entity normalization mismatch')
      }
    }
    const namedEntityBuf = Buffer.from(
      `${namedEntityVariants.map((v) => `named: ${v}`).join('\n')}\n`,
      'utf8',
    )
    const namedEntityHits = await scanTextBuffer('tmp/named-entities.md', namedEntityBuf, saltHex, hashes)
    if (namedEntityHits.filter((h) => h.category === 'private term').length < namedEntityVariants.length) {
      selfTestFail('content-check self-test failed: named-entity private term not detected')
    }

    // M2: extension/magic mismatch → unknown binary
    const fakePngPath = join(tmpRoot, 'x.png')
    await writeFile(fakePngPath, 'this is not a png\n', 'utf8')
    const fakePngHits = await scanTarget(
      { full: fakePngPath, rel: 'tmp/x.png', kind: 'file' },
      saltHex,
      hashes,
    )
    if (!fakePngHits.some((h) => h.category === 'unknown binary')) {
      selfTestFail('content-check self-test failed: magic/extension mismatch not unknown binary')
    }

    // L1: U+2061–2064 and U+180E treated as zero-width
    const zwFormatVariants = [
      `Zorv\u2061ík`,
      `Zor\u2062vik`,
      `Zo\u2063rvik`,
      `Zorv\u2064ik`,
      `Zorv\u180Eík`,
    ]
    for (const variant of zwFormatVariants) {
      if (normalizeTerm(variant) !== 'zorvik') {
        selfTestFail('content-check self-test failed: format/ZW normalization mismatch')
      }
    }

    // L2: GIF bytes after trailer → unparseable
    const trailerJunkPath = join(tmpRoot, 'trailer-junk.gif')
    await writeFile(trailerJunkPath, buildGif({ afterTrailer: true }))
    const trailerJunkHits = await scanTarget(
      { full: trailerJunkPath, rel: 'tmp/trailer-junk.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    if (!trailerJunkHits.some((h) => h.category === 'image metadata: unparseable gif')) {
      selfTestFail('content-check self-test failed: GIF bytes after trailer not unparseable')
    }

    // L3: non-allowlisted GIF application extension → image metadata
    const oddAppPath = join(tmpRoot, 'odd-app.gif')
    await writeFile(oddAppPath, buildGif({ appId: 'ODDAPPEXT!!' }))
    const oddAppHits = await scanTarget(
      { full: oddAppPath, rel: 'tmp/odd-app.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    if (!oddAppHits.some((h) => h.category === 'image metadata')) {
      selfTestFail('content-check self-test failed: odd GIF app extension not flagged')
    }
    const netscapePath = join(tmpRoot, 'netscape.gif')
    await writeFile(netscapePath, buildGif({ appId: 'NETSCAPE2.0' }))
    const netscapeHits = await scanTarget(
      { full: netscapePath, rel: 'tmp/netscape.gif', kind: 'file' },
      saltHex,
      hashes,
    )
    if (netscapeHits.length !== 0) {
      selfTestFail('content-check self-test failed: NETSCAPE2.0 GIF should be clean')
    }

    // L4: JPEG COM / APP13 → image metadata
    const jpegComPath = join(tmpRoot, 'com.jpg')
    const jpegApp13Path = join(tmpRoot, 'app13.jpg')
    await writeFile(jpegComPath, buildJpeg({ com: true }))
    await writeFile(jpegApp13Path, buildJpeg({ app13: true }))
    const jpegComHits = await scanTarget(
      { full: jpegComPath, rel: 'tmp/com.jpg', kind: 'file' },
      saltHex,
      hashes,
    )
    const jpegApp13Hits = await scanTarget(
      { full: jpegApp13Path, rel: 'tmp/app13.jpg', kind: 'file' },
      saltHex,
      hashes,
    )
    if (!jpegComHits.some((h) => h.category === 'image metadata')) {
      selfTestFail('content-check self-test failed: JPEG COM not detected')
    }
    if (!jpegApp13Hits.some((h) => h.category === 'image metadata')) {
      selfTestFail('content-check self-test failed: JPEG APP13 not detected')
    }

    // L5: truncated / overrun PNG → unparseable
    const truncPngPath = join(tmpRoot, 'trunc.png')
    const overrunPngPath = join(tmpRoot, 'overrun.png')
    await writeFile(truncPngPath, buildPng({ truncate: true }))
    await writeFile(overrunPngPath, buildPng({ overrun: true }))
    const truncPngHits = await scanTarget(
      { full: truncPngPath, rel: 'tmp/trunc.png', kind: 'file' },
      saltHex,
      hashes,
    )
    const overrunPngHits = await scanTarget(
      { full: overrunPngPath, rel: 'tmp/overrun.png', kind: 'file' },
      saltHex,
      hashes,
    )
    if (!truncPngHits.some((h) => h.category === 'image metadata: unparseable png')) {
      selfTestFail('content-check self-test failed: truncated PNG not unparseable')
    }
    if (!overrunPngHits.some((h) => h.category === 'image metadata: unparseable png')) {
      selfTestFail('content-check self-test failed: overrun PNG chunk not unparseable')
    }

    // L6: private term spanning one line break
    const crossLineBuf = Buffer.from('prefix zz-test\nterm suffix\n', 'utf8')
    const crossLineHits = await scanTextBuffer('tmp/cross-line.md', crossLineBuf, saltHex, hashes)
    if (!crossLineHits.some((h) => h.category === 'private term')) {
      selfTestFail('content-check self-test failed: cross-line private term not detected')
    }

    const allHits = [
      ...textHits,
      ...imageHits,
      ...symlinkHits,
      ...unknownHits,
      ...utf8Hits,
      ...commentGifHits,
      ...xmpGifHits,
      ...truncGifHits,
      ...entityHits,
      ...namedEntityHits,
      ...fakePngHits,
      ...trailerJunkHits,
      ...oddAppHits,
      ...jpegComHits,
      ...jpegApp13Hits,
      ...truncPngHits,
      ...overrunPngHits,
      ...crossLineHits,
    ]
    const categories = new Set(allHits.map((h) => h.category))
    const missing = required.filter((c) => !categories.has(c))
    if (missing.length > 0) {
      selfTestFail(
        `content-check self-test failed: missing ${missing.join(', ')}; got ${[...categories].sort().join(', ') || '(none)'}`,
      )
    }

    const cleanBuf = await readFile(cleanPath)
    const cleanHits = await scanTextBuffer(
      'scripts/content-check/fixtures/clean.md',
      cleanBuf,
      saltHex,
      hashes,
    )
    if (cleanHits.length !== 0) {
      selfTestFail(
        `content-check self-test failed: clean fixture had ${cleanHits.length} finding(s)`,
      )
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
        selfTestFail('content-check self-test failed: expected fail-closed for bad secret')
      }
    }

    // Reject oversized terms at hash time without echoing them
    const longTerm = spawnSync(
      process.execPath,
      [join(SCRIPT_DIR, 'content-check/hash-terms.mjs'), '--salt', saltHex],
      {
        input: 'one two three four five\n',
        encoding: 'utf8',
      },
    )
    if (longTerm.status === 0 || /one two three four five/i.test(longTerm.stderr + longTerm.stdout)) {
      selfTestFail('content-check self-test failed: expected rejection of >4-word terms')
    }

    console.log(
      `content-check self-test passed: detected ${[...categories].sort().join(', ')}; clean fixture clean; ASCII hashes unchanged`,
    )
  } catch (err) {
    if (process.exitCode == null || process.exitCode === 0) {
      process.exitCode = 1
      if (err && err.message && !String(err.message).startsWith('content-check self-test failed')) {
        console.error(err.message)
      }
    }
  } finally {
    if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true })
  }
}

const mode = process.argv[2]
if (mode === '--self-test') {
  await runSelfTest()
  if (process.exitCode && process.exitCode !== 0) process.exit(process.exitCode)
} else if (mode === undefined) {
  await runScan()
} else {
  console.error('usage: node scripts/content-check.mjs [--self-test]')
  process.exit(2)
}
