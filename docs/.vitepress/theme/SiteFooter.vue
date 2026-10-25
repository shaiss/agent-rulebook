<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../data/rulebook.data'

// The site's one page foot (2a), on every page: "Edit this page on GitHub"
// and "Last updated <date>" on one ruled line, styled once in style.css
// (.ir-docfoot). The landing renders it after its <main>, as the page's
// contentinfo; the rule page (rulepage/markdown.ts emits it at the end of the
// doc) and the ledger (LedgerRoster.vue) render it inside their main, where a
// <footer> is no landmark of its own. The edit link follows the site's
// editLink config the way VitePress's own doc footer does, so it opens the
// page's own markdown file; the date is the latest one the rulebook text
// mentions (the rules are dated in their prose; git times would track syncs,
// not edits). A `note` (the landing's credit line) runs as a second line
// under them.
defineProps<{ note?: string }>()
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
  <footer v-if="edit || updated || note" class="ir-docfoot">
    <a v-if="edit" class="ir-docfoot-edit" :href="edit.url" target="_blank" rel="noreferrer"
      >{{ edit.text }}<span class="ir-sr"> (opens in a new tab)</span></a
    >
    <p v-if="updated" class="ir-docfoot-updated">Last updated <time :datetime="updated">{{ updated }}</time></p>
    <p v-if="note" class="ir-docfoot-note">{{ note }}</p>
  </footer>
</template>
