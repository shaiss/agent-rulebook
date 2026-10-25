<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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

const agents = data.agents
const rulesLink = withBase('/rules/avatars')
const invented = ruleLink(...RULES.invented)

const genderName = (a: Agent) => GENDERS.find((g) => g.key === a.gender)?.label ?? a.genderLabel
const heritageOf = (a: Agent) => a.heritage || a.depicted
const pendingNote = (a: Agent) =>
  a.portrait ? '' : a.portraitStatus === 'mismatch' ? 'portrait pending ledger update' : 'no portrait yet'
const plural = (n: number) => (n === 1 ? '1 agent' : `${n} agents`)

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
const status = ref('')

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

// ── History ──
// The filter and the selection are this history entry's UI state
// (history.state.ir.ledger, entry-state.ts), and the selection is in the hash
// too, so Back to /ledger, or a reload, comes back to the same roster before
// the scroll position is restored.
const ENTRY = 'ledger'
interface Saved {
  filter: Filter
  slug: string
}
const isFilter = (v: unknown): v is Filter => filters.some((f) => f.key === v)

function savedState(): Saved | null {
  const s = readEntry<Partial<Saved>>(ENTRY)
  return s && isFilter(s.filter) && agents.some((a) => a.slug === s.slug) ? (s as Saved) : null
}

/** Record the filter and selection on the current entry; with `hash`, also point the URL at the selection */
function persist(hash = false) {
  if (hash) history.replaceState(history.state, '', `${location.pathname}${location.search}#${selectedSlug.value}`)
  writeEntry<Saved>(ENTRY, { filter: filter.value, slug: selectedSlug.value })
}

/**
 * Bring the entry into view after it changes. Side by side it is sticky, so
 * it already is, unless the end of the roster has pushed its head up under
 * the nav; it only scrolls back to its own top. Stacked below the roster,
 * scroll to it and move focus to its name.
 */
async function reveal(behavior: ScrollBehavior, focus: boolean) {
  await nextTick()
  const el = entry.value
  if (!el) return
  if (wide()) {
    el.scrollTop = 0
    const top = el.getBoundingClientRect().top
    const nav = navHeight()
    if (top < nav - 1) window.scrollBy({ top: top - nav, behavior })
    return
  }
  scrollToEl(el, 'start', behavior)
  if (focus) el.querySelector<HTMLElement>('#ir-ledger-name')?.focus({ preventScroll: true })
}

function choose(slug: string) {
  selectedSlug.value = slug
  persist(true)
  status.value = `Showing ${selected.value.name}'s ledger entry.`
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
  status.value = msg
}

/** Follow the hash (deep link, or a hash change); announces what changed */
function syncFromHash(behavior: ScrollBehavior, announce: boolean) {
  const a = agentFromHash()
  if (!a) return
  const msgs: string[] = []
  if (filter.value !== 'all' && a.gender !== filter.value) {
    filter.value = 'all'
    msgs.push(filterMsg('all'))
  }
  if (a.slug !== selectedSlug.value || msgs.length) msgs.push(`Showing ${a.name}'s ledger entry.`)
  selectedSlug.value = a.slug
  persist()
  if (announce && msgs.length) status.value = msgs.join(' ')
  // once web fonts have settled the roster's height, and after the router's
  // own scroll-to-top on navigation
  document.fonts.ready.then(() => requestAnimationFrame(() => reveal(behavior, false)))
}

function backToRoster() {
  const card = root.value?.querySelector<HTMLElement>(`[data-slug="${selectedSlug.value}"]`)
  if (!card) return
  scrollToEl(card, 'center', motion())
  card.focus({ preventScroll: true })
}

const onHashChange = () => syncFromHash(motion(), true)

onMounted(() => {
  const saved = savedState()
  const fromHash = agentFromHash()
  if (saved && (!fromHash || fromHash.slug === saved.slug)) {
    // Back, Forward or reload: put the roster back as it was; the router (or
    // the browser) restores the scroll position after this render
    filter.value = saved.filter
    selectedSlug.value = saved.slug
  } else {
    syncFromHash('auto', false)
  }
  window.addEventListener('hashchange', onHashChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange)
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
                <!-- Cards are 100-280px wide: no device needs more than the 480px file -->
                <span class="ir-ledger-card-img" aria-hidden="true">
                  <Portrait :agent="a" :framed="false" sizes="(max-width: 639px) 31vw, 240px" />
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
