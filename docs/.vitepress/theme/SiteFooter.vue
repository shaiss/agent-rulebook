<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../data/rulebook.data'
import Dated from './Dated'

// The site's one page foot (2a): "Edit this page on GitHub" and "Last
// updated <date>" on one ruled line, styled once in style.css (.ir-docfoot).
// Layout.vue renders it on every page, after the page's <main> (never inside
// it), so each page has exactly one contentinfo landmark; `kind` places it
// under that page's column (style.css, ledger.css, rulepage.css). The edit
// link follows the site's editLink config the way VitePress's own doc footer
// does, so it opens the page's own markdown file (the 404 has none); the
// date is the latest one the rulebook text mentions (the rules are dated in
// their prose; git times would track syncs, not edits). With `credit` (the
// landing), who set the rules and when runs as a second line under them.
// Every date in it stays on one line (Dated.ts, style.css .ir-date).
const props = defineProps<{ kind: 'home' | 'ledger' | 'doc' | 'page' | 'nf'; credit?: boolean }>()
const { theme, page, frontmatter } = useData()

const edit = computed(() => {
  const cfg = theme.value.editLink
  if (!cfg || frontmatter.value.editLink === false || page.value.isNotFound) return null
  const url = typeof cfg.pattern === 'function' ? cfg.pattern(page.value) : cfg.pattern.replace(/:path/g, page.value.filePath)
  return { url, text: cfg.text || 'Edit this page' }
})
const { updatedDate: updated, setDate, refinedDate } = data
const note = computed(() =>
  props.credit && setDate
    ? `Rules set by Shai, ${setDate}${refinedDate && refinedDate !== setDate ? ` · refined ${refinedDate}` : ''}`
    : ''
)
</script>

<template>
  <div v-if="edit || updated || note" class="ir-pagefoot" :class="`ir-pagefoot--${kind}`">
    <footer class="ir-docfoot">
      <a v-if="edit" class="ir-docfoot-edit" :href="edit.url" target="_blank" rel="noreferrer"
        >{{ edit.text }}<span class="ir-sr"> (opens in a new tab)</span></a
      >
      <p v-if="updated" class="ir-docfoot-updated">Last updated <time class="ir-date" :datetime="updated">{{ updated }}</time></p>
      <p v-if="note" class="ir-docfoot-note"><Dated :text="note" /></p>
    </footer>
  </div>
</template>
