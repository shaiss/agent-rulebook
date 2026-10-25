<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted } from 'vue'
import { getScrollOffset } from 'vitepress'

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

function targetOf(hash: string) {
  if (hash.length < 2) return null
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)))
  } catch {
    return null // a malformed escape: not one of ours
  }
}

function align(el: HTMLElement) {
  const pad = parseInt(getComputedStyle(el).paddingTop, 10) || 0
  const top = Math.round(scrollY + el.getBoundingClientRect().top - getScrollOffset() + pad)
  if (Math.abs(top - scrollY) > 1) scrollTo(0, top)
}

export default defineComponent({
  name: 'RuleHeader',
  setup() {
    let cancel: (() => void) | null = null

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

    onMounted(() => {
      // Always on mount: the fonts may have finished between VitePress's scroll
      // and hydration, and re-aligning a target already in place is a no-op
      realignAfterFonts()
      addEventListener('hashchange', onHashChange)
    })
    onBeforeUnmount(() => {
      cancel?.()
      removeEventListener('hashchange', onHashChange)
    })

    // Nothing to draw (null renders the same empty node on server and client)
    return () => null
  }
})
</script>
