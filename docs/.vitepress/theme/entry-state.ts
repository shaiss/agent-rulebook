import { nextTick } from 'vue'

// What each history entry remembers, so Back, Forward and a reload bring the
// page back as the reader left it: the UI state they opened or chose (the
// landing's fleet toggle, the rule page's portrait strip and ledger table, the
// ledger's filter and selection), each page's under its own name in
// history.state.ir, and the reader's place, as the entry's scrollPosition,
// VitePress's own key.
//
// It belongs to the history entry, not to the page's address: a typed URL or
// a link from elsewhere opens a new entry, with nothing to restore. Readers
// call readEntry() on mount, so the page is as tall as it was left by the time
// the reader is put back where they were (just after the components mount).
//
// keepEntryState() (index.ts, once in the browser) installs the site's one
// wrapper around the history API, and the place keeping below.

/** The key under history.state that holds every page's UI state */
export const ENTRY_KEY = 'ir'
/** Under `ir`: the window width the entry's scrollPosition was taken at */
const PLACE = 'place'

type State = Record<string, unknown>

const isObject = (v: unknown): v is State => !!v && typeof v === 'object'

function currentState(): State {
  const s = typeof history === 'undefined' ? null : history.state
  return isObject(s) ? s : {}
}

function currentIr(): State {
  const ir = currentState()[ENTRY_KEY]
  return isObject(ir) ? ir : {}
}

/**
 * This entry's UI state for `name`, as last written. History state can come
 * from another version of the site, so callers check its shape.
 */
export function readEntry<T>(name: string): T | undefined {
  return currentIr()[name] as T | undefined
}

/**
 * Record `value` as this entry's UI state for `name`: a replaceState on the
 * current entry (never a push), keeping its URL, VitePress's keys and the
 * other names under `ir`.
 */
export function writeEntry<T>(name: string, value: T) {
  try {
    history.replaceState({ ...currentState(), [ENTRY_KEY]: { ...currentIr(), [name]: value } }, '')
  } catch {
    // a value the browser can't clone, or history blocked: the page still works, it just won't remember
  }
}

// ── The reader's place ──
// VitePress records where an entry was left (its scrollPosition) only as a
// link leaves the page, and scrolls back there on a client-side Back or
// Forward (0 or none: to the #hash target, or the top). Left any other way
// (by Back or Forward, an outline or #anchor jump, a reload, another site)
// the place was lost, and VitePress's first render of a document always
// starts at the top. So the theme keeps every entry's scrollPosition current
// itself, in VitePress's own terms:
// - as soon as a scroll ends (scrollend; where a browser lacks it, once the
//   page has rested for a moment), so a Back or Forward pressed straight
//   after finds it written: the entry has already changed by the time the
//   page hears of it. One write per scroll, as few as will do: browsers cap
//   how often a page may touch its history;
// - once the window has been resized (the same offset is somewhere else in
//   the new layout, and the place is only good at the width it was taken at);
// - as the document is put away (beforeunload, the last write Chromium keeps
//   across a reload; pagehide, for a link to another site) and as it is
//   hidden, which on a phone may be the last it hears before the tab is
//   discarded;
// - on the entry an in-page #anchor jump or a link leaves (the push wrapper).
// The very top is written as the smallest number above 0 (AT_TOP), which
// still scrolls to 0: VitePress takes a scrollPosition of 0 for "not known"
// and goes to the entry's #hash target instead, so an #anchor entry the
// reader left at the top came back at its anchor. A 0 that VitePress wrote
// itself still means what it did.
// And when a reload or a Back or Forward from another site loads the
// document afresh, it puts the reader back there itself (restorePlace),
// once the page has re-applied the entry's UI state. The browser's own
// restoration is off: it landed while the page still showed the server's
// render (strip, table, fleet and roster all closed), and VitePress's first
// scroll to the top undid it about half the time.

/** The original replaceState: the place is written without the wrapper's carrying */
let replaceRaw: History['replaceState'] | null = null

/** The scrollPosition of an entry left at the very top: "known, and 0", where VitePress reads 0 as "not known" */
const AT_TOP = Number.MIN_VALUE

/** The current entry with the reader's place on it: where the window is scrolled, and at what width */
function placed(state: unknown): State {
  const s = isObject(state) ? state : {}
  const ir = isObject(s[ENTRY_KEY]) ? (s[ENTRY_KEY] as State) : {}
  return { ...s, scrollPosition: Math.round(scrollY) || AT_TOP, [ENTRY_KEY]: { ...ir, [PLACE]: { w: innerWidth } } }
}

function recordPlace() {
  try {
    replaceRaw?.call(history, placed(history.state), '')
  } catch {} // history blocked, or the browser's cap on history calls reached: the page works on
}

// ── Putting the reader back on a fresh load ──
/** The place this document's first render goes back to (computed before anything else can write one); null: none */
let firstPlace: number | null = null
/** Until the first render's place is restored (or the reader moves first), nothing is recorded over it */
let restoring = false
/** Whether the document's first render is in (restorePlace has run) */
let rendered = false

/** How this document was reached: 'navigate' (a link, a typed address), 'reload' or 'back_forward' */
function navigationType(): string | undefined {
  try {
    return (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type
  } catch {
    return undefined
  }
}

function placeToRestore(): number | null {
  try {
    const nav = navigationType()
    if (nav !== 'reload' && nav !== 'back_forward') return null
    const y = currentState().scrollPosition
    const w = (currentIr()[PLACE] as { w?: unknown } | undefined)?.w
    // At another window width the page is laid out anew and the same offset lands elsewhere
    return typeof y === 'number' && y >= 0 && (w === undefined || w === innerWidth) ? Math.round(y) : null
  } catch {
    return null
  }
}

/**
 * Whether the page about to mount is brought back to a recorded place rather
 * than to its #hash target or the top: on the document's first render, the
 * place restorePlace() puts the reader back at; on a client-side Back or
 * Forward, the scrollPosition VitePress scrolls to (if it isn't its 0 for
 * "not known": the top, as the theme writes it, is AT_TOP). Pages that align
 * a #hash target or hold one in view as they open check this, and stand
 * aside.
 */
export function landsAtPlace(): boolean {
  if (!rendered) return restoring
  const y = currentState().scrollPosition
  return typeof y === 'number' && y > 0
}

/**
 * Layout.vue calls this once, as the document's first render mounts: on a
 * reload or a Back or Forward that loaded the document afresh, scroll back to
 * where the entry was left, after the page components have applied its UI
 * state (they do so on mount: a tick to render it, a frame to lay it out),
 * and again once the web fonts are in (Barlow sets tighter than the
 * metric-matched fallback faces), unless the reader has scrolled, tapped or
 * pressed a key meanwhile. This also undoes VitePress's own first scroll (to
 * the top, or to the #hash target).
 */
export function restorePlace() {
  rendered = true
  if (!restoring || firstPlace === null) return
  const y = firstPlace
  const moved = new AbortController()
  const done = () => {
    restoring = false
    moved.abort()
  }
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'])
    addEventListener(type, done, { once: true, passive: true, capture: true, signal: moved.signal })
  const place = () => {
    if (!moved.signal.aborted) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
  }
  nextTick(() => requestAnimationFrame(place))
  document.fonts.ready.then(() =>
    requestAnimationFrame(() => {
      place()
      done()
    })
  )
}

/**
 * Once, in the browser (index.ts): the site's one wrapper around the history
 * API, and the place keeping above.
 *
 * VitePress replaces the whole state object as it navigates ({ scrollPosition }
 * just before it pushes the next page, {} on an in-page #anchor jump), which
 * would drop `ir`. The wrapper carries it over:
 * - on every replacement that doesn't set it (the entry stays the same);
 * - on a push that stays on the same document (an outline or #anchor link),
 *   whose new entry shows the page just as it was. A push to another page
 *   starts that entry with nothing.
 * Before any push, it records the reader's place on the entry being left.
 */
export function keepEntryState() {
  const h = history as History & { __irKeep?: boolean }
  if (h.__irKeep) return
  const { replaceState: replace, pushState: push } = history
  replaceRaw = replace
  const carry = (state: unknown) => {
    const ir = currentState()[ENTRY_KEY]
    return ir !== undefined && isObject(state) && !(ENTRY_KEY in state) ? { ...state, [ENTRY_KEY]: ir } : state
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
    if (!restoring) recordPlace()
    return push.call(this, sameDocument(url) ? carry(state) : state, unused, url)
  }
  h.__irKeep = true

  // A new visit starts with nothing to restore. Chrome keeps the entry's
  // state when the reader opens the very address they are on again (typed,
  // or a link to it from another site), so clear it (config.ts's first-paint
  // script makes the same check).
  const s = currentState()
  if (navigationType() === 'navigate' && (ENTRY_KEY in s || 'scrollPosition' in s)) {
    try {
      replace.call(history, {}, '')
    } catch {}
  }

  // This load's place, read before VitePress's first scroll (or anything else) can be recorded over it
  firstPlace = placeToRestore()
  restoring = firstPlace !== null
  // The browser's restoration off, for this entry and every one the site makes from it
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  let resting: ReturnType<typeof setTimeout> | undefined
  /** The page the pending record is for: the location leaves it as soon as the router heads elsewhere */
  let at = ''
  const record = () => {
    clearTimeout(resting)
    if (!restoring && location.pathname === at) recordPlace()
  }
  const recordAtRest = () => {
    clearTimeout(resting)
    at = location.pathname
    resting = setTimeout(record, 400)
  }
  if ('onscrollend' in window) {
    // The scroll's own page: a scrollend that comes once the router has
    // moved on to another page is the old page's, and isn't written there
    addEventListener('scroll', () => (at = location.pathname), { passive: true })
    addEventListener('scrollend', record)
  } else addEventListener('scroll', recordAtRest, { passive: true })
  addEventListener('resize', recordAtRest)
  // Back or Forward: the entry is already another; what was pending belonged to the one left
  addEventListener('popstate', () => clearTimeout(resting))
  // A new #hash entry with no place yet (an in-page link, or a #hash the
  // browser made itself, typed or followed, which no push wrapper sees): it
  // gets one once the page settles, even if nothing scrolls
  addEventListener('hashchange', () => {
    if (typeof currentState().scrollPosition !== 'number') recordAtRest()
  })
  const leave = () => {
    at = location.pathname
    record()
  }
  // A reload or a navigation to another site: beforeunload, the last write
  // Chromium keeps across a reload (it drops one made in pagehide), and
  // pagehide for the browsers that skip beforeunload. Neither keeps the page
  // out of the back/forward cache, as an unload listener would.
  addEventListener('beforeunload', leave)
  addEventListener('pagehide', leave)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && leave())
}
