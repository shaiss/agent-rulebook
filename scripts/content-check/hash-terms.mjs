#!/usr/bin/env node
/**
 * Build a CONTENT_CHECK_EXTRA_TERMS secret value from plaintext terms on stdin.
 * Prints only the secret material to stdout. Never logs the terms.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'
import {
  isValidSaltHex,
  MAX_TERM_WORDS,
  MIN_SALT_HEX_LENGTH,
  normalizeTerm,
  wordCount,
} from './normalize.mjs'

export { normalizeTerm } from './normalize.mjs'

export function hashNormalized(saltHex, normalized) {
  return createHash('sha256').update(saltHex + normalized, 'utf8').digest('hex')
}

function parseArgs(argv) {
  let saltHex = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--salt') {
      saltHex = argv[++i]
      if (!isValidSaltHex(saltHex)) {
        console.error(
          `hash-terms: --salt requires even-length hex with at least ${MIN_SALT_HEX_LENGTH} characters`,
        )
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
    const words = wordCount(normalized)
    if (words > MAX_TERM_WORDS) {
      console.error(
        `hash-terms: term has ${words} normalized words; maximum is ${MAX_TERM_WORDS}`,
      )
      process.exit(1)
    }
    terms.push(normalized)
  }
  return terms
}

async function main() {
  const { saltHex: argSalt } = parseArgs(process.argv.slice(2))
  const saltHex = argSalt ?? randomBytes(MIN_SALT_HEX_LENGTH / 2).toString('hex')
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
