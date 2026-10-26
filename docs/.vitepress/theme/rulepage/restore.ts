import { getCurrentInstance, nextTick, onMounted } from 'vue'
import { landsAtPlace } from '../entry-state'

// Bringing the rule page's UI state back (the portrait strip's "Show all",
// the ledger table's disclosure: this history entry's state, entry-state.ts)
// without moving what the reader is looking at.

/** The element a #hash names, if it is on this page */
export function targetOf(hash: string) {
  if (hash.length < 2) return null
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)))
  } catch {
    return null // a malformed escape: not one of ours
  }
}

/**
 * Call from a component's setup: `restore()` applies this entry's state on
 * mount and says whether anything opened.
 *
 * After a client-side Back, VitePress restores the scroll position just
 * after the components mount, so opening them on mount is all it takes.
 * After a full load at a #section (Back from another site with no page
 * cache, a reload), the browser has already jumped to the section when the
 * strip and table open above it, and it can't keep the section in view on
 * its own: VitePress re-lays out its nav bar in the same frame, which turns
 * the browser's scroll anchoring off for that frame, and then scrolls to
 * where the section was before they opened. That pushed the page ~1240px
 * down the screen (CLS 0.56 at 1280px) and back. So on a full load the
 * section is held in place by hand: scrolled by whatever opened above it
 * before that frame paints, and once more after VitePress's scroll. Unless
 * the reader is being put back where they were (a reload, or a Back from
 * another site, at the same window width: entry-state.ts), which happens
 * once these have opened.
 */
export function onRestore(restore: () => boolean) {
  // Hydrating the server's HTML (a full load), not a client-side render:
  // Vue has already matched this component to its server-rendered element
  const fullLoad = !!getCurrentInstance()?.vnode.el
  onMounted(async () => {
    const target = fullLoad && !landsAtPlace() ? targetOf(location.hash) : null
    const top = target?.getBoundingClientRect().top
    if (!restore() || !target || top === undefined) return
    const hold = () => {
      const by = target.getBoundingClientRect().top - top
      if (Math.abs(by) >= 1) scrollBy(0, by)
    }
    await nextTick()
    hold()
    requestAnimationFrame(hold)
  })
}
