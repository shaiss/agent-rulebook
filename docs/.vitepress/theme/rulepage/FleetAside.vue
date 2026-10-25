<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { balance } from '../../data/parse'

// "Fleet" box under the outline: how many agents the ledger holds and how
// many gender × age cells are still open (2a right aside).
const count = data.agents.length
const open = balance(data.agents).open.length
const ledger = withBase('/ledger')
</script>

<template>
  <div class="ir-fleetbox blueprint" role="group" aria-labelledby="ir-fleetbox-label">
    <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
    <span id="ir-fleetbox-label" class="ir-label">Fleet</span>
    <span class="ir-fleetbox-n">{{ count }}</span>
    <span class="ir-fleetbox-meta">
      live portrait{{ count === 1 ? '' : 's' }} · {{ open }} open gender × age cell{{ open === 1 ? '' : 's' }}
    </span>
    <a class="ir-fleetbox-link" :href="ledger">Open the ledger →</a>
  </div>
</template>
