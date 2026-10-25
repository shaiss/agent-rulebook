<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'

// Every ledger agent's portrait above the ledger table, each linking to its
// /ledger entry (2a ledger strip). Up to a dozen sit in one framed row; a
// bigger fleet wraps into a grid of small unframed portraits.
const agents = data.agents
const dense = agents.length > 12
const ledger = withBase('/ledger')
const hasRule1 = data.rules.some((r) => r.n === 1)

type Agent = (typeof agents)[number]
const band = (a: Agent) => a.age ?? a.ageLabel
const pending = (a: Agent) =>
  a.portrait ? '' : a.portraitStatus === 'mismatch' ? 'new portrait pending ledger update' : 'no portrait yet'
const label = (a: Agent) => [a.name, band(a), pending(a), 'ledger entry'].filter(Boolean).join(', ')
</script>

<template>
  <div v-if="agents.length" class="ir-strip" :class="{ 'is-dense': dense }" :style="{ '--ir-strip-n': agents.length }">
    <ul class="ir-strip-grid" role="list">
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
    <p class="ir-strip-note">
      Every portrait is an AI-generated image of an invented person<span v-if="hasRule1">
        (<a href="#rule-1">rule 01</a>)</span>.
    </p>
  </div>
</template>
