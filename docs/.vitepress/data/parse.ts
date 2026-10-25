// Parses docs/rules/avatars.md into structured data for the theme.
// avatars.md stays the single source of truth: it is synced as-is from the
// rulebook draft, so everything here reads its prose and tables without
// requiring any markup changes, and tolerates sections being added or
// reworded. Pure functions only, so both the data loader (Node) and the
// markdown renderer can use them.

export type Gender = 'fem' | 'nb' | 'masc'
export type AgeBand = '20s' | '30s' | '40s' | '50s' | '60s+'

export const AGE_BANDS: AgeBand[] = ['20s', '30s', '40s', '50s', '60s+']
export const GENDERS: { key: Gender; label: string }[] = [
  { key: 'fem', label: 'Feminine' },
  { key: 'nb', label: 'Nonbinary' },
  { key: 'masc', label: 'Masculine' }
]

export interface Quote {
  /** e.g. "Shai, 9:21 PM ET 2026-10-23" */
  attribution: string
  text: string
}

export interface Rule {
  n: number
  /** Short lead (the rule's first sentence or clause), or null when neither is short */
  lead: string | null
  /** Everything after the lead, with quotes and status notes taken out */
  body: string
  status: 'draft' | 'locked' | null
  /** "(draft, concept)" and similar, or the lock note */
  statusNote: string | null
  quotes: Quote[]
  /** Parenthetical notes such as "Refined 2026-10-24: ..." */
  notes: string[]
}

export interface Portrait {
  slug: string
  small: string
  medium: string
  large: string
}

export interface Agent {
  name: string
  slug: string
  /** "Race/ethnicity (as depicted)" column */
  depicted: string
  /** "Specific heritage" column when the ledger has one */
  heritage: string | null
  genderLabel: string
  gender: Gender | null
  ageLabel: string
  age: AgeBand | null
  hair: string
  setting: string
  set: string
  portrait: Portrait | null
  /** ok: portrait matches this row; mismatch: the portrait shows a newer face than the row describes */
  portraitStatus: 'ok' | 'mismatch' | 'missing'
}

export interface ManifestEntry {
  slug: string
  name: string
  gender: Gender
  age: AgeBand
}

export interface Rulebook {
  title: string
  draft: boolean
  intro: string
  principle: { text: string; attribution: string | null } | null
  rules: Rule[]
  rollout: { quote: Quote | null; steps: string[] }
  columns: string[]
  agents: Agent[]
  /** Paragraphs in the Ledger section outside the table (e.g. documented rule-2 exceptions) */
  ledgerNotes: string[]
  hasHeritageColumn: boolean
  sections: { title: string; slug: string }[]
  /** Dates mentioned in the rules text, for "Set / Refined" tags */
  setDate: string | null
  /** Latest date in the Rules section: when the rules themselves last changed */
  refinedDate: string | null
  /** Latest date anywhere in the file, ledger included */
  updatedDate: string | null
}

const stripInline = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\W)[*_](.+?)[*_](?=\W|$)/g, '$1$2').replace(/`([^`]+)`/g, '$1').trim()

export function slugify(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** VitePress-compatible heading anchor (lowercase, punctuation dropped, spaces to hyphens) */
export function headingSlug(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

export function genderKey(label: string): Gender | null {
  const t = label.toLowerCase()
  if (/nonbinary|androgynous/.test(t)) return 'nb'
  if (/^(fem|woman)/.test(t)) return 'fem'
  if (/^(masc|man)/.test(t)) return 'masc'
  return null
}

export function ageKey(label: string): AgeBand | null {
  const band = label.trim().split(/\s/)[0]
  return (AGE_BANDS as string[]).includes(band) ? (band as AgeBand) : null
}

/** Split markdown into its h2 sections, keyed by heading text */
export function sections(md: string): { title: string; body: string }[] {
  const out: { title: string; body: string }[] = []
  let cur: { title: string; lines: string[] } | null = null
  for (const line of md.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*#*\s*$/.exec(line)
    if (h && !line.startsWith('###')) {
      if (cur) out.push({ title: cur.title, body: cur.lines.join('\n') })
      cur = { title: h[1], lines: [] }
    } else if (cur) cur.lines.push(line)
  }
  if (cur) out.push({ title: cur.title, body: cur.lines.join('\n') })
  return out
}

const QUOTE_RE = /\(((?:Shai)[^()"“]*?):\s*["“]([^"”]+)["”]\)/g
const NOTE_RE = /\((Refined [^()]*)\)/g
const DRAFT_RE = /^\((draft[^)]*)\)\s*/i
const LOCK_RE = /\s*(Locked by [^.(]*?)(?:\s*\(\s*["“]([^"”]+)["”]\s*\))?\.?\s*$/

/** Pull quotes, status and notes out of one rule's text */
export function parseRuleText(n: number, raw: string): Rule {
  let text = stripInline(raw)
  let status: Rule['status'] = null
  let statusNote: string | null = null

  const draft = DRAFT_RE.exec(text)
  if (draft) {
    status = 'draft'
    statusNote = draft[1].replace(/^draft,?\s*/i, '') || null
    text = text.slice(draft[0].length)
  }
  const lock = LOCK_RE.exec(text)
  if (lock) {
    status = 'locked'
    statusNote = lock[1] + (lock[2] ? ` (“${lock[2]}”)` : '')
    text = text.slice(0, lock.index)
  }

  const quotes: Quote[] = []
  text = text.replace(QUOTE_RE, (_, attribution: string, q: string) => {
    quotes.push({ attribution: attribution.trim(), text: q.trim() })
    return ''
  })
  const notes: string[] = []
  text = text.replace(NOTE_RE, (_, note: string) => {
    notes.push(note.trim())
    return ''
  })
  text = text.replace(/\s+([.,;:])/g, '$1').replace(/\s{2,}/g, ' ').trim()

  // Lead: the first sentence (or the part before a colon); when that runs
  // long, the first clause. The rest becomes the body.
  let lead: string | null = null
  let body = text
  const end = /[.:](\s|$)/.exec(text)
  const comma = text.indexOf(', ')
  if (end && end.index <= 80) {
    lead = text.slice(0, end.index)
    body = text.slice(end.index + 1).trim()
  } else if (comma > 0 && comma <= 70) {
    lead = text.slice(0, comma)
    body = text.slice(comma + 1).trim()
  }
  body = body.charAt(0).toUpperCase() + body.slice(1)
  return { n, lead, body, status, statusNote, quotes, notes }
}

function parseTable(body: string): { columns: string[]; rows: string[][] } | null {
  const lines = body.split(/\r?\n/).filter((l) => l.trim().startsWith('|'))
  if (lines.length < 2) return null
  const cells = (l: string) =>
    l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => stripInline(c.replace(/\\\|/g, '|')))
  const columns = cells(lines[0])
  const rows = lines.slice(2).map(cells).filter((r) => r.some(Boolean))
  return { columns, rows }
}

const DATE_RE = /\b(20\d\d-\d\d-\d\d)\b/g

export function parseRulebook(md: string, manifest: ManifestEntry[], avatarBase = '/avatars/'): Rulebook {
  const h1 = /^#\s+(.+)$/m.exec(md)?.[1] ?? 'Agent avatar rules'
  const draft = /\(draft\)/i.test(h1)
  const title = h1.replace(/\s*\(draft\)\s*/i, '').trim()

  const afterH1 = md.slice(md.indexOf(h1) + h1.length).split(/\n##\s/)[0]
  const intro = stripInline(afterH1.trim().split(/\n\s*\n/)[0] ?? '')

  const secs = sections(md)
  const find = (re: RegExp) => secs.find((s) => re.test(s.title))

  const rulesSec = find(/^Rules\b/i)
  const rules = (rulesSec?.body ?? '')
    .split(/\r?\n/)
    .map((l) => /^(\d+)\.\s+(.+)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => parseRuleText(Number(m[1]), m[2]))

  const principleSec = find(/^Principle/i)
  let principle: Rulebook['principle'] = null
  if (principleSec) {
    const p = stripInline(principleSec.body.trim().split(/\n\s*\n/)[0] ?? '')
    const m = /^(.*?)\s*\(([^()]+)\)\.?$/.exec(p)
    principle = m ? { text: m[1].replace(/[.]$/, '') + '.', attribution: m[2] } : { text: p, attribution: null }
  }

  const rolloutSec = find(/^Rollout/i)
  let rollout: Rulebook['rollout'] = { quote: null, steps: [] }
  if (rolloutSec) {
    const q = /^(Shai[^"“\n]*?):\s*["“]([^"”]+)["”]/m.exec(rolloutSec.body)
    rollout = {
      quote: q ? { attribution: q[1].trim(), text: q[2].trim() } : null,
      steps: rolloutSec.body
        .split(/\r?\n/)
        .map((l) => /^\d+\.\s+(.+)$/.exec(l.trim())?.[1])
        .filter((s): s is string => !!s)
        .map(stripInline)
    }
  }

  const ledgerSec = find(/^Ledger/i)
  const table = ledgerSec ? parseTable(ledgerSec.body) : null
  const columns = table?.columns ?? []
  const col = (re: RegExp) => columns.findIndex((c) => re.test(c))
  const idx = {
    name: col(/^Agent$/i),
    depicted: col(/^Race|ethnicity/i),
    heritage: col(/^Specific heritage/i),
    gender: col(/^Gender/i),
    age: col(/^Age(\s|$)/i),
    hair: col(/^Hair/i),
    setting: col(/^Setting|clothing/i),
    set: col(/^Set$/i)
  }
  const at = (row: string[], i: number) => (i >= 0 ? row[i] ?? '' : '')
  const byName = new Map(manifest.map((m) => [m.name.toLowerCase(), m]))

  const agents: Agent[] = (table?.rows ?? []).map((row) => {
    const name = at(row, idx.name)
    const genderLabel = at(row, idx.gender)
    const ageLabel = at(row, idx.age)
    const gender = genderKey(genderLabel)
    const age = ageKey(ageLabel)
    const m = byName.get(name.toLowerCase())
    const matches = !!m && m.gender === gender && m.age === age
    return {
      name,
      slug: m?.slug ?? slugify(name),
      depicted: at(row, idx.depicted),
      heritage: idx.heritage >= 0 ? at(row, idx.heritage) : null,
      genderLabel,
      gender,
      ageLabel,
      age,
      hair: at(row, idx.hair),
      setting: at(row, idx.setting),
      set: at(row, idx.set),
      portrait: matches
        ? {
            slug: m!.slug,
            small: `${avatarBase}${m!.slug}-240.jpg`,
            medium: `${avatarBase}${m!.slug}-480.jpg`,
            large: `${avatarBase}${m!.slug}-720.jpg`
          }
        : null,
      portraitStatus: !m ? 'missing' : matches ? 'ok' : 'mismatch'
    }
  })

  const ledgerNotes = (ledgerSec?.body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('|') && !p.startsWith('#'))
    .map(stripInline)

  const rulesDates = [...(rulesSec?.body ?? '').matchAll(DATE_RE)].map((d) => d[1]).sort()
  const allDates = [...md.matchAll(DATE_RE)].map((d) => d[1]).sort()

  return {
    title,
    draft,
    intro,
    principle,
    rules,
    rollout,
    columns,
    agents,
    ledgerNotes,
    hasHeritageColumn: idx.heritage >= 0,
    sections: secs.map((s) => ({ title: s.title, slug: headingSlug(s.title) })),
    setDate: rulesDates[0] ?? null,
    refinedDate: rulesDates[rulesDates.length - 1] ?? null,
    updatedDate: allDates[allDates.length - 1] ?? null
  }
}

/** Gender × age grid over the agents, with open cells */
export function balance(agents: Agent[]) {
  const matrix = GENDERS.map((g) => ({
    key: g.key,
    label: g.label,
    cells: AGE_BANDS.map((age) => ({
      age,
      agents: agents.filter((a) => a.gender === g.key && a.age === age)
    }))
  }))
  const open = matrix.flatMap((r) => r.cells.filter((c) => c.agents.length === 0).map((c) => `${r.label} · ${c.age}`))
  // Rows whose gender or age label isn't recognised can't be placed in the grid
  const ungrouped = agents.filter((a) => !a.gender || !a.age)
  const genderTally = GENDERS.map((g) => ({ ...g, n: agents.filter((a) => a.gender === g.key).length }))
  const ageTally = AGE_BANDS.map((age) => ({ key: age, label: age, n: agents.filter((a) => a.age === age).length }))
  return { matrix, open, ungrouped, genderTally, ageTally }
}
