<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted } from 'vue'
import { getScrollOffset } from 'vitepress'
import { focusTarget, targetOf } from './restore'
import { landsAtPlace } from '../entry-state'

// Page-level behaviour for the rule page, mounted by Layout.vue ahead of the
// content. It renders nothing: the header itself, breadcrumb included, comes
// from the markdown (rulepage/markdown.ts, RuleCrumbs.vue).
//
// Anchors: VitePress scrolls to location.hash as soon as the page is routed,
// which on a cold load is before the web fonts have swapped in. Barlow sets
// tighter than the fallback, so the reflow moves every target (measured: the
// Ledger h2 at -40px under the nav, PR6's Prior art at -393px). Once the fonts
// are in, put the target back where VitePress puts in-page clicks (its scroll
// offset, plus the target's top padding), unless the reader has started
// scrolling meanwhile. The same happens for a hash change (an in-page link or
// an outline click) that lands while the fonts are still loading.
//
// Focus: a link to a rule or a section brings keyboard focus to it, as a
// link to a #target does in the browser's own hands, so the next Tab goes on
// from there. VitePress handles these links itself and leaves focus behind:
// on the link, for one within the page ("rule 01" under the portraits), or
// at the top of the page, for one from another page (a rule card on the
// landing, a rule link in the ledger), where it puts focus on every route.
// (Its outline links already focus their heading.)
//
// Not when the page goes back to where the reader was instead (a Back or
// Forward, a reload: entry-state.ts landsAtPlace): that place wins over the
// hash, and focus stays where the browser leaves it.
//
// And VitePress puts the content up anew on the first Back or Forward
// between two of the page's own #entries, which took the focused control
// (the ledger table's summary, "Show all") with it: focus fell to the page.
// It goes back to the same control in the new content.

function align(el: HTMLElement) {
  const pad = parseInt(getComputedStyle(el).paddingTop, 10) || 0
  const top = Math.round(scrollY + el.getBoundingClientRect().top - getScrollOffset() + pad)
  if (Math.abs(top - scrollY) > 1) scrollTo(0, top)
}

/** The target of a link within this page, if the link is one */
function inPageTarget(a: HTMLAnchorElement) {
  try {
    const to = new URL(a.href, location.href)
    if (to.origin !== location.origin || to.pathname !== location.pathname || to.search !== location.search) return null
    return targetOf(to.hash)
  } catch {
    return null
  }
}

export default defineComponent({
  name: 'RuleHeader',
  setup() {
    let cancel: (() => void) | null = null
    /** The page's path, from mount; the location leaves it as soon as the router heads for another page */
    let path = ''

    function realignAfterFonts() {
      cancel?.()
      const hash = location.hash
      if (!targetOf(hash)) return
      const moved = new AbortController()
      const stop = () => moved.abort()
      for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'])
        addEventListener(type, stop, { once: true, passive: true, capture: true, signal: moved.signal })
      cancel = stop
      document.fonts.ready.then(() =>
        // two frames: after VitePress's own scroll, which also waits a frame
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = targetOf(hash)
            if (!moved.signal.aborted && el && location.hash === hash) align(el)
            stop()
          })
        )
      )
    }

    function onHashChange() {
      // Once the fonts are in, VitePress's own scroll is final (and may be smooth)
      if (document.fonts.status !== 'loaded') realignAfterFonts()
    }

    // A link within the page, followed by click or by Enter (VitePress has
    // handled it by now: a new entry, and the scroll, which waits a frame).
    // Not when focus is already on the target or in it (an outline link's
    // heading, a heading's own "#" link).
    function onClick(e: MouseEvent) {
      if (!e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]')
      const el = a instanceof HTMLAnchorElement ? inPageTarget(a) : null
      if (el && !el.contains(document.activeElement)) focusTarget(el)
    }

    // A Back or Forward within the page: if the content is put up anew, put
    // focus back on the element at the same place in it
    let watching: MutationObserver | null = null
    function keepFocus() {
      watching?.disconnect()
      const doc = document.querySelector('.vp-doc')
      const el = document.activeElement
      if (location.pathname !== path || !doc || !(el instanceof HTMLElement) || !doc.contains(el)) return
      const at = Array.prototype.indexOf.call(doc.getElementsByTagName('*'), el)
      const observer = (watching = new MutationObserver(() => {
        if (el.isConnected) return
        observer.disconnect()
        const twin = doc.getElementsByTagName('*')[at]
        const now = document.activeElement
        if (twin instanceof HTMLElement && twin.tagName === el.tagName && (!now || now === document.body)) focusTarget(twin)
      }))
      observer.observe(doc, { childList: true, subtree: true })
      // the full build comes over the network once; give up if it doesn't
      setTimeout(() => observer.disconnect(), 5000)
    }

    onMounted(() => {
      path = location.pathname
      // Always on mount: the fonts may have finished between VitePress's scroll
      // and hydration, and re-aligning a target already in place is a no-op
      if (!landsAtPlace()) {
        realignAfterFonts()
        const el = targetOf(location.hash)
        if (el) focusTarget(el)
      }
      addEventListener('hashchange', onHashChange)
      addEventListener('click', onClick)
      addEventListener('popstate', keepFocus)
    })
    onBeforeUnmount(() => {
      cancel?.()
      watching?.disconnect()
      removeEventListener('hashchange', onHashChange)
      removeEventListener('click', onClick)
      removeEventListener('popstate', keepFocus)
    })

    // Nothing to draw (null renders the same empty node on server and client)
    return () => null
  }
})
</script>
