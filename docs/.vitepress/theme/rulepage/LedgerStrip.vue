<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { readEntry, writeEntry } from '../entry-state'
import { onRestore } from './restore'

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
// rulepage.css, which knows how many columns the sheet has at each width, and
// shown again without JavaScript, or in print.

/** The rule page's UI state, shared with RuleLedgerTable.vue: history.state.ir.rulepage */
const ENTRY = 'rulepage'
type RulepageUi = { strip?: boolean; table?: boolean }

const agents = data.agents
const n = agents.length
const dense = n > 12
/** At its widest the sheet has 8 columns: two rows hold 16, so nothing is hidden */
const fitsWide = n <= 16
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
const columns = dense
  ? undefined
  : {
      '--ir-strip-c7': balanced(7),
      '--ir-strip-c6': balanced(6),
      '--ir-strip-c5': balanced(5),
      '--ir-strip-c4': balanced(4),
      '--ir-strip-c3': balanced(3)
    }

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
            <Portrait :agent="a" :framed="!dense" :sizes="dense ? '80px' : '(max-width: 768px) 80px, 112px'" />
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
