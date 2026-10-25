<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { GENDERS, type Agent, type Gender } from '../../data/parse'
import LedgerEntry from './LedgerEntry.vue'
import LedgerTallies from './LedgerTallies.vue'

// The ledger page (/ledger): roster cards with a gender filter, the selected
// agent's entry (kept in step with location.hash, so /ledger#tide deep-links)
// and the balance tallies. Everything is read from docs/rules/avatars.md.

type Filter = 'all' | Gender

const agents = data.agents
const rulesLink = withBase('/rules/avatars')

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

// SSR and hydration both start on the first agent; the hash is read on mount
const selectedSlug = ref(agents[0]?.slug ?? '')
const selected = computed(() => agents.find((a) => a.slug === selectedSlug.value) ?? agents[0])
const status = ref('')

const root = ref<HTMLElement>()
const entry = ref<HTMLElement>()

// Side by side, the entry sticks beside the roster only while all of it fits
// under the nav; taller, it stays at the head of its column and the page
// scrolls to it instead. SSR renders it static.
const sticky = ref(false)
const wide = () => matchMedia('(min-width: 960px)').matches
const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height')) || 64
function updateSticky() {
  const el = entry.value
  sticky.value = !!el && wide() && el.offsetHeight <= innerHeight - navHeight()
}

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

function writeHash(slug: string) {
  history.replaceState(history.state, '', `${location.pathname}${location.search}#${slug}`)
}

/**
 * Bring the entry into view after it changes. Sticky, it already is, unless
 * the end of the roster has pushed its head up under the nav. Side by side but
 * static, scroll only when its top is out of view; stacked below the roster,
 * always scroll to it.
 */
async function reveal(behavior: ScrollBehavior, focus: boolean) {
  await nextTick()
  updateSticky()
  await nextTick()
  const el = entry.value
  if (!el) return
  const top = el.getBoundingClientRect().top
  const nav = navHeight()
  if (sticky.value) {
    if (top < nav - 1) window.scrollBy({ top: top - nav, behavior })
    return
  }
  if (wide() && top >= nav && top < innerHeight / 2) return
  scrollToEl(el, 'start', behavior)
  if (focus) el.querySelector<HTMLElement>('#ir-ledger-name')?.focus({ preventScroll: true })
}

function choose(slug: string) {
  selectedSlug.value = slug
  writeHash(slug)
  status.value = `Showing ${selected.value.name}'s ledger entry.`
  reveal(motion(), true)
}

function setFilter(key: Filter) {
  filter.value = key
  const list = roster.value
  const f = filters.find((x) => x.key === key)!
  let msg = `Filter: ${f.label}, ${plural(list.length)}.`
  if (list.length && !list.some((a) => a.slug === selectedSlug.value)) {
    selectedSlug.value = list[0].slug
    writeHash(list[0].slug)
    msg += ` Showing ${list[0].name}'s ledger entry.`
  }
  status.value = msg
}

function syncFromHash(behavior: ScrollBehavior) {
  const a = agentFromHash()
  if (!a) return
  if (filter.value !== 'all' && a.gender !== filter.value) filter.value = 'all'
  selectedSlug.value = a.slug
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

const onHashChange = () => syncFromHash(motion())
let ro: ResizeObserver | undefined

onMounted(() => {
  updateSticky()
  ro = new ResizeObserver(updateSticky)
  if (entry.value) ro.observe(entry.value)
  window.addEventListener('resize', updateSticky)
  syncFromHash('auto')
  window.addEventListener('hashchange', onHashChange)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', updateSticky)
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
                <span class="ir-ledger-card-img" aria-hidden="true">
                  <Portrait :agent="a" :framed="false" sizes="(max-width: 639px) 45vw, (max-width: 959px) 30vw, 190px" />
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
          :class="{ 'is-sticky': sticky }"
          :aria-label="`Ledger entry: ${selected.name}`"
        >
          <LedgerEntry :agent="selected" @back="backToRoster" />
        </section>
      </div>
      <p v-else class="ir-ledger-empty">The ledger has no rows yet.</p>

      <LedgerTallies />

      <p class="ir-sr" role="status">{{ status }}</p>
    </main>
  </div>
</template>
