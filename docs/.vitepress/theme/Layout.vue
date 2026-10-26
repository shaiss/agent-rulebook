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
let overlay: keyof typeof COVERED | null = null
const hamburger = () => document.querySelector<HTMLElement>('.VPNavBarHamburger')
const sidebarOpen = () => !!narrow?.matches && !!document.querySelector('.VPSidebar.open')
function syncOverlay(force?: 'none') {
  const open = force ? null : hamburger()?.classList.contains('active') ? 'screen' : sidebarOpen() ? 'sidebar' : null
  const was = overlay
  overlay = open
  const covered = open ? COVERED[open] : []
  for (const sel of ALL_COVERED) {
    const inert = covered.includes(sel)
    document.querySelectorAll(sel).forEach((el) => el.toggleAttribute('inert', inert))
  }
  // The drawer has just opened: "Menu", under it, has gone inert and taken
  // focus with it (to the page). Focus goes into the drawer instead, to its
  // nav, as VitePress means to (it focuses the drawer's aside, which can't
  // take focus). The menu over the window keeps focus on its own button.
  if (open === 'sidebar' && was !== 'sidebar') {
    const nav = document.querySelector<HTMLElement>('#VPSidebarNav')
    if (nav && !nav.contains(document.activeElement)) nav.focus({ preventScroll: true })
  }
}

// The rule page's "On this page" (below 1280px) opens a list over the top of
// the page. VitePress closes it on a click outside, Escape or a new page, but
// not when keyboard focus leaves it, so Tab went on to the headings' "#"
// links under the open list; and its toggle said nothing of its state. The
// toggle gets aria-expanded (and aria-controls while the list is there), the
// list is named as the page's navigation it is, and it closes as soon as
// focus lands anywhere outside it: Tab on out of it, or on from wherever
// focus was when a click opened it (Safari doesn't focus a clicked button).
// (Its "Return to top" form, before the outline is read, toggles nothing.)
function syncOutline() {
  const box = document.querySelector('.VPLocalNavOutlineDropdown')
  const button = box?.querySelector<HTMLElement>(':scope > button')
  if (!box || !button) return
  const label = button.querySelector('.menu-text')
  if (!label) {
    button.removeAttribute('aria-expanded')
    button.removeAttribute('aria-controls')
    return
  }
  const open = button.classList.contains('open')
  button.setAttribute('aria-expanded', String(open))
  const items = box.querySelector<HTMLElement>(':scope > .items')
  if (items) {
    if (!items.id) items.id = 'ir-outline-list'
    items.setAttribute('role', 'navigation')
    items.setAttribute('aria-label', label.textContent?.trim() || 'On this page')
  }
  if (open && items) button.setAttribute('aria-controls', items.id)
  else button.removeAttribute('aria-controls')
}

function onFocusIn(e: FocusEvent) {
  const box = document.querySelector('.VPLocalNavOutlineDropdown')
  if (!box || !(e.target instanceof Node) || box.contains(e.target)) return
  const button = box.querySelector<HTMLElement>(':scope > button')
  if (!button?.classList.contains('open')) return
  // At once, not faded out over what focus has moved to (as VitePress does
  // when one of its links is followed)
  const items = box.querySelector<HTMLElement>(':scope > .items')
  if (items) items.style.transition = 'none'
  button.click()
}

// The nav bar's "…" (768px to 1279px) opens its menu on hover as well as on
// a click, and VitePress gave neither a way out by keyboard: Escape left it
// open, and a menu opened by hover stayed over the page until the pointer
// moved (WCAG 1.4.13). Escape closes it, and hides one held open by hover
// until the pointer leaves it or it is opened again (chrome.css).
function dismissFlyouts() {
  document.querySelectorAll<HTMLElement>('.VPNav .VPFlyout').forEach((flyout) => {
    const button = flyout.querySelector<HTMLElement>(':scope > .button')
    const expanded = button?.getAttribute('aria-expanded') === 'true'
    const hovered = flyout.matches(':hover')
    if (!button || (!expanded && !hovered)) return
    const hadFocus = flyout.contains(document.activeElement)
    if (expanded) button.click()
    if (hadFocus) button.focus()
    if (hovered && !flyout.classList.contains('ir-dismissed')) {
      flyout.classList.add('ir-dismissed')
      const done = new AbortController()
      const restore = () => {
        flyout.classList.remove('ir-dismissed')
        done.abort()
      }
      flyout.addEventListener('mouseleave', restore, { signal: done.signal })
      button.addEventListener('click', restore, { signal: done.signal })
    }
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    dismissFlyouts()
    // VitePress closes "On this page" on Escape (just after this), and focus
    // in its list would fall to the page: back to the toggle first
    const outline = (document.activeElement as Element | null)?.closest?.('.VPLocalNavOutlineDropdown')
    outline?.querySelector<HTMLElement>(':scope > button')?.focus()
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
  syncOutline()
  narrow = matchMedia('(max-width: 959px)')
  narrow.addEventListener('change', onNarrow)
  syncOverlay()
  // The sidebar comes and goes with the page, and its groups re-render; the
  // menus open and close by class
  observer = new MutationObserver((records) => {
    if (records.some((r) => r.type === 'childList' || (r.target as Element).closest?.('.VPSidebar'))) syncSidebarGroups()
    syncOutline()
    syncOverlay()
  })
  const root = document.querySelector('.Layout')
  if (root) observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  document.addEventListener('keydown', onKey)
  document.addEventListener('focusin', onFocusIn)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  narrow?.removeEventListener('change', onNarrow)
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('focusin', onFocusIn)
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
