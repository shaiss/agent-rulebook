<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../data/rulebook.data'
import { balance, AGE_BANDS, type Agent, type Rule } from '../data/parse'
import { readEntry, writeEntry } from './entry-state'

// Everything below is read at build time from docs/rules/avatars.md (see
// data/parse.ts), so the landing page follows the rulebook without edits.

const rulesLink = withBase('/rules/avatars')
const ledgerLink = withBase('/ledger')
const repoLink = 'https://github.com/shaiss/agent-rulebook'
const ruleLink = (n: number) => withBase(`/rules/avatars#rule-${n}`)
const agentLink = (a: Agent) => withBase(`/ledger#${a.slug}`)

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const pad = (n: number) => String(n).padStart(2, '0')

const { agents, rules, principle, rollout, updatedDate, hasHeritageColumn } = data
const { matrix, open, ungrouped, genderTally, ageTally } = balance(agents)

const draftCount = rules.filter((r) => r.status === 'draft').length
const lockedCount = rules.filter((r) => r.status === 'locked').length

const stats = [
  { n: agents.length, label: plural(agents.length, 'face in the ledger', 'faces in the ledger') },
  { n: rules.length, label: plural(rules.length, 'rule', 'rules') },
  draftCount || !lockedCount
    ? { n: draftCount, label: plural(draftCount, 'draft in review', 'drafts in review') }
    : { n: lockedCount, label: plural(lockedCount, 'locked rule', 'locked rules') },
  { n: open.length, label: plural(open.length, 'open gender × age cell', 'open gender × age cells') }
]

const ruleCount = [
  `${rules.length} ${plural(rules.length, 'rule', 'rules')}`,
  draftCount && `${draftCount} ${plural(draftCount, 'draft', 'drafts')}`,
  lockedCount && `${lockedCount} locked`
]
  .filter(Boolean)
  .join(' · ')

// ── Rule card text ──
// A card shows the rule's lead (from parse.ts) as its title and the first
// sentence of the rest as its body.

const BODY_MAX = 170

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function firstSentence(text: string) {
  const end = /[.!?…]["”’)]?(?=\s+["“(]?[A-Z0-9])/.exec(text)
  return (end ? text.slice(0, end.index + end[0].length) : text).trim()
}

function clip(text: string, max: number) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const clause = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '))
  if (clause > max * 0.6) return cut.slice(0, clause) + '…'
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:]+$/, '') + '…'
}

// Word joiners keep ISO dates on one line ("2026-10-23", not "2026-" / "10-23")
const keepDates = (s: string) => s.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$1-\u2060$2-\u2060$3')

function excerptBody(text: string) {
  let s = firstSentence(capitalize(text))
  if (s.length > BODY_MAX) s = s.replace(/\s*\([^()]*\)/g, '')
  return keepDates(clip(s, BODY_MAX))
}

const ruleCards = rules.map((r: Rule) => ({
  n: r.n,
  num: pad(r.n),
  href: ruleLink(r.n),
  title: r.lead ?? clip(firstSentence(r.body).replace(/[.!?]$/, ''), 64),
  body: excerptBody(r.body),
  status: r.status === 'draft' ? 'Draft' : r.status === 'locked' ? 'Locked' : null
}))

// ── Balance matrix ──
const genderRows = matrix.map((row) => ({
  ...row,
  n: genderTally.find((g) => g.key === row.key)?.n ?? 0
}))
const ageCols = AGE_BANDS.map((age) => ({ age, n: ageTally.find((t) => t.key === age)?.n ?? 0 }))
// The same cells read by age band first, for the narrow-screen table
const ageRows = ageCols.map((col, i) => ({ ...col, cells: genderRows.map((row) => ({ label: row.label, agents: row.cells[i].agents })) }))

// Link names repeat the visible caption; the image alt would repeat the
// "AI-generated" note on every tile, so the section says it once instead.
const fleetLabel = (a: Agent) =>
  [a.name, a.age, a.portraitStatus === 'mismatch' ? 'new portrait pending' : !a.portrait && 'no portrait yet']
    .filter(Boolean)
    .join(', ')
const mismatchCount = agents.filter((a) => a.portraitStatus === 'mismatch').length
const missingCount = agents.filter((a) => !a.portrait && a.portraitStatus !== 'mismatch').length
const pendingNote = [
  mismatchCount && ` ${mismatchCount} new ${plural(mismatchCount, 'face is', 'faces are')} waiting on a ledger update.`,
  missingCount && ` ${missingCount} ${plural(missingCount, 'agent has', 'agents have')} no portrait yet.`
]
  .filter(Boolean)
  .join('')

// ── Fleet layout ──
// style.css works out how many 70px-and-up tiles fit the fleet's width (4 to
// 12, by container query) and reads the column count to use from
// --fleet-c<that many>. A fleet that fits in three rows there is spread as
// evenly as it allows (11 tiles: one row of 11, or 6 + 5, never 9 + 2). A
// bigger one shows its first three rows until the reader asks for all of
// them, in every column or one fewer, whichever leaves the fuller last row
// once it is open (51 tiles where 10 fit: 9 × 5 + 6, not 10 × 5 + 1). Every
// tile is in the HTML either way: the rows past the third are hidden by
// style.css, and shown again without JavaScript, in print, or when Back
// returns to an open fleet.
const FOLD_ROWS = 3
const MIN_COLS = 4
const fleetSizes = [4, 5, 6, 7, 8, 9, 10, 11, 12]
const n = agents.length
const foldsAt = (max: number) => n > FOLD_ROWS * max
/** How full the open fleet's last row is, in this many columns (1 = full) */
const lastRowFill = (cols: number) => (n % cols || cols) / cols
function fleetCols(max: number) {
  if (!foldsAt(max)) return Math.ceil(n / Math.ceil(n / max))
  return max > MIN_COLS && lastRowFill(max - 1) > lastRowFill(max) ? max - 1 : max
}
const fleetVars = Object.fromEntries(fleetSizes.map((k) => [`--fleet-c${k}`, String(fleetCols(k))]))
/** The tile counts per row at which the fleet folds: the toggle shows at those widths only */
const fleetFolds = fleetSizes.filter(foldsAt).join(' ')
/** ...and those at which it folds in one column fewer (style.css hides from the 3 × (k − 1) + 1st tile) */
const fleetFoldsShort = fleetSizes.filter((k) => foldsAt(k) && fleetCols(k) < k).join(' ')
const fleetFoldable = fleetFolds !== ''

// The portrait's real width at each window width, for its sizes, so a 3x
// screen takes the 480px file once a portrait is wider than 80px (and only
// then). The fleet's width (style.css): the page is 1280px at most, inside a
// 48px gutter from 960px, 32px from 768px and 24px below that; the tile
// count per row steps up at every 84px of fleet width from 406px; tiles
// share the row with 14px gaps and stop growing at 120px; the image is the
// tile less its frame's 1px border each side.
const GAP = 14
const TILE_MAX = 120
const FRAME = 2
const PAGE_MAX = 1280
const sideAt = (vw: number) => (vw >= 960 ? 48 : vw >= 768 ? 32 : 24)
const bandAt = (fleet: number) => Math.min(12, fleet < 406 ? 4 : 5 + Math.floor((fleet - 406) / 84))
/** The image's width at this window width, as a sizes length */
function portraitSize(vw: number) {
  const side = sideAt(vw)
  const fleet = Math.min(vw, PAGE_MAX) - 2 * side
  const c = fleetCols(bandAt(fleet))
  const room = fleet - GAP * (c - 1)
  if (room >= TILE_MAX * c) return `${TILE_MAX - FRAME}px`
  if (vw >= PAGE_MAX) return `${Math.floor((room / c - FRAME) * 10) / 10}px`
  return `calc((100vw - ${2 * side + GAP * (c - 1)}px) / ${c} - ${FRAME}px)`
}
/** One entry per run of window widths with the same length, the widest last */
function fleetPortraitSizes() {
  const parts: string[] = []
  let size = portraitSize(0)
  for (let vw = 1; vw <= PAGE_MAX; vw++) {
    const next = portraitSize(vw)
    if (next === size) continue
    parts.push(`(max-width: ${vw - 0.02}px) ${size}`)
    size = next
  }
  return [...parts, size].join(', ')
}
const fleetImageSizes = fleetPortraitSizes()

const fleetOpen = ref(false)
const fleetList = ref<HTMLUListElement>()
const fleetMore = ref<HTMLButtonElement>()

async function toggleFleet() {
  const opening = !fleetOpen.value
  // Opening adds tiles above the button: focus moves to the first new one,
  // where reading goes on. Closing pulls the button up: keep it in view.
  const next = opening
    ? [...(fleetList.value?.children ?? [])].find((li) => getComputedStyle(li).display === 'none')
    : null
  fleetOpen.value = opening
  // this history entry's UI state (entry-state.ts), read back on Back
  writeEntry('fleetOpen', opening)
  await nextTick()
  const link = next?.querySelector<HTMLElement>('a')
  if (link) link.focus()
  else fleetMore.value?.scrollIntoView({ block: 'nearest' })
}

// Back to this page: open the fleet again before VitePress restores the
// scroll position (it does so once the page has mounted), so the reader lands
// where they left. After a full reload the head script in config.ts has
// already shown it open (it reads the same history.state.ir.fleetOpen); from
// here on the component's state decides.
onMounted(() => {
  if (fleetFoldable && readEntry('fleetOpen') === true) fleetOpen.value = true
  document.documentElement.classList.remove('ir-fleet-open')
})
</script>

<template>
  <div class="ir-home">
    <main class="ir-home-main">
      <!-- Hero -->
      <section class="ir-hero">
        <div class="ir-hero-copy">
          <span class="ir-label ir-kicker">Working draft · from a real agent org</span>
          <h1 class="ir-hero-title">Humanizing AI agents</h1>
          <p class="ir-lede">
            A public rulebook for how a fleet of AI agents presents itself to the people it works with,
            starting with the faces they wear. Every rule comes from running the org, and changes as the rollout goes.
          </p>
          <div class="ir-actions">
            <a class="ir-btn ir-btn-primary ir-frame" :href="rulesLink">
              <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
              Read the avatar rules
            </a>
            <a class="ir-btn ir-btn-secondary" :href="ledgerLink">See the ledger</a>
            <a class="ir-btn ir-btn-ghost" :href="repoLink" target="_blank" rel="noreferrer">GitHub →</a>
          </div>
        </div>

        <div class="ir-plate ir-frame" role="group" aria-labelledby="ir-spec-label">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div class="ir-plate-head">
            <span id="ir-spec-label" class="ir-label">Spec sheet</span>
            <span v-if="updatedDate" class="ir-meta">Updated {{ updatedDate }}</span>
          </div>
          <dl class="ir-stats">
            <div v-for="s in stats" :key="s.label" class="ir-stat">
              <dt>{{ s.label }}</dt>
              <dd>{{ s.n }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Fleet: every face in the ledger -->
      <section class="ir-section">
        <div class="ir-section-head">
          <h2>The fleet</h2>
          <a class="ir-btn ir-btn-secondary" :href="ledgerLink">Full ledger</a>
        </div>
        <div
          class="ir-fleet-box"
          :class="{ 'is-folded': fleetFoldable && !fleetOpen }"
          :style="fleetVars"
          :data-folds="fleetFolds || undefined"
          :data-folds-short="fleetFoldsShort || undefined"
        >
          <ul id="ir-fleet-list" ref="fleetList" class="ir-fleet" role="list">
            <li v-for="(a, i) in agents" :key="`${i}-${a.slug}`">
              <a class="ir-fleet-item" :href="agentLink(a)" :aria-label="fleetLabel(a)">
                <Portrait :agent="a" :sizes="fleetImageSizes" />
                <span class="ir-fleet-caption">
                  <span class="ir-fleet-name">{{ a.name }}</span>
                  <span v-if="a.age">{{ a.age }}</span>
                </span>
              </a>
            </li>
          </ul>
          <div class="ir-fleet-foot">
            <p class="ir-fleet-note">
              Every portrait is an AI-generated image of an invented person, never a real one
              (<a :href="ruleLink(1)">rule 01</a>).{{ pendingNote }}
            </p>
            <button
              v-if="fleetFoldable"
              ref="fleetMore"
              type="button"
              class="ir-btn ir-btn-secondary ir-fleet-more"
              :aria-expanded="fleetOpen ? 'true' : 'false'"
              aria-controls="ir-fleet-list"
              @click="toggleFleet"
            >
              {{ fleetOpen ? 'Show fewer portraits' : `Show all ${agents.length} portraits` }}
            </button>
          </div>
        </div>
      </section>

      <!-- Principle -->
      <section v-if="principle" class="ir-principle ir-frame">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
        <h2 class="ir-label">Principle</h2>
        <div class="ir-principle-body">
          <p class="ir-principle-quote">{{ principle.text }}</p>
          <span v-if="principle.attribution" class="ir-meta">{{ principle.attribution }}</span>
        </div>
      </section>

      <!-- Rules -->
      <section class="ir-section">
        <div class="ir-section-head">
          <h2>The avatar rules</h2>
          <span class="ir-count">{{ ruleCount }}</span>
        </div>
        <div class="ir-rules">
          <a v-for="r in ruleCards" :key="r.n" class="ir-rule" :href="r.href">
            <div class="ir-rule-top">
              <span class="ir-rule-n">{{ r.num }}</span>
              <span
                v-if="r.status"
                class="ir-tag"
                :class="r.status === 'Draft' ? 'ir-tag-outline' : 'ir-tag-neutral'"
              >{{ r.status }}</span>
            </div>
            <h3 class="ir-rule-title">{{ r.title }}</h3>
            <p>{{ r.body }}</p>
          </a>
        </div>
      </section>

      <!-- Balance matrix -->
      <section class="ir-section ir-balance">
        <div class="ir-balance-intro">
          <h2 id="ir-balance-title">An even blend, kept in the open</h2>
          <p>
            Before any portrait is set, it's checked against the ledger: no two agents share
            {{ hasHeritageColumn ? 'a specific heritage' : 'a race' }}, gender presentation and age band. The grid shows who fills each gender × age cell today<template v-if="open.length">,
            and which are still open</template><template v-else>; every cell has at least one face</template>.
          </p>
          <p v-if="open.length" class="ir-aside">Gaps are named as a list, not a nudge.</p>
          <p v-if="ungrouped.length" class="ir-aside">
            Not in the grid: {{ ungrouped.map((a) => a.name).join(', ') }}. The ledger gives
            {{ plural(ungrouped.length, 'this agent', 'these agents') }} a gender presentation or age band the grid doesn't have.
          </p>
        </div>

        <!-- Wide screens: gender rows × age columns -->
        <div class="ir-matrix-wrap ir-matrix-wide">
          <table class="ir-matrix" aria-labelledby="ir-balance-title">
            <thead>
              <tr>
                <th scope="col"><span class="ir-sr">Gender</span></th>
                <th v-for="c in ageCols" :key="c.age" scope="col">
                  {{ c.age }} <span class="ir-matrix-tally">{{ c.n }}<span class="ir-sr">{{ ' ' + plural(c.n, 'face', 'faces') }}</span></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in genderRows" :key="row.key">
                <th scope="row">
                  {{ row.label }} <span class="ir-matrix-tally">{{ row.n }} {{ plural(row.n, 'face', 'faces') }}</span>
                </th>
                <td v-for="c in row.cells" :key="c.age" :class="{ 'is-open': !c.agents.length }">
                  <template v-if="c.agents.length">
                    <span class="ir-cell-n">{{ c.agents.length }}</span>
                    <span class="ir-cell-names"><template v-for="(a, i) in c.agents" :key="a.slug"><span class="ir-cell-name">{{ a.name }}{{ i < c.agents.length - 1 ? ',' : '' }}</span>{{ ' ' }}</template></span>
                  </template>
                  <span v-else class="ir-open">Open</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Narrow screens: the same cells, age rows × gender columns -->
        <div class="ir-matrix-wrap ir-matrix-narrow">
          <table class="ir-matrix" aria-labelledby="ir-balance-title">
            <thead>
              <tr>
                <th scope="col"><span class="ir-sr">Age band</span></th>
                <th v-for="row in genderRows" :key="row.key" scope="col">
                  {{ row.label }} <span class="ir-matrix-tally">{{ row.n }}<span class="ir-sr">{{ ' ' + plural(row.n, 'face', 'faces') }}</span></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in ageRows" :key="row.age">
                <th scope="row">
                  {{ row.age }} <span class="ir-matrix-tally">{{ row.n }} {{ plural(row.n, 'face', 'faces') }}</span>
                </th>
                <td v-for="c in row.cells" :key="c.label" :class="{ 'is-open': !c.agents.length }">
                  <template v-if="c.agents.length">
                    <span class="ir-cell-n">{{ c.agents.length }}</span>
                    <span class="ir-cell-names"><template v-for="(a, i) in c.agents" :key="a.slug"><span class="ir-cell-name">{{ a.name }}{{ i < c.agents.length - 1 ? ',' : '' }}</span>{{ ' ' }}</template></span>
                  </template>
                  <span v-else class="ir-open">Open</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Rollout -->
      <section class="ir-section ir-rollout">
        <div class="ir-section-head">
          <h2>Self-identification first</h2>
        </div>
        <blockquote v-if="rollout.quote" class="ir-quote">
          <span>“{{ rollout.quote.text }}”</span>
          <span class="ir-meta">{{ rollout.quote.attribution }}</span>
        </blockquote>
        <div class="ir-steps">
          <div class="ir-step ir-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="ir-step-top"><span class="ir-step-n">1</span><span class="ir-tag ir-tag-neutral">Agent</span></div>
            <h3 class="ir-rule-title">Describe</h3>
            <p>Each agent reads the rules and the ledger, then describes itself: race/ethnicity, gender, age band and how it looks.</p>
          </div>
          <div class="ir-step ir-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="ir-step-top"><span class="ir-step-n">2</span><span class="ir-tag ir-tag-accent">Haven</span></div>
            <h3 class="ir-rule-title">Check against the ledger</h3>
            <p>On a collision or an imbalance, Haven asks the agent to adjust. Haven never overrides an agent's choice on its own.</p>
          </div>
          <div class="ir-step ir-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="ir-step-top"><span class="ir-step-n">3</span><span class="ir-tag ir-tag-accent">Haven + agent</span></div>
            <h3 class="ir-rule-title">Compare, approve, set</h3>
            <p>The portrait is compared side by side with every other one. The agent approves and sets its own picture; Haven verifies.</p>
          </div>
        </div>
      </section>

      <!-- Our gap -->
      <section class="ir-gap">
        <h2 class="ir-label">Why this exists</h2>
        <div>
          <p class="ir-gap-lead">
            No public rulebook from a real multi-agent org covers how agents present to humans.
          </p>
          <p>
            Nothing combines race, gender and age spectrums with a no-lookalike check, and nothing ties
            photo-real expressions to work status. This is a first draft of one.
          </p>
          <a class="ir-btn ir-btn-inverse" :href="rulesLink">Start with the avatar rules →</a>
        </div>
      </section>
    </main>
    <!-- The page foot, with who set the rules and when, comes after this (Layout.vue, SiteFooter.vue) -->
  </div>
</template>
