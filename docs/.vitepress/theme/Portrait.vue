<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import type { Agent } from '../data/parse'

// One agent's portrait in a blueprint frame (a span, so it can sit inside buttons). Falls back to a monogram when
// the agent has no portrait yet, or when its portrait shows a newer face
// than its ledger row describes (until the ledger is synced).
const props = withDefaults(
  defineProps<{
    agent: Agent
    /** `sizes` attribute for the responsive image, e.g. "(max-width: 768px) 25vw, 120px" */
    sizes?: string
    framed?: boolean
    eager?: boolean
  }>(),
  { sizes: '240px', framed: true, eager: false }
)

const initials = computed(() =>
  props.agent.name
    .split(/\s+/)
    .filter((w) => w.length > 2 || props.agent.name.split(/\s+/).length === 1)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 3)
)
const pendingNote = computed(() =>
  props.agent.portraitStatus === 'mismatch' ? 'New portrait pending ledger update' : 'No portrait yet'
)
</script>

<template>
  <span class="ir-portrait" :class="{ blueprint: framed, 'is-pending': !agent.portrait }">
    <template v-if="framed">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
    </template>
    <img
      v-if="agent.portrait"
      :src="withBase(agent.portrait.large)"
      :srcset="`${withBase(agent.portrait.small)} 240w, ${withBase(agent.portrait.medium)} 480w, ${withBase(agent.portrait.large)} 720w`"
      :sizes="sizes"
      :alt="`Portrait of ${agent.name} (AI-generated image of an invented person)`"
      width="720"
      height="720"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
    />
    <span v-else class="ir-portrait-pending" role="img" :aria-label="`${agent.name}: ${pendingNote}`">
      <span class="ir-portrait-monogram" aria-hidden="true">{{ initials }}</span>
      <span class="ir-portrait-note" aria-hidden="true">{{ pendingNote }}</span>
    </span>
  </span>
</template>
