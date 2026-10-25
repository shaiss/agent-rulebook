<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { fleetFacts } from './fleet'

// "Fleet" box under the outline (2a right aside): how many agents the ledger
// holds, how many of their portraits are live or still pending, and how many
// gender × age cells are open. The aside only shows from 1280px; below that
// FleetLine.vue states the same facts under the Ledger heading. It sits
// beside the main content, outside VitePress's outline nav, so it is its own
// complementary landmark, named "Fleet".
const f = fleetFacts(data.agents)
const ledger = withBase('/ledger')
</script>

<template>
  <aside class="ir-fleetbox blueprint" aria-labelledby="ir-fleetbox-label">
    <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
    <span id="ir-fleetbox-label" class="ir-label">Fleet</span>
    <span class="ir-fleetbox-count"><span class="ir-fleetbox-n">{{ f.total }}</span> {{ f.agentsText }}</span>
    <span class="ir-fleetbox-meta">
      <span class="ir-fleetbox-fact">{{ f.portraitsText }}</span>
      <span class="ir-fleetbox-fact">{{ f.openText }}</span>
    </span>
    <a class="ir-fleetbox-link" :href="ledger">Open the ledger<span aria-hidden="true"> →</span></a>
  </aside>
</template>
