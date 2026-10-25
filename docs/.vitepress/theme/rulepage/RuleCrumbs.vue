<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

// Breadcrumb at the top of the rule page's header (2a), named from the
// sidebar group and item that link here. Neither crumb has a page of its own
// to link to (there is no Rules index, and the last one is this page), so it
// is a plain line of text rather than a breadcrumb landmark.
const { theme, page } = useData()

const crumbs = computed(() => {
  const here = '/' + page.value.relativePath.replace(/\.md$/, '')
  const groups = Array.isArray(theme.value.sidebar) ? theme.value.sidebar : []
  for (const g of groups) {
    const item = g.items?.find((i: { link?: string }) => i.link === here)
    if (item) return [g.text as string, item.text as string]
  }
  return ['Rules', 'Avatars']
})
</script>

<template>
  <p class="ir-crumbs">
    <template v-for="(c, i) in crumbs" :key="c">
      <span v-if="i" class="ir-crumbs-sep">/</span>
      <span :class="{ 'ir-crumbs-here': i === crumbs.length - 1 }">{{ c }}</span>
    </template>
  </p>
</template>
