#!/usr/bin/env node
/**
 * Build a CONTENT_CHECK_EXTRA_TERMS secret value from plaintext terms on stdin.
 * Prints only the secret material to stdout. Never logs the terms.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'

const ZERO_WIDTH = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

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

export function normalizeTerm(input) {
  let t = input.normalize('NFKC')
  t = t.replace(ZERO_WIDTH, '')
  t = decodeHtmlEntities(t)
  t = t.toLowerCase()
  return t.split(/[^a-z0-9]+/).filter(Boolean).join(' ')
}

export function hashNormalized(saltHex, normalized) {
  return createHash('sha256').update(saltHex + normalized, 'utf8').digest('hex')
}

function parseArgs(argv) {
  let saltHex = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--salt') {
      saltHex = argv[++i]
      if (!saltHex || !/^[0-9a-fA-F]+$/.test(saltHex)) {
        console.error('hash-terms: --salt requires hex')
        process.exit(2)
      }
      saltHex = saltHex.toLowerCase()
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.error('usage: hash-terms.mjs [--salt <hex>] < terms.txt')
      process.exit(0)
    }
  }
  return { saltHex }
}

async function readTerms() {
  const terms = []
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const normalized = normalizeTerm(trimmed)
    if (!normalized) continue
    terms.push(normalized)
  }
  return terms
}

async function main() {
  const { saltHex: argSalt } = parseArgs(process.argv.slice(2))
  const saltHex = argSalt ?? randomBytes(16).toString('hex')
  const terms = await readTerms()
  if (terms.length === 0) {
    console.error('hash-terms: no terms on stdin')
    process.exit(1)
  }

  const out = [`salt:${saltHex}`]
  for (const normalized of terms) {
    out.push(hashNormalized(saltHex, normalized))
  }
  process.stdout.write(`${out.join('\n')}\n`)
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  await main()
}
