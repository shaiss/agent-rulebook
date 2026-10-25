<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../../data/rulebook.data'

// The site's page foot, as on the rule page (rulepage/RuleFooter.vue): "Edit
// this page on GitHub" and "Last updated <date>" on one ruled line. The edit
// link follows the site's editLink config, so here it opens docs/ledger.md;
// the date is the latest one the rulebook mentions, since the ledger is read
// from it.
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
