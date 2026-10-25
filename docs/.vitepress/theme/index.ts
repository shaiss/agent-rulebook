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
import SiteFooter from './SiteFooter.vue'
import { ENTRY_KEY } from './entry-state'
import { registerRulePage } from './rulepage/register'
import { registerLedger } from './ledger/register'
import './fonts.css'
import './style.css'
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
 * The theme keeps its per-entry UI state in history.state.ir (entry-state.ts:
 * the landing's fleet, the rule page's strip and table, the ledger's filter
 * and selection), so Back restores it. VitePress replaces the whole state
 * object as it navigates ({ scrollPosition } just before it pushes the next
 * page, {} on an in-page #anchor jump), which would drop it. The site's one
 * wrapper around the history API carries `ir` over:
 * - on every replacement that doesn't set it (the entry stays the same);
 * - on a push that stays on the same document (an outline or #anchor link),
 *   whose new entry shows the page just as it was. A push to another page
 *   starts that entry with nothing.
 */
function keepUiState() {
  const h = history as History & { __irKeep?: boolean }
  if (h.__irKeep) return
  const { replaceState: replace, pushState: push } = history
  const carry = (state: any) => {
    const ir = history.state?.[ENTRY_KEY]
    return ir !== undefined && state && typeof state === 'object' && !(ENTRY_KEY in state) ? { ...state, [ENTRY_KEY]: ir } : state
  }
  const sameDocument = (url?: string | URL | null) => {
    if (url == null) return true
    const to = new URL(url, location.href)
    return to.origin === location.origin && to.pathname === location.pathname && to.search === location.search
  }
  h.replaceState = function (this: History, state: any, unused: string, url?: string | URL | null) {
    return replace.call(this, carry(state), unused, url)
  }
  h.pushState = function (this: History, state: any, unused: string, url?: string | URL | null) {
    return push.call(this, sameDocument(url) ? carry(state) : state, unused, url)
  }
  h.__irKeep = true
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('Home', Home)
    app.component('Portrait', Portrait)
    // The site-wide page foot, for any page that renders its own (the landing)
    app.component('SiteFooter', SiteFooter)
    registerRulePage(app)
    registerLedger(app)
    if (inBrowser) {
      calmScrolling()
      keepUiState()
    }
  }
} satisfies Theme
