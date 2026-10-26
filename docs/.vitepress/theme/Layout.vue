<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import RuleHeader from './rulepage/RuleHeader.vue'
import FleetAside from './rulepage/FleetAside.vue'
import SiteNotFound from './SiteNotFound.vue'
import SiteFooter from './SiteFooter.vue'
import { restorePlace } from './entry-state'

const { page } = useData()
const isRulebook = computed(() => page.value.relativePath === 'rules/avatars.md')
// The page foot goes under each page's own column (SiteFooter.vue)
const pageKind = computed(() =>
  page.value.relativePath === 'index.md' ? 'home' : page.value.relativePath === 'ledger.md' ? 'ledger' : 'page'
)

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

// Menus that cover the page keep keyboard focus. Below 768px the nav bar's
// menu button opens a menu over the whole window (VPNavScreen); below 960px
// "Menu" opens the sidebar as a drawer over the page. VitePress left the page
// behind them in the tab order, so Tab went on, unseen, through the covered
// page. While either is open, what it covers is inert. Escape closes either
// and puts focus back on the button that opened it (VitePress handled Escape
// for the sidebar only).
const COVERED = {
  screen: ['.VPSkipLink', '.VPLocalNav', '.VPSidebar', '#VPContent', '.VPFooter'],
  sidebar: ['.VPSkipLink', '.VPNav', '.VPLocalNav', '#VPContent', '.VPFooter']
}
const ALL_COVERED = [...new Set([...COVERED.screen, ...COVERED.sidebar])]
let narrow: MediaQueryList | undefined
const hamburger = () => document.querySelector<HTMLElement>('.VPNavBarHamburger')
const sidebarOpen = () => !!narrow?.matches && !!document.querySelector('.VPSidebar.open')
function syncOverlay(force?: 'none') {
  const open = force ? null : hamburger()?.classList.contains('active') ? 'screen' : sidebarOpen() ? 'sidebar' : null
  const covered = open ? COVERED[open] : []
  for (const sel of ALL_COVERED) {
    const inert = covered.includes(sel)
    document.querySelectorAll(sel).forEach((el) => el.toggleAttribute('inert', inert))
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    const button = hamburger()
    if (button?.classList.contains('active')) {
      button.click()
      button.focus()
    } else if (sidebarOpen()) {
      // VitePress closes the sidebar on Escape too, but on keyup, and its
      // focus back to "Menu" would land while the page behind is still
      // inert. Close it here first, with the page live again.
      syncOverlay('none')
      document.querySelector<HTMLElement>('.VPBackdrop')?.click()
      document.querySelector<HTMLElement>('.VPLocalNav .menu')?.focus()
    }
    return
  }
  const el = e.target as HTMLElement | null
  if (e.key !== ' ' || !el?.matches?.('.VPSidebar .VPSidebarItem.collapsible > .item[role="button"]')) return
  e.preventDefault()
  el.click()
}

const onNarrow = () => syncOverlay()

let observer: MutationObserver | undefined
onMounted(() => {
  // The document's first render is in: put the reader back where this entry
  // was left, if a reload or a Back from another site brought it back (entry-state.ts)
  restorePlace()
  syncSidebarGroups()
  narrow = matchMedia('(max-width: 959px)')
  narrow.addEventListener('change', onNarrow)
  syncOverlay()
  // The sidebar comes and goes with the page, and its groups re-render; the
  // menus open and close by class
  observer = new MutationObserver((records) => {
    if (records.some((r) => r.type === 'childList' || (r.target as Element).closest?.('.VPSidebar'))) syncSidebarGroups()
    syncOverlay()
  })
  const root = document.querySelector('.Layout')
  if (root) observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  narrow?.removeEventListener('change', onNarrow)
  document.removeEventListener('keydown', onKey)
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
    <!-- The page foot, after each kind of page's <main> -->
    <template #doc-after>
      <SiteFooter kind="doc" />
    </template>
    <template #page-bottom>
      <SiteFooter :kind="pageKind" :credit="pageKind === 'home'" />
    </template>
    <template #not-found>
      <SiteNotFound />
      <SiteFooter kind="nf" />
    </template>
  </DefaultTheme.Layout>
</template>
