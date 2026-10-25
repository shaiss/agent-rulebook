// Text helpers for one ledger entry: the Ledger section's notes that name an
// agent (quoted as written, never paraphrased) and a heritage comparison that
// only flags what it can actually see.

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Whole-word, case-sensitive match for a name ("Nova" matches "Nova's", not "Novas") */
export const nameRe = (name: string) => new RegExp(`(?<![\\p{L}\\p{N}_])${esc(name)}(?![\\p{L}\\p{N}_])`, 'u')

/** Split a paragraph at . ! or ? followed by a capital, outside parentheses */
export function sentences(p: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && (c === '.' || c === '!' || c === '?') && /\s/.test(p[i + 1] ?? '')) {
      if (/^[\p{Lu}\d"“‘(]/u.test(p.slice(i + 1).trimStart())) {
        out.push(p.slice(start, i + 1).trim())
        start = i + 1
      }
    }
  }
  const tail = p.slice(start).trim()
  if (tail) out.push(tail)
  return out
}

export interface LedgerQuote {
  /** The sentences that name the agent, verbatim; "…" marks text left out */
  text: string
  /** The paragraph is about rule 2 (its documented exceptions) */
  rule2: boolean
}

/**
 * Sentences in the ledger notes that name `name`. When the paragraph opens
 * with a label such as "Earlier exceptions to rule 2's distinct-setting
 * clause:", a later sentence keeps that label in front of it for context.
 */
export function notesFor(name: string, notes: string[], allNames: string[]): LedgerQuote[] {
  const mine = nameRe(name)
  const anyName = allNames.map(nameRe)
  const out: LedgerQuote[] = []
  for (const p of notes) {
    const ss = sentences(p)
    const hits = ss.flatMap((s, i) => (mine.test(s) ? [i] : []))
    if (!hits.length) continue
    const pieces: string[] = []
    let last: number | null = null
    const lead = /^([^:]{3,90}):\s/.exec(ss[0])
    if (hits[0] > 0 && lead && !anyName.some((re) => re.test(lead[1]))) {
      pieces.push(`${lead[1]}:`)
      last = -0.5 // the rest of the first sentence is left out
    }
    for (const i of hits) {
      if (last !== null && i !== last + 1) pieces.push('…')
      pieces.push(ss[i])
      last = i
    }
    out.push({ text: pieces.join(' '), rule2: /\brule\s+0?2\b/i.test(p) })
  }
  return out
}

// Words that say how a heritage was recorded rather than what it is
const STOP = new Set(
  'and the not side visible country island unspecified agent choice overlay heritage noted counted separate face presenting depicted american led born with from half'.split(' ')
)
const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
  )
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** same: identical as written; overlap: shares a word worth a second look; null: nothing to flag */
export function heritageMatch(a: string, b: string): 'same' | 'overlap' | null {
  if (!a.trim() || !b.trim()) return null
  if (norm(a) === norm(b)) return 'same'
  const ta = tokens(a)
  for (const t of tokens(b)) if (ta.has(t)) return 'overlap'
  return null
}
