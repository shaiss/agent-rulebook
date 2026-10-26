// The default theme without its Inter web font: the site sets Barlow and
// Barlow Condensed throughout, self-hosted (latin subset, the weights in use)
import DefaultTheme from 'vitepress/theme-without-fonts'
import { inBrowser, type Theme } from 'vitepress'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow-condensed/latin-400.css'
import '@fontsource/barlow-condensed/latin-600.css'
import Layout from './Layout.vue'
import Home from './Home.vue'
import Portrait from './Portrait.vue'
import { keepEntryState } from './entry-state'
import { registerRulePage } from './rulepage/register'
import { registerLedger } from './ledger/register'
import './fonts.css'
import './style.css'
import './chrome.css'
import './portrait.css'
import './rulepage/rulepage.css'
import './ledger/ledger.css'

/**
 * VitePress scrolls header-anchor clicks (and the theme some of its own jumps)
 * with behavior: 'smooth' whatever the reader's motion setting. Under
 * prefers-reduced-motion: reduce, every smooth scroll request becomes an
 * instant one. Checked per call, so a change of setting applies at once.
 */
function calmScrolling() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const calm = (arg: unknown) =>
    reduce.matches && arg && typeof arg === 'object' && (arg as ScrollOptions).behavior === 'smooth'
      ? { ...(arg as ScrollOptions), behavior: 'auto' as ScrollBehavior }
      : arg
  const wrap = (target: any, names: string[]) => {
    for (const name of names) {
      const original = target[name]
      if (typeof original !== 'function' || original.__irCalm) continue
      const wrapped = function (this: unknown, ...args: unknown[]) {
        if (args.length === 1) args[0] = calm(args[0])
        return original.apply(this, args)
      }
      wrapped.__irCalm = true
      target[name] = wrapped
    }
  }
  wrap(window, ['scrollTo', 'scroll', 'scrollBy'])
  wrap(Element.prototype, ['scrollTo', 'scroll', 'scrollBy', 'scrollIntoView'])
}

/**
 * A #hash with a broken percent-escape (a link cut short in the middle of a
 * non-Latin heading's address) names nothing on any page, and VitePress's
 * router and outline decode it unguarded: a warning and an uncaught error in
 * the console on every load. Before the router's first look at the address,
 * drop such a fragment from it (the entry and its state stay as they are).
 */
function dropMalformedHash() {
  try {
    decodeURIComponent(location.hash)
  } catch {
    try {
      history.replaceState(history.state, '', location.pathname + location.search)
    } catch {} // history blocked: the page still works
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('Home', Home)
    app.component('Portrait', Portrait)
    registerRulePage(app)
    registerLedger(app)
    if (inBrowser) {
      dropMalformedHash()
      calmScrolling()
      // Back, Forward and a reload bring each page back as it was left: its UI
      // state and the reader's place (entry-state.ts)
      keepEntryState()
    }
  }
} satisfies Theme
