<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { readEntry, writeEntry } from '../entry-state'
import { ENTRY, followDocument, onRestore, type RulepageUi } from './restore'

// Every ledger agent's portrait above the ledger table, each linking to its
// /ledger entry by the agent's ledger slug (2a ledger strip).
//
// Up to a dozen: each in its own registration-corner frame (.ir-frame), in
// balanced rows. Tiles keep at least 72px, so a caption's age line ("60s+ ·
// pending") stays on one line, and the column gap (16px, as on the landing)
// keeps neighbouring frames' registration marks apart. The column count for
// each content width is worked out here, so no row is left with a stray tile
// or two.
//
// A bigger fleet becomes a contact sheet: one frame around a grid of small
// unframed portraits (a frame per 70px tile would be all registration marks),
// showing its first two rows until the reader asks for all of them. Every
// tile is in the HTML either way; the rows past the second are hidden by
// rulepage.css, which reads the sheet's column count at each width from
// here, and shown again without JavaScript, or in print.

const agents = data.agents
const n = agents.length
const dense = n > 12
const expanded = ref(false)
const list = ref<HTMLUListElement>()
const more = ref<HTMLButtonElement>()
const listId = 'ir-strip-list'
const ledger = withBase('/ledger')
const hasRule1 = data.rules.some((r) => r.n === 1)

/**
 * Columns for n tiles with at most `max` per row, spread over as few rows as
 * that allows, and as evenly as it allows (11 over 2 rows: 6 + 5, not 7 + 4).
 * rulepage.css picks one per content width: the most 72px tiles that fit.
 */
const balanced = (max: number) => Math.ceil(n / Math.ceil(n / max))
/** The strip's columns for content widths up to `upTo` (rulepage.css's container queries) */
const STRIP = [
  { upTo: 335, cols: balanced(3) },
  { upTo: 423, cols: balanced(4) },
  { upTo: 511, cols: balanced(5) },
  { upTo: 599, cols: balanced(6) },
  { upTo: Infinity, cols: balanced(7) }
]

/**
 * The contact sheet fills its rows: 8 columns in a wide content column, 6
 * from 600px of content down, 4 from 440px (tiles of 54 to 96px). Where that
 * would leave the last row less than half full, it takes one column fewer if
 * that doesn't (49 tiles: 7 rows of 7, not 6 rows of 8 and one tile on its
 * own).
 */
function sheetCols(max: number) {
  const short = (c: number) => n % c > 0 && n % c < c / 2
  return short(max) && !short(max - 1) ? max - 1 : max
}
const sheet = { wide: sheetCols(8), mid: sheetCols(6), narrow: sheetCols(4) }
/** Two rows across a wide content column hold the whole sheet: nothing to show more of there */
const fitsWide = n <= 2 * sheet.wide
/** The sheet's columns for content widths up to `upTo`, and its padding and frame */
const SHEET = [
  { upTo: 440, cols: sheet.narrow, inset: 2 + 24 },
  { upTo: 600, cols: sheet.mid, inset: 2 + 32 },
  { upTo: Infinity, cols: sheet.wide, inset: 2 + 32 }
]
const columns = dense
  ? { '--ir-sheet-wide': sheet.wide, '--ir-sheet-mid': sheet.mid, '--ir-sheet-narrow': sheet.narrow }
  : {
      '--ir-strip-c7': STRIP[4].cols,
      '--ir-strip-c6': STRIP[3].cols,
      '--ir-strip-c5': STRIP[2].cols,
      '--ir-strip-c4': STRIP[1].cols,
      '--ir-strip-c3': STRIP[0].cols
    }

// ── Image sizes ──
// The width each portrait is drawn at, as `sizes`, so a high-density screen
// gets a file big enough for its tile (a fixed 80px had 3x screens stretch
// the 240px file over tiles of up to 110px). A tile is the content column
// (container irdoc), less the sheet's padding and the gaps, over the
// columns. This is that column's width by window width on this page
// (VitePress's doc layout, with rulepage.css's 224px sidebar): the window
// less the gutters (and the sidebar), up to 688px.
const COLUMN: { upTo: number; less?: number; width?: number }[] = [
  { upTo: 735, less: 48 },
  { upTo: 959, width: 688 },
  { upTo: 1039, less: 352 },
  { upTo: Infinity, width: 688 }
]

/**
 * `sizes` for tiles laid out by `layouts` (columns by content width), with
 * `gap` between them, each drawn `frame` px narrower than its column (its
 * own border) and at most `cap` px wide
 */
function sizesFor(layouts: { upTo: number; cols: number; inset?: number }[], gap: number, frame = 0, cap = Infinity) {
  const out: [number, string][] = []
  const px = (v: number) => `${Math.round(v * 10) / 10}px`
  let lo = 0
  for (const seg of COLUMN) {
    let from = 0
    for (const l of layouts) {
      const lead = (l.inset ?? 0) + gap * (l.cols - 1)
      if (seg.width !== undefined) {
        if (seg.width >= from && seg.width <= l.upTo) out.push([seg.upTo, px(Math.min(cap, (seg.width - lead) / l.cols) - frame)])
      } else {
        // The window widths in this piece where the content column is in this layout's range
        const less = seg.less!
        const a = Math.max(lo, from + less)
        const b = Math.min(seg.upTo, l.upTo + less)
        // From this window width on, the tiles are at their cap
        const capped = cap * l.cols + lead + less
        const calc = `calc((100vw - ${less + lead + l.cols * frame}px) / ${l.cols})`
        if (a > b) {
          // not in this piece
        } else if (capped > b) out.push([b, calc])
        else if (capped <= a) out.push([b, px(cap - frame)])
        else out.push([Math.ceil(capped) - 1, calc], [b, px(cap - frame)])
      }
      from = l.upTo + 1
    }
    lo = seg.upTo + 1
  }
  return out
    .filter(([, size], i) => size !== out[i + 1]?.[1])
    .map(([upTo, size]) => (upTo === Infinity ? size : `(max-width: ${upTo}px) ${size}`))
    .join(', ')
}
/** Unframed, 54 to 96px, in the contact sheet; framed, 70 to 110px, in the strip */
const sizes = dense ? sizesFor(SHEET, 10) : sizesFor(STRIP, 16, 2, 112)

type Agent = (typeof agents)[number]
const band = (a: Agent) => a.age ?? a.ageLabel
const pending = (a: Agent) =>
  a.portrait ? '' : a.portraitStatus === 'mismatch' ? 'new portrait pending ledger update' : 'no portrait yet'
const label = (a: Agent) => [a.name, band(a), pending(a), 'ledger entry'].filter(Boolean).join(', ')

// Back to this page: open the sheet before VitePress restores the scroll
// position, so the reader lands where they left (this history entry's UI
// state, entry-state.ts; a new visit starts collapsed; restore.ts)
onRestore(() => {
  if (!dense || readEntry<RulepageUi>(ENTRY)?.strip !== true) return false
  expanded.value = true
  return true
})
// Back and Forward within the page leave the sheet as it is (restore.ts)
if (dense) followDocument('strip', () => expanded.value)

async function toggle() {
  const opening = !expanded.value
  // The first tile the collapsed sheet hides, which is where reading goes on
  const next = opening
    ? [...(list.value?.children ?? [])].find((li) => getComputedStyle(li).display === 'none')
    : null
  expanded.value = opening
  writeEntry<RulepageUi>(ENTRY, { ...readEntry<RulepageUi>(ENTRY), strip: opening })
  await nextTick()
  // Opening adds the tiles above the button, so focus moves to the first new
  // one; closing pulls the button up, so keep it in view
  const link = next?.querySelector('a')
  if (link) link.focus()
  else more.value?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <div
    v-if="n"
    class="ir-strip"
    :class="{ 'is-dense': dense, 'is-collapsed': dense && !expanded, 'fits-wide': dense && fitsWide }"
    :style="columns"
    :data-wide="dense ? sheet.wide : undefined"
    :data-mid="dense ? sheet.mid : undefined"
    :data-narrow="dense ? sheet.narrow : undefined"
  >
    <div :class="dense ? 'ir-strip-sheet ir-frame' : 'ir-strip-row'">
      <template v-if="dense"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></template>
      <ul :id="listId" ref="list" class="ir-strip-grid" role="list">
        <li v-for="(a, i) in agents" :key="`${i}-${a.slug}`">
          <a
            class="ir-strip-item"
            :href="`${ledger}#${a.slug}`"
            :aria-label="label(a)"
            :title="pending(a) ? `${a.name}: ${pending(a)}` : undefined"
          >
            <Portrait :agent="a" :framed="!dense" :sizes="sizes" />
            <span class="ir-strip-cap">
              <span class="ir-strip-name">{{ a.name }}</span>
              <span class="ir-strip-age">{{ band(a) }}<template v-if="pending(a)"> · pending</template></span>
            </span>
          </a>
        </li>
      </ul>
    </div>
    <div class="ir-strip-foot">
      <p class="ir-strip-note">
        Every portrait is an AI-generated image of an invented person<span v-if="hasRule1">
          (<a href="#rule-1">rule 01</a>)</span>.
      </p>
      <button
        v-if="dense"
        ref="more"
        type="button"
        class="ir-btn ir-btn-secondary ir-strip-more"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-controls="listId"
        @click="toggle"
      >
        {{ expanded ? 'Show fewer portraits' : `Show all ${n} portraits` }}
      </button>
    </div>
  </div>
</template>
