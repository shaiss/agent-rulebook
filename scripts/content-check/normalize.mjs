/**
 * Shared normalization for hashed private terms and regex prep.
 */

export const MAX_TERM_WORDS = 4
export const MIN_SALT_HEX_LENGTH = 32

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

export function decodeHtmlEntities(input) {
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

/** Fold diacritics / zero-width / entities, then lowercase word-split. */
export function normalizeTerm(input) {
  let t = input.normalize('NFKD').replace(COMBINING_MARKS, '')
  t = t.replace(ZERO_WIDTH, '')
  t = decodeHtmlEntities(t)
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

/** Normalization before regex matching (keeps punctuation for phones/emails). */
export function normalizeForRegex(input) {
  let t = input.normalize('NFKD').replace(COMBINING_MARKS, '')
  t = t.replace(ZERO_WIDTH, '')
  t = decodeHtmlEntities(t)
  t = t.replace(ZERO_WIDTH, '')
  return t
}
