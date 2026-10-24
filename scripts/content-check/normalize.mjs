/**
 * Shared normalization for hashed private terms and regex prep.
 * Used by content-check.mjs and hash-terms.mjs.
 */
import { decodeHTML } from 'entities'

export const MAX_TERM_WORDS = 4
export const MIN_SALT_HEX_LENGTH = 32
const MAX_ENTITY_PASSES = 32

// Includes U+2061–2064 and U+180E per hardening
const ZERO_WIDTH = /[\u200B-\u200F\u2060-\u2064\uFEFF\u00AD\u180E]/g
const COMBINING_MARKS = /\p{M}/gu

/** Decode HTML5 named + numeric entities until stable, bounded. */
export function decodeHtmlEntities(input) {
  let s = input
  for (let pass = 0; pass < MAX_ENTITY_PASSES; pass++) {
    const next = decodeHTML(s)
    if (next === s) return s
    s = next
  }
  return s
}

/**
 * Shared pipeline:
 * decode entities (bounded) -> NFKC -> NFKD -> strip combining marks ->
 * strip zero-width/format -> lowercase -> tokenize
 */
export function normalizeTerm(input) {
  let t = decodeHtmlEntities(input)
  t = t.normalize('NFKC')
  t = t.normalize('NFKD').replace(COMBINING_MARKS, '')
  t = t.replace(ZERO_WIDTH, '')
  t = t.toLowerCase()
  return t.split(/[^a-z0-9]+/).filter(Boolean).join(' ')
}

export function wordCount(normalized) {
  if (!normalized) return 0
  return normalized.split(' ').filter(Boolean).length
}

export function isValidSaltHex(saltHex) {
  return (
    typeof saltHex === 'string' &&
    /^[0-9a-fA-F]+$/.test(saltHex) &&
    saltHex.length >= MIN_SALT_HEX_LENGTH &&
    saltHex.length % 2 === 0
  )
}

/**
 * Same decode/fold/strip pipeline as normalizeTerm, without lowercasing/tokenize
 * (punctuation kept for phones/emails; regexes are case-insensitive).
 */
export function normalizeForRegex(input) {
  let t = decodeHtmlEntities(input)
  t = t.normalize('NFKC')
  t = t.normalize('NFKD').replace(COMBINING_MARKS, '')
  t = t.replace(ZERO_WIDTH, '')
  return t
}
