<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { fleetFacts } from './fleet'

// The Fleet box's facts as one line under the Ledger heading, for widths
// where VitePress hides the aside (below 1280px); rulepage.css hides this line
// once the aside shows, so a page only ever states them once.
const f = fleetFacts(data.agents)
const ledger = withBase('/ledger')
</script>

<template>
  <p class="ir-fleetline">
    <span class="ir-label">Fleet</span>
    <span class="ir-fleetline-facts">{{ f.total }} {{ f.agentsText }} · {{ f.portraitsText }} · {{ f.openText }}</span>
    <a class="ir-fleetline-link" :href="ledger">Open the ledger<span aria-hidden="true"> →</span></a>
  </p>
</template>
