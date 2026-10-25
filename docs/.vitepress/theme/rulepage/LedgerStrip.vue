<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'

// Every ledger agent's portrait above the ledger table, each linking to its
// /ledger entry by the agent's ledger slug (2a ledger strip). Up to a dozen
// sit in one row, each in its own blueprint frame. A bigger fleet becomes a
// contact sheet: one blueprint frame around a grid of small unframed
// portraits (a frame per 70px tile would be all registration marks), showing
// its first two rows until the reader asks for all of them. Every tile is in
// the HTML either way; the rows past the second are hidden by rulepage.css,
// which knows how many columns the sheet has at each width.
const agents = data.agents
const dense = agents.length > 12
/** At its widest the sheet has 8 columns: two rows hold 16, so nothing is hidden */
const fitsWide = agents.length <= 16
const expanded = ref(false)
const listId = 'ir-strip-list'
const ledger = withBase('/ledger')
const hasRule1 = data.rules.some((r) => r.n === 1)

type Agent = (typeof agents)[number]
const band = (a: Agent) => a.age ?? a.ageLabel
const pending = (a: Agent) =>
  a.portrait ? '' : a.portraitStatus === 'mismatch' ? 'new portrait pending ledger update' : 'no portrait yet'
const label = (a: Agent) => [a.name, band(a), pending(a), 'ledger entry'].filter(Boolean).join(', ')
</script>

<template>
  <div
    v-if="agents.length"
    class="ir-strip"
    :class="{ 'is-dense': dense, 'is-collapsed': dense && !expanded, 'fits-wide': dense && fitsWide }"
    :style="dense ? undefined : { '--ir-strip-n': agents.length }"
  >
    <div :class="dense ? 'ir-strip-sheet blueprint' : 'ir-strip-row'">
      <template v-if="dense"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></template>
      <ul :id="listId" class="ir-strip-grid" role="list">
        <li v-for="(a, i) in agents" :key="`${i}-${a.slug}`">
          <a
            class="ir-strip-item"
            :href="`${ledger}#${a.slug}`"
            :aria-label="label(a)"
            :title="pending(a) ? `${a.name}: ${pending(a)}` : undefined"
          >
            <Portrait :agent="a" :framed="!dense" sizes="80px" />
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
        type="button"
        class="ir-btn ir-btn-secondary ir-strip-more"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-controls="listId"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show fewer' : `Show all ${agents.length}` }}
      </button>
    </div>
  </div>
</template>
