<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../../data/rulebook.data'

// 2a's page foot: "Edit this page on GitHub" and "Last updated <date>" on one
// ruled line. The date is the latest one the rulebook text mentions (the
// rules are dated in their prose; git times would track syncs, not edits).
// The edit link follows the site's editLink config the way VitePress's own
// doc footer does; rulepage.css hides that footer (and its prev/next pager)
// on this page once this one is in place.
const { theme, page, frontmatter } = useData()

const edit = computed(() => {
  const cfg = theme.value.editLink
  if (!cfg || frontmatter.value.editLink === false) return null
  const url = typeof cfg.pattern === 'function' ? cfg.pattern(page.value) : cfg.pattern.replace(/:path/g, page.value.filePath)
  return { url, text: cfg.text || 'Edit this page' }
})
const updated = data.updatedDate
</script>

<template>
  <footer v-if="edit || updated" class="ir-docfoot">
    <a v-if="edit" class="ir-docfoot-edit" :href="edit.url" target="_blank" rel="noreferrer"
      >{{ edit.text }}<span class="ir-sr"> (opens in a new tab)</span></a
    >
    <p v-if="updated" class="ir-docfoot-updated">Last updated <time :datetime="updated">{{ updated }}</time></p>
  </footer>
</template>
