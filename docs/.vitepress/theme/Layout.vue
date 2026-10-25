<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import RuleHeader from './rulepage/RuleHeader.vue'
import FleetAside from './rulepage/FleetAside.vue'
import SiteNotFound from './SiteNotFound.vue'

const { page } = useData()
const isRulebook = computed(() => page.value.relativePath === 'rules/avatars.md')

// The sidebar's group labels (Rules, Reference) are VitePress buttons that
// open and close their group (config.ts). VitePress doesn't say which way
// they are, takes only Enter, and adds a second tab stop for the caret beside
// each. Give each label its state, Space as well as Enter, and take the
// redundant caret out of the tab order (clicking it still toggles the group).
function syncSidebarGroups() {
  document.querySelectorAll<HTMLElement>('.VPSidebar .VPSidebarItem.collapsible').forEach((group, i) => {
    const label = group.querySelector<HTMLElement>(':scope > .item[role="button"]')
    if (!label) return
    label.setAttribute('aria-expanded', group.classList.contains('collapsed') ? 'false' : 'true')
    const items = group.querySelector<HTMLElement>(':scope > .items')
    if (items) {
      if (!items.id) items.id = `ir-sidebar-group-${i}`
      label.setAttribute('aria-controls', items.id)
    }
    const caret = label.querySelector<HTMLElement>(':scope > .caret')
    if (caret && caret.getAttribute('tabindex') !== '-1') {
      caret.setAttribute('tabindex', '-1')
      caret.removeAttribute('role')
      caret.removeAttribute('aria-label')
      caret.setAttribute('aria-hidden', 'true')
    }
  })
}
function onSidebarKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (e.key !== ' ' || !el?.matches?.('.VPSidebar .VPSidebarItem.collapsible > .item[role="button"]')) return
  e.preventDefault()
  el.click()
}

let observer: MutationObserver | undefined
onMounted(() => {
  syncSidebarGroups()
  // The sidebar comes and goes with the page, and its groups re-render
  observer = new MutationObserver((records) => {
    if (records.some((r) => r.type === 'childList' || (r.target as Element).closest?.('.VPSidebar'))) syncSidebarGroups()
  })
  const root = document.querySelector('.Layout')
  if (root) observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  document.addEventListener('keydown', onSidebarKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onSidebarKey)
})
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <RuleHeader v-if="isRulebook" />
    </template>
    <template #aside-outline-after>
      <FleetAside v-if="isRulebook" />
    </template>
    <template #not-found>
      <SiteNotFound />
    </template>
  </DefaultTheme.Layout>
</template>
