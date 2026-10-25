import type MarkdownIt from 'markdown-it'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import { headingSlug, parseRuleText, parseRulebook, type Rule } from '../../data/parse'

// Gives docs/rules/avatars.md its rule-page structure (Claude Design mockup 2a)
// by rearranging the token stream; the markdown itself never changes. Each h2
// section is wrapped in <section class="ir-sec ir-sec--<slug> ir-kind--<kind>">
// and the sections we recognise get their 2a layout. Anything unrecognised
// renders exactly as plain markdown would. Text re-emitted as HTML is escaped,
// and if anything throws the page falls back to the untouched tokens.

const PAGE = 'rules/avatars.md'

type Kind = 'rules' | 'principle' | 'rollout' | 'ledger' | 'notes' | 'prior-art'

/** Same section matchers as parse.ts */
const KINDS: [RegExp, Kind][] = [
  [/^Rules\b/i, 'rules'],
  [/^Principle/i, 'principle'],
  [/^Rollout/i, 'rollout'],
  [/^Ledger/i, 'ledger'],
  [/^Notes\b/i, 'notes'],
  [/^Prior art/i, 'prior-art']
]

/** "Test note: …", "Our gap: …": a short capitalised label and a colon */
const LABEL_RE = /^([A-Z][A-Za-z]*(?: [A-Za-z]+){0,2}):\s+/
/** Labels inside one paragraph, at its start or after a sentence ("Borrow: … Reuse: …") */
const LABELS_RE = /(?:^|(?<=[.;!?])\s+)([A-Z][A-Za-z]*(?: [a-z]+){0,2}):\s+/g
/** Lead clause of a list item, e.g. "First self-IDs (2026-10-24): …" */
const LEAD_RE = /^([^:.\n]{3,60}):\s+/
const DATE_LEAD_RE = /^(\d{4}-\d\d-\d\d):\s+/
/** Inline syntax that parseRuleText() would flatten into plain text */
const RICH_RE = /\]\(|!\[|<[a-z/!]/i
const CORNERS = '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'

export default function rulebookMarkdown(md: MarkdownIt) {
  md.core.ruler.push('ir_rulepage', (state) => {
    if (state.inlineMode || state.env?.relativePath !== PAGE) return
    try {
      state.tokens = transform(md, state)
    } catch (err) {
      console.warn(`[rulepage] ${PAGE}: falling back to plain markdown.`, err)
    }
  })
}

function transform(md: MarkdownIt, state: StateCore): Token[] {
  const esc = md.utils.escapeHtml
  const env = state.env
  const book = parseRulebook(state.src, [])
  // Work on copies so a throw leaves state.tokens as markdown-it made them
  const tokens = state.tokens.map(clone)

  const make = (type: string, tag: string, nesting: -1 | 0 | 1, content = '') => {
    const t = new state.Token(type, tag, nesting)
    t.content = content
    return t
  }
  const html = (content: string) => Object.assign(make('html_block', '', 0, content + '\n'), { block: true })
  const text = (content: string) => make('text', '', 0, content)
  /** Inline markdown, rendered as the rest of the page is */
  const inline = (src: string) => md.renderer.renderInline(md.parseInline(src, env)[0].children ?? [], md.options, env)
  /** A link through VitePress's own link renderer, so base and clean URLs apply */
  const link = (href: string, label: string, cls: string) => {
    const open = make('link_open', 'a', 1)
    open.attrs = [['href', href], ['class', cls]]
    return md.renderer.renderInline([open, text(label), make('link_close', 'a', -1)], md.options, env)
  }
  const tag = (variant: string, label: string) => `<span class="ir-tag ir-tag-${variant}">${esc(label)}</span>`
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  // ── Split into the page header (before the first h2) and the h2 sections ──
  const intro: Token[] = []
  const secs: { slug: string; kind: Kind | null; body: Token[] }[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'heading_open' && t.tag === 'h2' && t.level === 0) {
      const title = tokens[i + 1]?.content ?? ''
      secs.push({ slug: headingSlug(title), kind: KINDS.find(([re]) => re.test(title))?.[1] ?? null, body: [] })
    }
    ;(secs.length ? secs[secs.length - 1].body : intro).push(t)
  }

  // 2a sets the principle right under the page header, ahead of the rules
  const pi = secs.findIndex((s) => s.kind === 'principle')
  if (pi > 0) secs.unshift(...secs.splice(pi, 1))

  const out: Token[] = []
  // The breadcrumb (RuleCrumbs.vue) is named from the sidebar config, so it is a component
  if (intro.length) out.push(html('<header class="ir-sec ir-sec--intro"><RuleCrumbs />'), ...header(intro), html('</header>'))
  for (const s of secs) {
    const framed = s.kind === 'principle'
    const cls = `ir-sec ir-sec--${esc(s.slug)}${s.kind ? ` ir-kind--${s.kind}` : ''}${framed ? ' blueprint' : ''}`
    out.push(html(`<section class="${cls}">${framed ? CORNERS : ''}`), ...section(s.kind, s.body), html('</section>'))
  }
  // 2a's page foot: the edit link and "Last updated" side by side (RuleFooter.vue)
  out.push(html('<RuleFooter />'))
  return out

  // ── Page header: h1 without "(draft)", then status tags, then the intro as lede ──
  function header(ts: Token[]): Token[] {
    const res: Token[] = []
    let lede = false
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i]
      if (t.type === 'heading_open' && t.tag === 'h1') {
        const end = closeOf(ts, i)
        const first = ts[i + 1].children?.[0]
        if (book.draft && first?.type === 'text') first.content = first.content.replace(/\s*\(draft\)\s*$/i, '')
        const tags = [
          book.draft ? tag('outline', 'Draft') : '',
          book.setDate ? dateTag('Set', book.setDate) : '',
          book.updatedDate && book.updatedDate !== book.setDate ? dateTag('Refined', book.updatedDate) : ''
        ].join('')
        res.push(...ts.slice(i, end + 1))
        if (tags) res.push(html(`<div class="ir-doc-tags">${tags}</div>`))
        i = end
        continue
      }
      if (!lede && t.type === 'paragraph_open' && t.level === 0) {
        t.attrJoin('class', 'ir-lede')
        lede = true
      }
      res.push(t)
    }
    return res
  }

  function dateTag(label: string, date: string) {
    return `<span class="ir-tag ir-tag-neutral">${label} <time datetime="${esc(date)}">${esc(date)}</time></span>`
  }

  function section(kind: Kind | null, ts: Token[]): Token[] {
    markTables(ts)
    markDateLists(ts)
    if (kind === 'rules') return rules(ts)
    if (kind === 'principle') return labelled(principle(ts))
    if (kind === 'rollout') return rollout(ts)
    if (kind === 'ledger') return ledger(ts)
    if (kind === 'notes') return labelled(notes(ts))
    if (kind === 'prior-art') return priorArt(ts)
    return ts
  }

  /** h2 with something on its right (a count, a button) */
  function withHead(ts: Token[], aside: string): Token[] {
    const end = closeOf(ts, 0)
    return [html('<div class="ir-sec-head">'), ...ts.slice(0, end + 1), html(`${aside}</div>`), ...ts.slice(end + 1)]
  }

  /** h2 as the label column, the rest of the section beside it */
  function labelled(ts: Token[]): Token[] {
    const end = closeOf(ts, 0)
    return [...ts.slice(0, end + 1), html('<div class="ir-sec-body">'), ...ts.slice(end + 1), html('</div>')]
  }

  // ── Rules: the ordered list becomes the grid of numbered cells ──
  function rules(ts: Token[]): Token[] {
    const li = topIndex(ts, 'ordered_list_open')
    if (li < 0) return labelBands(ts, 'accent')
    const items = listItems(ts, li)
    const start = Number(ts[li].attrGet('start') ?? 1)
    const status = { draft: 0, locked: 0 }
    const grid: Token[] = [html('<ol class="ir-cells" role="list">')]
    for (const [k, [a, b]] of items.entries()) {
      const n = Number(ts[a].info) || start + k
      const inner = ts.slice(a + 1, b)
      const only = inner.length === 3 && inner[0].type === 'paragraph_open' ? inner[1] : null
      if (only && !RICH_RE.test(only.content)) {
        const r = parseRuleText(n, only.content)
        if (r.status) status[r.status]++
        grid.push(html(ruleCell(r)))
      } else {
        // A shape we don't know (nested blocks, links, HTML): keep its markdown rendering
        inner.forEach((t) => t.type.startsWith('paragraph_') && (t.hidden = false))
        grid.push(html(ruleTop(n, '', null)), ...inner, html('</li>'))
      }
    }
    grid.push(html('</ol>'))
    const count = [
      plural(items.length, 'rule'),
      status.draft ? plural(status.draft, 'draft') : '',
      status.locked ? `${status.locked} locked` : ''
    ]
      .filter(Boolean)
      .join(' · ')
    const end = closeOf(ts, li)
    return [...withHead(ts.slice(0, li), `<span class="ir-count">${count}</span>`), ...grid, ...labelBands(ts.slice(end + 1), 'accent')]
  }

  /**
   * A cell opens with its h3, so heading lists read "Rule 4: …" and the status
   * tags follow the heading; CSS draws the numeral row above it. The numeral
   * itself is for the eye only, since the h3 carries the number.
   */
  function ruleTop(n: number, tags: string, lead: string | null) {
    const title = lead
      ? `<h3 class="ir-cell-title"><span class="ir-sr">Rule ${n}: </span>${esc(lead)}</h3>`
      : `<h3 class="ir-cell-title ir-sr">Rule ${n}</h3>`
    return (
      `<li id="rule-${n}" class="ir-cell">${title}` +
      `<div class="ir-cell-top"><span class="ir-cell-n" aria-hidden="true">${String(n).padStart(2, '0')}</span>` +
      (tags ? `<span class="ir-cell-tags">${tags}</span>` : '') +
      '</div>'
    )
  }

  function ruleCell(r: Rule) {
    const tags = [
      r.status === 'draft' ? tag('outline', 'Draft') : '',
      r.status === 'draft' && r.statusNote ? tag('neutral', cap(r.statusNote)) : '',
      r.status === 'locked' ? tag('accent', 'Locked') : ''
    ].join('')
    let h = ruleTop(r.n, tags, r.lead)
    if (r.body) h += `<p class="ir-cell-body">${esc(r.body)}</p>`
    for (const note of r.notes) {
      const m = /^([^:]{3,40}):\s*(.*)$/.exec(note)
      h += `<p class="ir-cell-meta">${m ? `<strong>${esc(m[1])}:</strong> ${esc(m[2])}` : esc(note)}</p>`
    }
    if (r.status === 'locked' && r.statusNote) h += `<p class="ir-cell-meta">${esc(r.statusNote)}</p>`
    for (const q of r.quotes) {
      h +=
        '<figure class="ir-cell-quote">' +
        `<blockquote><p>“${esc(q.text)}”</p></blockquote>` +
        `<figcaption>${esc(q.attribution)}</figcaption></figure>`
    }
    return h + '</li>'
  }

  /** Top-level "Label: text" paragraphs become a label column + text band */
  function labelBands(ts: Token[], variant: 'accent' | 'steel'): Token[] {
    const res: Token[] = []
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i]
      const first = t.type === 'paragraph_open' && t.level === 0 ? ts[i + 1]?.children?.[0] : null
      const m = first?.type === 'text' ? LABEL_RE.exec(first.content) : null
      if (!first || !m) {
        res.push(t)
        continue
      }
      const end = closeOf(ts, i)
      // "Test note: the image generator…" → label + "The image generator…"
      first.content = cap(first.content.slice(m[0].length))
      res.push(
        html(`<div class="ir-band ir-band--${variant}"><span class="ir-label">${esc(m[1])}</span>`),
        ...ts.slice(i, end + 1),
        html('</div>')
      )
      i = end
    }
    return res
  }

  // ── Principle: the statement in big condensed type, attribution as meta ──
  function principle(ts: Token[]): Token[] {
    const hend = closeOf(ts, 0)
    const p = ts[hend + 1]
    const pr = book.principle
    if (p?.type !== 'paragraph_open' || !pr) return ts
    const src = ts[hend + 2].content
    if (pr.attribution && src.includes(pr.attribution) && !RICH_RE.test(src)) {
      const statement =
        `<p class="ir-principle-text">${esc(pr.text)}</p>` + `<p class="ir-meta">${esc(pr.attribution)}</p>`
      return [...ts.slice(0, hend + 1), html(statement), ...ts.slice(closeOf(ts, hend + 1) + 1)]
    }
    p.attrJoin('class', 'ir-principle-text')
    return ts
  }

  // ── Rollout: Shai's ask as a pull quote, the steps as blueprint cards ──
  function rollout(ts: Token[]): Token[] {
    const res: Token[] = []
    const q = book.rollout.quote
    let quoted = false
    let stepped = false
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i]
      if (!quoted && q && t.type === 'paragraph_open' && t.level === 0) {
        const c = ts[i + 1].content.trim()
        if (c.startsWith(q.attribution) && c.includes(q.text) && /["”]\.?$/.test(c) && !RICH_RE.test(c)) {
          res.push(
            html(
              '<figure class="ir-pull">' +
                `<blockquote><p>“${esc(q.text)}”</p></blockquote>` +
                `<figcaption class="ir-meta">${esc(q.attribution)}</figcaption></figure>`
            )
          )
          i = closeOf(ts, i)
          quoted = true
          continue
        }
      }
      if (!stepped && t.type === 'ordered_list_open' && t.level === 0) {
        const end = closeOf(ts, i)
        const start = Number(t.attrGet('start') ?? 1)
        t.attrJoin('class', 'ir-stepcards')
        t.attrSet('role', 'list')
        let at = i
        for (const [k, [a, b]] of listItems(ts, i).entries()) {
          res.push(...ts.slice(at, a))
          ts[a].attrJoin('class', 'ir-stepcard blueprint')
          const n = Number(ts[a].info) || start + k
          res.push(ts[a], html(`${CORNERS}<span class="ir-stepcard-n"><span class="ir-sr">Step </span>${n}</span>`))
          for (const x of ts.slice(a + 1, b)) {
            if (x.type.startsWith('paragraph_')) x.hidden = false
            res.push(x)
          }
          at = b
        }
        res.push(...ts.slice(at, end + 1))
        i = end
        stepped = true
        continue
      }
      res.push(t)
    }
    return res
  }

  // ── Ledger: fleet line (narrow widths, where the aside's Fleet box is hidden),
  // portrait strip, then the canonical table behind a disclosure ──
  function ledger(ts: Token[]): Token[] {
    const hend = closeOf(ts, 0)
    const head = [
      ...withHead(ts.slice(0, hend + 1), link('/ledger', 'Full ledger', 'ir-btn ir-btn-secondary')),
      html('<FleetLine />')
    ]
    const body = ts.slice(hend + 1)
    const ti = topIndex(body, 'table_open')
    if (ti < 0) return [...head, html('<LedgerStrip />'), ...body]
    const tend = closeOf(body, ti)
    const rows = body.slice(ti, tend).filter((t) => t.type === 'tr_open').length - 1
    const after = body.slice(tend + 1)
    for (const t of after) if (t.type === 'paragraph_open' && t.level === 0) t.attrJoin('class', 'ir-note')
    return [
      ...head,
      ...body.slice(0, ti),
      html('<LedgerStrip />'),
      html(
        '<details class="ir-ledger-table">' +
          `<summary><span id="ir-ledger-table-title" class="ir-summary-title">Ledger table</span><span class="ir-count">${plural(rows, 'row')}</span></summary>` +
          // Wider than the column: a focusable scroll box, so keys can scroll it too
          '<div class="ir-table-scroll" role="region" aria-labelledby="ir-ledger-table-title" tabindex="0">'
      ),
      ...body.slice(ti, tend + 1),
      html('</div></details>'),
      ...after
    ]
  }

  // ── Notes: each list item's lead clause in bold ──
  function notes(ts: Token[]): Token[] {
    for (let i = 0; i < ts.length; i++) {
      const il = ts[i].type === 'list_item_open' ? ts[i + 2] : null
      const first = il?.type === 'inline' ? il.children?.[0] : null
      const m = first?.type === 'text' ? LEAD_RE.exec(first.content) : null
      if (!il?.children || !first || !m) continue
      const lead = [make('strong_open', 'strong', 1), text(`${m[1]}:`), make('strong_close', 'strong', -1)]
      il.children.splice(0, 1, ...lead, text(' ' + first.content.slice(m[0].length)))
    }
    return ts
  }

  // ── Prior art: "Borrow: … Reuse: … Cite only: …" as columns, then "Our gap:" as the steel band ──
  function priorArt(ts: Token[]): Token[] {
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i]
      const src = t.type === 'paragraph_open' && t.level === 0 ? ts[i + 1].content : ''
      const cols = src && !RICH_RE.test(src) ? labelColumns(src) : null
      if (!cols) continue
      const body = cols
        .map(({ label, src }) => `<div class="ir-col"><span class="ir-label">${esc(label)}</span>${listOrSentence(src)}</div>`)
        .join('')
      const end = closeOf(ts, i)
      return [...ts.slice(0, i), html(`<div class="ir-cols" style="--ir-cols:${cols.length}">${body}</div>`), ...labelBands(ts.slice(end + 1), 'steel')]
    }
    return ts
  }

  /** Split "A: … B: … C: …" when the paragraph opens with a label and holds 2+ */
  function labelColumns(src: string) {
    const marks = [...src.matchAll(LABELS_RE)]
    if (marks.length < 2 || marks[0].index !== 0) return null
    return marks.map((m, k) => ({
      label: m[1],
      src: src.slice(m.index! + m[0].length, marks[k + 1]?.index).trim()
    }))
  }

  /** "x (why), y (why), z (why)." reads as a list; anything else stays a sentence */
  function listOrSentence(src: string) {
    const parts = splitTopLevel(src.replace(/\.$/, ''), ',').map((s) => s.trim())
    if (parts.length >= 3 && parts.every((s) => s.endsWith(')'))) {
      return `<ul>${parts.map((s) => `<li>${inline(s)}</li>`).join('')}</ul>`
    }
    return `<p>${inline(src)}</p>`
  }

  /**
   * Table columns by content, so no column gets squeezed to a word per line:
   * .ir-num (numbers: right-aligned, tabular), .ir-tight (every value short:
   * no wrap), then prose columns get a minimum width by how long their values
   * run, on average and at their longest: .ir-short (8rem), .ir-mid (10rem),
   * .ir-wide (15rem), .ir-xwide (22rem). A table wider than the column
   * scrolls sideways inside its own box. A cell that opens with an ISO date
   * keeps the date on one line.
   */
  function markTables(ts: Token[]) {
    for (let i = 0; i < ts.length; i++) {
      if (ts[i].type !== 'table_open') continue
      const end = closeOf(ts, i)
      const rows: { open: Token; inline: Token; text: string }[][] = []
      for (let j = i; j < end; j++) {
        if (ts[j].type === 'tr_open') rows.push([])
        if (ts[j].type === 'th_open' || ts[j].type === 'td_open')
          rows[rows.length - 1].push({ open: ts[j], inline: ts[j + 1], text: ts[j + 1].content.trim() })
      }
      for (let c = 0; c < (rows[0]?.length ?? 0); c++) {
        const body = rows.slice(1).map((r) => r[c]?.text ?? '')
        if (!body.length) continue
        const lengths = body.map((v) => v.length)
        const max = Math.max(...lengths)
        const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
        const cls = body.every((v) => /^\d+(?:\.\d+)?%?$/.test(v))
          ? 'ir-num'
          : max <= 24
            ? 'ir-tight'
            : avg > 60
              ? 'ir-xwide'
              : avg > 30
                ? 'ir-wide'
                : max > 40
                  ? 'ir-mid'
                  : 'ir-short'
        rows.forEach((r) => r[c]?.open.attrJoin('class', cls))
      }
      // "2026-10-23 (replaced …)": browsers break dates at their hyphens
      for (const r of rows.slice(1)) {
        for (const { inline } of r) {
          const first = inline.children?.[0]
          const m = first?.type === 'text' ? /^(\d{4}-\d\d-\d\d)\b/.exec(first.content) : null
          if (!m) continue
          const date = make('html_inline', '', 0, `<time class="ir-date" datetime="${m[1]}">${m[1]}</time>`)
          inline.children!.splice(0, 1, date, text(first!.content.slice(m[1].length)))
        }
      }
      i = end
    }
  }

  /** Bullet lists where every item opens with "YYYY-MM-DD:" read as a dated log */
  function markDateLists(ts: Token[]) {
    for (let i = 0; i < ts.length; i++) {
      if (ts[i].type !== 'bullet_list_open' || ts[i].level !== 0) continue
      const items = listItems(ts, i)
      const leads = items.map(([a]) => (ts[a + 2]?.type === 'inline' ? ts[a + 2].children?.[0] : null))
      if (items.length && leads.every((f) => f?.type === 'text' && DATE_LEAD_RE.test(f.content))) {
        ts[i].attrJoin('class', 'ir-log')
        items.forEach(([a], k) => {
          const f = leads[k]!
          const m = DATE_LEAD_RE.exec(f.content)!
          const date = make('html_inline', '', 0, `<time class="ir-log-date" datetime="${m[1]}">${m[1]}</time>`)
          ts[a + 2].children!.splice(0, 1, date, text(f.content.slice(m[0].length)))
        })
      }
      i = closeOf(ts, i)
    }
  }
}

// ── Token helpers ──

function clone(t: Token): Token {
  const c: Token = Object.assign(Object.create(Object.getPrototypeOf(t)), t)
  c.attrs = t.attrs ? t.attrs.map(([k, v]) => [k, v]) : null
  c.children = t.children ? t.children.map(clone) : null
  return c
}

/** Index of the token that closes the one opened at i */
function closeOf(ts: Token[], i: number) {
  if (ts[i].nesting !== 1) return i
  let depth = 0
  for (let j = i; j < ts.length; j++) {
    depth += ts[j].nesting
    if (depth === 0) return j
  }
  return ts.length - 1
}

function topIndex(ts: Token[], type: string) {
  return ts.findIndex((t) => t.type === type && t.level === 0)
}

/** [open, close] indexes of a list's own items */
function listItems(ts: Token[], open: number): [number, number][] {
  const out: [number, number][] = []
  const end = closeOf(ts, open)
  for (let i = open + 1; i < end; i++) {
    if (ts[i].type === 'list_item_open' && ts[i].level === ts[open].level + 1) {
      const c = closeOf(ts, i)
      out.push([i, c])
      i = c
    }
  }
  return out
}

/** Split on sep outside brackets and curly quotes */
function splitTopLevel(s: string, sep: string) {
  const out = ['']
  let depth = 0
  for (const ch of s) {
    if ('([“'.includes(ch)) depth++
    else if (')]”'.includes(ch)) depth = Math.max(0, depth - 1)
    if (ch === sep && depth === 0) out.push('')
    else out[out.length - 1] += ch
  }
  return out
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
