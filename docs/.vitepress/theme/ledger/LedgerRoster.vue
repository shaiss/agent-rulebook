<script lang="ts">
// Per document, shared by every mount of the ledger in it. VitePress mounts
// the page afresh on each visit, and once more on the first Back or Forward
// between two of its own #entries (it swaps the page's hydration-only build
// for the full one), so a mount checks which of these it is.

/** Where this document was loaded: a reload or a tab restore mounts the ledger there first */
const loadedAt = typeof location === 'undefined' ? '' : location.pathname.replace(/\.html$/, '')
let mounts = 0
/** What the last ledger on screen showed and said, and the path it went at */
const last = { path: '', filter: '', slug: '', status: '', at: 0 }
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { GENDERS, type Agent, type Gender } from '../../data/parse'
import LedgerEntry from './LedgerEntry.vue'
import LedgerTallies from './LedgerTallies.vue'
import SiteFooter from '../SiteFooter.vue'
import { readEntry, writeEntry } from '../entry-state'
import { RULES, ruleLink } from './links'

// The ledger page (/ledger): roster cards with a gender filter, the selected
// agent's entry (kept in step with location.hash, so /ledger#tide deep-links)
// and the balance tallies. Everything is read from docs/rules/avatars.md.

type Filter = 'all' | Gender
/** What the page shows: the filter and the selected agent */
interface View {
  filter: Filter
  slug: string
}
/** A history entry's view, with where the page was last scrolled and how wide the window was */
interface Saved extends View {
  y?: number
  w?: number
}
type Place = Pick<Saved, 'y' | 'w'>

const agents = data.agents
const rulesLink = withBase('/rules/avatars')
const invented = ruleLink(...RULES.invented)

const genderName = (a: Agent) => GENDERS.find((g) => g.key === a.gender)?.label ?? a.genderLabel
const heritageOf = (a: Agent) => a.heritage || a.depicted
const pendingNote = (a: Agent) =>
  a.portrait ? '' : a.portraitStatus === 'mismatch' ? 'portrait pending ledger update' : 'no portrait yet'
const plural = (n: number) => (n === 1 ? '1 agent' : `${n} agents`)

// The card portrait's width in each layout of ledger.css: the viewport less
// the gutters, the gaps between cards and the cards' own borders, over the
// columns (the page stops growing at 1280px). Each screen then gets the
// smallest file that is sharp on it, whatever its pixel density.
const CARD_SIZES = [
  '(max-width: 639px) calc((100vw - 58px) / 3)',
  '(max-width: 768px) calc((100vw - 78px) / 3)',
  '(max-width: 959px) calc((100vw - 126px) / 3)',
  '(max-width: 1179px) calc((100vw - 467px) / 3)',
  '(max-width: 1279px) calc((100vw - 549px) / 4)',
  '183px'
].join(', ')

const filters: { key: Filter; label: string; n: number }[] = [
  { key: 'all', label: 'All', n: agents.length },
  ...GENDERS.map((g) => ({ key: g.key, label: g.label, n: agents.filter((a) => a.gender === g.key).length }))
]
const filter = ref<Filter>('all')
const roster = computed(() => (filter.value === 'all' ? agents : agents.filter((a) => a.gender === filter.value)))
const filterMsg = (key: Filter) => {
  const f = filters.find((x) => x.key === key)!
  return `Filter: ${f.label}, ${plural(f.n)}.`
}

// SSR and hydration both start on the first agent; the hash is read on mount
const selectedSlug = ref(agents[0]?.slug ?? '')
const selected = computed(() => agents.find((a) => a.slug === selectedSlug.value) ?? agents[0])
// Put up anew on an in-page Back or Forward (onMounted), the page keeps its
// status line as it was: the reader has just heard it, and won't again
const status = ref(
  typeof location !== 'undefined' && last.path === location.pathname && Date.now() - last.at < 2000 ? last.status : ''
)

const root = ref<HTMLElement>()
const entry = ref<HTMLElement>()

// Side by side (960px and up) the entry is always sticky beside the roster,
// at most a viewport tall and scrolling inside when longer (ledger.css), so
// choosing a card never moves the page. Stacked, it follows the roster.
const wide = () => matchMedia('(min-width: 960px)').matches
const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height')) || 64

const motion = (): ScrollBehavior =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/** Smooth for short hops only; across a long roster, jump */
function scrollToEl(el: HTMLElement, block: ScrollLogicalPosition, behavior: ScrollBehavior) {
  const far = Math.abs(el.getBoundingClientRect().top) > innerHeight * 2
  el.scrollIntoView({ behavior: far ? 'auto' : behavior, block })
}

function agentFromHash() {
  let slug = ''
  try {
    slug = decodeURIComponent(location.hash.slice(1)).toLowerCase()
  } catch {} // malformed escape: not one of ours
  return slug ? agents.find((a) => a.slug === slug) : undefined
}

// ── The view ──
const view = (): View => ({ filter: filter.value, slug: selectedSlug.value })
function show(v: View) {
  filter.value = v.filter
  selectedSlug.value = v.slug
}

/** What changed from one view to another, as the status line says it */
function describe(from: View, to: View) {
  const msgs: string[] = []
  if (from.filter !== to.filter) msgs.push(filterMsg(to.filter))
  const a = agents.find((x) => x.slug === to.slug)
  if (a && (from.slug !== to.slug || msgs.length)) msgs.push(`Showing ${a.name}'s ledger entry.`)
  return msgs.join(' ')
}

function announce(text: string) {
  status.value = text
  Object.assign(last, { status: text, at: Date.now() })
}

// A new selection opens at its own top: side by side the entry scrolls on its
// own, and would otherwise keep the last one's scroll (a filter can move the
// selection while the reader is down the entry)
watch(
  selectedSlug,
  () => {
    if (entry.value) entry.value.scrollTop = 0
  },
  { flush: 'post' }
)

// ── History ──
// The view is this history entry's UI state (history.state.ir.ledger,
// entry-state.ts), always as last shown, with the scroll position as last
// left; the selection is in the hash too. So Back, Forward and a reload
// come back to the same roster at the same place. The position is also kept
// as the entry's scrollPosition, VitePress's own record of where an entry
// was left: it scrolls there on every Back and Forward, between two of the
// ledger's #entries as well as from another page.
const ENTRY = 'ledger'
const isFilter = (v: unknown): v is Filter => filters.some((f) => f.key === v)

function savedState(): Saved | null {
  const s = readEntry<Partial<Saved>>(ENTRY)
  return s && isFilter(s.filter) && agents.some((a) => a.slug === s.slug) ? (s as Saved) : null
}

const currentPlace = (): Place => ({ y: Math.round(scrollY), w: innerWidth })
/** Where VitePress will scroll this entry to on Back or Forward, if it has been here */
const leftAt = (): number | undefined => {
  const y = history.state?.scrollPosition
  return typeof y === 'number' ? y : undefined
}

/** Record the view, and the scroll position, on the current entry; with `hash`, also point the URL at the selection */
function persist(hash = false, place: Place = currentPlace()) {
  try {
    const url = hash ? `${location.pathname}${location.search}#${selectedSlug.value}` : undefined
    history.replaceState({ ...history.state, scrollPosition: place.y }, '', url)
  } catch {} // history blocked, or the browser's cap on history calls reached: the page works on
  writeEntry<Saved>(ENTRY, { ...view(), ...place })
}

// The scroll position is recorded once the page comes to rest (as few
// writes as will do: browsers cap how often a page may touch its history),
// as a reload or a navigation away begins, and as the page is hidden, which
// on a phone may be the last it hears before the tab is discarded
let resting: ReturnType<typeof setTimeout> | undefined
/** The ledger's path, from mount; the location leaves it as soon as the router heads for another page */
let path = ''
const stillHere = () => location.pathname === path
const onScroll = () => {
  clearTimeout(resting)
  resting = setTimeout(() => stillHere() && persist(), 400)
}
const onLeave = () => {
  clearTimeout(resting)
  if (stillHere()) persist()
}
const onVisibility = () => document.visibilityState === 'hidden' && onLeave()

/**
 * The view the current entry calls for: the one saved on it, unless its hash
 * names someone else (a link or a typed #hash), in which case that agent,
 * under the current filter if it shows them. Null when neither says.
 */
function wanted(): View | null {
  const a = agentFromHash()
  const s = savedState()
  if (s && (!a || a.slug === s.slug)) return { filter: s.filter, slug: s.slug }
  if (!a) return null
  return { filter: filter.value === 'all' || filter.value === a.gender ? filter.value : 'all', slug: a.slug }
}

// ── Scrolling ──
// The name's focus ring (2px, 4px out) and some air below it
const RING = 16

/**
 * Bring the entry into view after it changes. Side by side it is sticky, so
 * it already is, unless the end of the roster has pushed its head up under
 * the nav; it only scrolls back to its own top. Stacked below the roster,
 * scroll to its top and, with `focus`, move focus to its name: far enough
 * down, on a short phone, that the name shows whole with its focus ring
 * (the portrait and the expression switch come first).
 */
async function reveal(behavior: ScrollBehavior, focus: boolean) {
  await nextTick()
  const el = entry.value
  if (!el) return
  const nav = navHeight()
  if (wide()) {
    el.scrollTop = 0
    const top = el.getBoundingClientRect().top
    if (top < nav - 1) window.scrollBy({ top: top - nav, behavior })
    return
  }
  const name = el.querySelector<HTMLElement>('#ir-ledger-name')
  let by = el.getBoundingClientRect().top - nav
  if (focus && name) by = Math.max(by, name.getBoundingClientRect().bottom + RING - innerHeight)
  window.scrollBy({ top: by, behavior: Math.abs(by) > innerHeight * 2 ? 'auto' : behavior })
  if (focus) name?.focus({ preventScroll: true })
}

/** The selected card in view (side by side the entry is beside it), then the entry */
function land() {
  if (wide()) root.value?.querySelector<HTMLElement>(`[data-slug="${selectedSlug.value}"]`)?.scrollIntoView({ block: 'center' })
  reveal('auto', false)
}

/**
 * Run `fn` once web fonts have settled the roster's height, and after the
 * router's own scroll on navigation. A later call, or a choice of the
 * reader's, supersedes it.
 */
let pending = 0
function settled(fn: () => void) {
  const t = ++pending
  document.fonts.ready.then(() => requestAnimationFrame(() => t === pending && fn()))
}

/**
 * A reload or a tab restore (a navigation of type 'reload' or 'back_forward';
 * a new one has no saved state): put the reader back where they were, at the
 * saved scroll position if the window is as wide as it was, or else at the
 * selected entry. The browser's own restoration can't be relied on here, so
 * the page turns it off (onMounted): it lands while the page still shows the
 * server-rendered roster, before the saved filter and selection re-render
 * it, and is often lost to that or to the router's scroll to the top.
 * Without a saved position or a chosen entry, the top of the page is right.
 */
function restorePlace(at: Place) {
  const y = typeof at.y === 'number' && at.w === innerWidth ? at.y : null
  if (y === null && agentFromHash()?.slug !== selectedSlug.value) return
  let moved = false
  const stop = () => {
    moved = true
  }
  const events = ['wheel', 'touchstart', 'keydown', 'mousedown']
  for (const t of events) addEventListener(t, stop, { passive: true, once: true })
  const place = () => {
    if (moved) return
    if (y === null) land()
    else window.scrollTo({ top: y, behavior: 'auto' })
  }
  // as soon as the restored roster is laid out (in the metric-matched fallback
  // faces if Barlow is still on its way), and again once the fonts have settled
  nextTick(() => requestAnimationFrame(place))
  document.fonts.ready.then(() =>
    requestAnimationFrame(() => {
      place()
      for (const t of events) removeEventListener(t, stop)
    })
  )
}

// ── Actions ──
function choose(slug: string) {
  pending++
  selectedSlug.value = slug
  persist(true)
  announce(`Showing ${selected.value.name}'s ledger entry.`)
  reveal(motion(), true)
}

function setFilter(key: Filter) {
  filter.value = key
  const list = roster.value
  let msg = filterMsg(key)
  const moved = list.length > 0 && !list.some((a) => a.slug === selectedSlug.value)
  if (moved) {
    selectedSlug.value = list[0].slug
    msg += ` Showing ${list[0].name}'s ledger entry.`
  }
  persist(moved)
  announce(msg)
}

function backToRoster() {
  const card = root.value?.querySelector<HTMLElement>(`[data-slug="${selectedSlug.value}"]`)
  if (!card) return
  scrollToEl(card, 'center', motion())
  card.focus({ preventScroll: true })
}

/**
 * Back, Forward or a new #hash within the page (popstate and hashchange, so a
 * step between two entries with the same hash counts too): show the view
 * that entry calls for, record it there, and say what changed. Back or
 * Forward, VitePress then scrolls to where the entry was left; a new #hash
 * brings its entry into view.
 */
function followHistory() {
  if (!stillHere()) return
  const v = wanted()
  if (!v) return
  const y = leftAt()
  const text = describe(view(), v)
  show(v)
  persist(false, y === undefined ? currentPlace() : { y, w: innerWidth })
  if (text) announce(text)
  if (y === undefined) settled(() => reveal(motion(), false))
}

onMounted(() => {
  path = location.pathname
  const first = mounts++ === 0 && path.replace(/\.html$/, '') === loadedAt
  const remount = !first && last.path === path
  const saved = savedState()
  const v = wanted()
  if (v) show(v)
  const restored = !!saved && !!v && v.slug === saved.slug && v.filter === saved.filter
  // Where the entry was left: VitePress's record (which it also updates as
  // the reader follows a link away) or the page's own
  const y = leftAt()
  const reopened = first && restored && saved ? { y: y ?? saved.y, w: saved.w } : null
  // A reload keeps that place until the reader moves on from it; Back or
  // Forward, VitePress is about to scroll there; a new visit starts at the top
  persist(false, reopened ?? { y: first ? Math.round(scrollY) : (y ?? 0), w: innerWidth })
  // This page puts the reader back itself (restorePlace; VitePress on Back
  // and Forward), on every entry it makes or comes back to
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  if (remount) {
    // An in-page Back or Forward that VitePress answered by putting up the
    // page anew. The status line carried over as it was (`status` above); say
    // what changed if the old page didn't get to. VitePress scrolls to where
    // the entry was left, or to the top if it doesn't know: then bring the
    // entry back into view.
    const text = describe(last as View, view())
    if (text) setTimeout(() => announce(text), 100)
    if (y === undefined) settled(() => reveal(motion(), false))
  } else if (reopened) {
    restorePlace(reopened)
  } else if (v && !restored) {
    // a link to someone's entry
    settled(() => reveal('auto', false))
  }
  // otherwise Back or Forward from another page: VitePress restores the
  // scroll position just after this render, which already has the saved view
  window.addEventListener('popstate', followHistory)
  window.addEventListener('hashchange', followHistory)
  window.addEventListener('scroll', onScroll, { passive: true })
  // (never prompts: only a listener that cancels the event or sets returnValue does)
  window.addEventListener('beforeunload', onLeave)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  Object.assign(last, { path: location.pathname, ...view() })
  pending++
  clearTimeout(resting)
  // the next page's entry (already current) restores as browsers do
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto'
  window.removeEventListener('popstate', followHistory)
  window.removeEventListener('hashchange', followHistory)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('beforeunload', onLeave)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div ref="root" class="ir-ledger">
    <main class="ir-ledger-main">
      <header class="ir-ledger-head">
        <div class="ir-ledger-head-copy">
          <nav class="ir-ledger-crumbs" aria-label="Breadcrumb">
            <ol>
              <li><a :href="rulesLink">Avatars</a></li>
              <li><span aria-current="page">Ledger</span></li>
            </ol>
          </nav>
          <h1 class="ir-ledger-title">Live portraits</h1>
          <p class="ir-ledger-sub">
            {{ agents.length }} agents. Every new portrait is checked against this ledger before it is set.
          </p>
          <p class="ir-ledger-ai">
            The portraits are AI-generated images of invented people, never real ones
            (<a :href="invented.href">rule {{ invented.label }}</a>).
          </p>
        </div>
        <div class="ir-ledger-seg" role="group" aria-label="Filter by gender presentation">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            class="ir-ledger-seg-btn"
            :aria-pressed="filter === f.key"
            @click="setFilter(f.key)"
          >
            {{ f.label }}<span class="ir-ledger-seg-n"><span class="ir-sr">,</span> {{ f.n }}</span>
          </button>
        </div>
      </header>

      <div v-if="selected" class="ir-ledger-body">
        <section class="ir-ledger-roster" aria-labelledby="ir-ledger-roster-title">
          <h2 id="ir-ledger-roster-title" class="ir-sr">Roster</h2>
          <ul v-if="roster.length" class="ir-ledger-grid" role="list">
            <li v-for="a in roster" :key="a.slug">
              <button
                type="button"
                class="ir-ledger-card"
                :data-slug="a.slug"
                :aria-pressed="a.slug === selectedSlug"
                aria-controls="ir-ledger-entry"
                @click="choose(a.slug)"
              >
                <!-- From 87 to 278px wide: CARD_SIZES gives the width in each layout -->
                <span class="ir-ledger-card-img" aria-hidden="true">
                  <Portrait :agent="a" :framed="false" :sizes="CARD_SIZES" />
                </span>
                <span class="ir-ledger-card-text">
                  <span class="ir-ledger-card-name">{{ a.name }}</span>
                  <span class="ir-ledger-tags">
                    <span class="ir-tag ir-tag-accent">{{ genderName(a) }}</span>
                    <span class="ir-tag ir-tag-neutral">{{ a.age ?? a.ageLabel }}</span>
                  </span>
                  <span class="ir-ledger-card-heritage">{{ heritageOf(a) }}</span>
                  <span v-if="!a.portrait" class="ir-sr">, {{ pendingNote(a) }}</span>
                </span>
              </button>
            </li>
          </ul>
          <p v-else class="ir-ledger-empty">No agent in the ledger is in this group yet.</p>
        </section>

        <section
          id="ir-ledger-entry"
          ref="entry"
          class="ir-ledger-entry"
          :aria-label="`Ledger entry: ${selected.name}`"
        >
          <LedgerEntry :agent="selected" @back="backToRoster" />
        </section>
      </div>
      <p v-else class="ir-ledger-empty">The ledger has no rows yet.</p>

      <LedgerTallies />

      <SiteFooter />

      <p class="ir-sr" role="status">{{ status }}</p>
    </main>
  </div>
</template>
