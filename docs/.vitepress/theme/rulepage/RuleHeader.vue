<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useData } from 'vitepress'

// Breadcrumb above the rule page's h1 (2a header), named from the sidebar
// group and item that link here. The h1, status tags and lede come from the
// markdown (rulepage/markdown.ts).
const { theme, page } = useData()

const crumbs = computed(() => {
  const here = '/' + page.value.relativePath.replace(/\.md$/, '')
  const groups = Array.isArray(theme.value.sidebar) ? theme.value.sidebar : []
  for (const g of groups) {
    const item = g.items?.find((i: { link?: string }) => i.link === here)
    if (item) return [g.text, item.text]
  }
  return ['Rules', 'Avatars']
})

// A cold load of /rules/avatars#rule-N scrolls before the web fonts swap in,
// and the reflow can leave the cell under the nav. Re-align once they're in,
// unless the reader has started scrolling.
onMounted(() => {
  const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  if (!el?.classList.contains('ir-cell') || document.fonts.status === 'loaded') return
  const moved = new AbortController()
  for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown'])
    addEventListener(type, () => moved.abort(), { once: true, passive: true, signal: moved.signal })
  document.fonts.ready.then(() =>
    requestAnimationFrame(() => {
      if (!moved.signal.aborted) el.scrollIntoView({ block: 'start' })
      moved.abort()
    })
  )
})
</script>

<template>
  <nav class="ir-crumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(c, i) in crumbs" :key="c" :aria-current="i === crumbs.length - 1 ? 'page' : undefined">{{ c }}</li>
    </ol>
  </nav>
</template>
