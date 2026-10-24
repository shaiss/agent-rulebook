/**
 * Shared normalization for hashed private terms and regex prep.
 * Used by content-check.mjs and hash-terms.mjs.
 */

export const MAX_TERM_WORDS = 4
export const MIN_SALT_HEX_LENGTH = 32
const MAX_ENTITY_PASSES = 32

const ZERO_WIDTH = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g
const COMBINING_MARKS = /\p{M}/gu

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** Decode HTML entities until stable, bounded to avoid pathological input. */
export function decodeHtmlEntities(input) {
  let s = input
  for (let pass = 0; pass < MAX_ENTITY_PASSES; pass++) {
    const next = s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, ent) => {
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
