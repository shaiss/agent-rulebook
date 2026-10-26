<script setup lang="ts">
import { withBase } from 'vitepress'

// The 404 page (Layout.vue's not-found slot, which puts the site's page foot
// after it), in the landing's grammar: a big condensed numeral, one line, and
// the three places worth going instead.
const links = [
  { text: 'Home', href: withBase('/'), primary: true },
  { text: 'Avatar rules', href: withBase('/rules/avatars') },
  { text: 'Ledger', href: withBase('/ledger') }
]
</script>

<template>
  <main class="ir-nf">
    <div class="ir-nf-plate ir-frame">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      <span class="ir-label">Error</span>
      <h1 class="ir-nf-title">
        <span class="ir-nf-code">404</span>{{ ' ' }}<span class="ir-nf-text">Page not found</span>
      </h1>
    </div>
    <p class="ir-nf-lede">
      Nothing in the rulebook lives at this address. The page may have moved, or the link may be mistyped.
    </p>
    <nav class="ir-nf-actions" aria-label="Where to go instead">
      <a
        v-for="l in links"
        :key="l.href"
        class="ir-btn"
        :class="l.primary ? 'ir-btn-primary ir-frame' : 'ir-btn-secondary'"
        :href="l.href"
      >
        <template v-if="l.primary"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></template>
        {{ l.text }}
      </a>
    </nav>
  </main>
</template>
