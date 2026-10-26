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
import { landsAtPlace, readEntry, writeEntry } from '../entry-state'
import { RULES, ruleLink, sectionHref } from './links'

// The ledger page (/ledger): roster cards with a gender filter, the selected
// agent's entry (kept in step with location.hash, so /ledger#tide deep-links)
// and the balance tallies. Everything is read from docs/rules/avatars.md.

type Filter = 'all' | Gender
/** What the page shows: the filter and the selected agent */
interface View {
  filter: Filter
  slug: string
}

const agents = data.agents
const rulesLink = withBase('/rules/avatars')
const invented = ruleLink(...RULES.invented)
// Every row in one table on the rule page, which needs no JavaScript (a native <details>)
const ledgerTable = sectionHref(/^Ledger/i)

const genderName = (a: Agent) => GENDERS.find((g) => g.key === a.gender)?.label ?? a.genderLabel
const heritageOf = (a: Agent) => a.heritage || a.depicted
const pendingNote = (a: Agent) =>
  a.portrait ? '' : a.portraitStatus === 'mismatch' ? 'portrait pending ledger update' : 'no portrait yet'
const plural = (n: number) => (n === 1 ? '1 agent' : `${n} agents`)

// The card portrait's width in each layout of ledger.css: the viewport less
// the gutters (24px, 32px from 768px: style.css --ir-gutter), the gaps
// between cards and the cards' own borders, over the columns (three up to
// 719px, four from 720px while stacked, then three and four beside the
// entry; the page stops growing at 1280px). Each screen then gets the
// smallest file that is sharp on it, whatever its pixel density.
const CARD_SIZES = [
  '(max-width: 639px) calc((100vw - 74px) / 3)',
  '(max-width: 719px) calc((100vw - 94px) / 3)',
  '(max-width: 767px) calc((100vw - 116px) / 4)',
  '(max-width: 959px) calc((100vw - 132px) / 4)',
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
// Paper has no filter control (ledger.css), so a filtered printout says so
const filterLabel = computed(() => filters.find((f) => f.key === filter.value)?.label ?? '')

// The server renders the cards out of the tab order and marked unavailable:
// without JavaScript choosing one does nothing (ledger.css hides the filter
// and says so). They come alive as the page mounts.
const live = ref(false)

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
// entry-state.ts), always as last shown; the selection is in the hash too.
// The theme keeps where the reader was as the entry's scrollPosition and
// puts them back there (entry-state.ts): VitePress on a Back or Forward
// within the site, between two of the ledger's #entries as well as from
// another page, and the theme itself on a reload or a Back from another
// site. So all of them come back to the same roster at the same place.
const ENTRY = 'ledger'
const isFilter = (v: unknown): v is Filter => filters.some((f) => f.key === v)

function savedState(): View | null {
  const s = readEntry<Partial<View>>(ENTRY)
  return s && isFilter(s.filter) && typeof s.slug === 'string' && agents.some((a) => a.slug === s.slug)
    ? { filter: s.filter, slug: s.slug }
    : null
}

/** Where VitePress will scroll this entry to on Back or Forward, if it has been here */
const leftAt = (): number | undefined => {
  const y = history.state?.scrollPosition
  return typeof y === 'number' ? y : undefined
}

/** Record the view on the current entry; with `hash`, also point the URL at the selection */
function persist(hash = false) {
  if (hash) {
    try {
      history.replaceState(history.state, '', `${location.pathname}${location.search}#${selectedSlug.value}`)
    } catch {} // history blocked, or the browser's cap on history calls reached: the page works on
  }
  writeEntry<View>(ENTRY, view())
}

/** The ledger's path, from mount; the location leaves it as soon as the router heads for another page */
let path = ''
const stillHere = () => location.pathname === path

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
 * Bring the entry into view after it changes and, with `focus`, move focus to
 * its name (tabindex -1), so the next Tab goes on through the entry and the
 * keys scroll it. Side by side the entry is sticky, so it already is in
 * view, unless the end of the roster has pushed its head up under the nav;
 * it only scrolls back to its own top, where the name is. Stacked below the
 * roster, scroll to its top: with focus on the name (now or already), far
 * enough down on a short phone that it shows whole with its focus ring (the
 * portrait and the expression switch come first).
 */
async function reveal(behavior: ScrollBehavior, focus: boolean) {
  await nextTick()
  const el = entry.value
  if (!el) return
  const nav = navHeight()
  const name = el.querySelector<HTMLElement>('#ir-ledger-name')
  if (wide()) {
    el.scrollTop = 0
    const top = el.getBoundingClientRect().top
    if (top < nav - 1) window.scrollBy({ top: top - nav, behavior })
  } else {
    let by = el.getBoundingClientRect().top - nav
    if (name && (focus || document.activeElement === name))
      by = Math.max(by, name.getBoundingClientRect().bottom + RING - innerHeight)
    window.scrollBy({ top: by, behavior: Math.abs(by) > innerHeight * 2 ? 'auto' : behavior })
  }
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
 * Whether the pending reveal also takes focus to the entry's name: the view
 * came from a #hash naming someone (a link from the landing or the rule
 * page, a typed or outside link, a new #hash on this page), so the reader
 * starts at the entry they asked for. A Back, Forward or reload that puts
 * the page back as it was leaves focus alone.
 */
let toName = false
function revealWhenSettled(behavior: ScrollBehavior) {
  settled(() => {
    const focus = toName
    toName = false
    reveal(behavior, focus)
  })
}

// ── Actions ──
/**
 * A card chosen. Stacked, the entry is far below, so focus follows it there.
 * Side by side it is in view beside the card: a click leaves focus on the
 * card, while Enter or Space (a click with no pointer: detail 0) takes it to
 * the entry, which is otherwise the rest of the roster's Tabs away and only
 * scrolls by key with focus inside it. "Back to the roster" returns to the
 * card from there.
 */
function choose(slug: string, e?: MouseEvent) {
  pending++
  toName = false
  selectedSlug.value = slug
  persist(true)
  announce(`Showing ${selected.value.name}'s ledger entry.`)
  reveal(motion(), !wide() || !e || e.detail === 0)
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
 * brings its entry into view. A #hash that names no agent (the skip link's
 * #VPContent, say) is someone else's: its entry carries the view over as it
 * was, so unless that view differs, the page stays where the jump put it.
 */
function followHistory() {
  if (!stillHere()) return
  const v = wanted()
  if (!v) return
  if (!agentFromHash() && v.slug === selectedSlug.value && v.filter === filter.value) return
  const y = leftAt()
  const text = describe(view(), v)
  // A new #hash naming another agent; popstate and hashchange both come
  // here, and either may be the one that sees the change
  if (y === undefined && v.slug !== selectedSlug.value) toName = true
  show(v)
  persist()
  if (text) announce(text)
  if (y === undefined) revealWhenSettled(motion())
}

onMounted(() => {
  live.value = true
  path = location.pathname
  const first = mounts++ === 0 && path.replace(/\.html$/, '') === loadedAt
  const remount = !first && last.path === path
  const saved = savedState()
  const v = wanted()
  if (v) show(v)
  // The entry the address names is up: let it show (ledger.css, ledger.md)
  nextTick(() => document.documentElement.classList.remove('ir-ledger-pending'))
  const restored = !!saved && !!v && v.slug === saved.slug && v.filter === saved.filter
  persist()
  // Where VitePress scrolls on an in-page Back or Forward, if it knows
  const y = leftAt()
  if (remount) {
    // An in-page Back or Forward that VitePress answered by putting up the
    // page anew. The status line carried over as it was (`status` above); say
    // what changed if the old page didn't get to. VitePress scrolls to where
    // the entry was left, or to the top if it doesn't know: then bring the
    // entry back into view.
    const text = describe(last as View, view())
    if (text) setTimeout(() => announce(text), 100)
    if (y === undefined) settled(() => reveal(motion(), false))
  } else if (first && restored) {
    // A reload or a tab restore (a new visit has no saved state): the theme
    // puts the reader back where they were (entry-state.ts), unless the
    // window has changed width since, which lays the page out anew. Then show
    // the selected entry, if the address names it, or else the top.
    if (!landsAtPlace() && agentFromHash()?.slug === selectedSlug.value) settled(land)
  } else if (v && !restored) {
    // a link to someone's entry: show it, and start the reader there
    toName = true
    revealWhenSettled('auto')
  }
  // otherwise Back or Forward from another page: VitePress restores the
  // scroll position just after this render, which already has the saved view
  window.addEventListener('popstate', followHistory)
  window.addEventListener('hashchange', followHistory)
})
onBeforeUnmount(() => {
  Object.assign(last, { path: location.pathname, ...view() })
  pending++
  toName = false
  window.removeEventListener('popstate', followHistory)
  window.removeEventListener('hashchange', followHistory)
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
          <!-- Shown only without JavaScript (ledger.css) -->
          <p class="ir-ledger-nojs">
            Choosing an agent needs JavaScript, so this page shows {{ agents[0].name }}'s entry only. Every
            agent's row is in the <a :href="ledgerTable">ledger table on the rule page</a>.
          </p>
          <!-- Shown only in print, where the filter control isn't (ledger.css) -->
          <p v-if="filter !== 'all'" class="ir-ledger-printnote">
            Filtered to {{ filterLabel }}: {{ roster.length }} of {{ plural(agents.length) }}.
          </p>
          <ul v-if="roster.length" class="ir-ledger-grid" role="list">
            <li v-for="a in roster" :key="a.slug">
              <button
                type="button"
                class="ir-ledger-card"
                :data-slug="a.slug"
                :aria-pressed="a.slug === selectedSlug"
                aria-controls="ir-ledger-entry"
                :tabindex="live ? undefined : -1"
                :aria-disabled="live ? undefined : 'true'"
                @click="choose(a.slug, $event)"
              >
                <!-- From about 80 to 240px wide: CARD_SIZES gives the width in each layout -->
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

      <p class="ir-sr" role="status">{{ status }}</p>
    </main>
    <!-- The page foot comes after this (Layout.vue, SiteFooter.vue) -->
  </div>
</template>
