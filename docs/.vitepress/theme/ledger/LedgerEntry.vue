<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../../data/rulebook.data'
import { GENDERS, type Agent } from '../../data/parse'

// One ledger row in full: portrait, the rule-09 expression switch, the row's
// fields as written, and the rule-02 check against agents in the same
// gender × age cell.

const props = defineProps<{ agent: Agent }>()
defineEmits<{ back: [] }>()

const heritageOf = (a: Agent) => a.heritage || a.depicted
const pad = (n: number) => String(n).padStart(2, '0')

// Only the base portrait exists, so the switch shows its states without faking any
const EXPRESSIONS = ['Steady', 'Focused', 'Concerned', 'Quietly proud']
const exprRule =
  data.rules.find((r) => /expression variants?|dynamic avatar/i.test(`${r.lead ?? ''} ${r.body}`)) ??
  data.rules.find((r) => r.n === 9) ??
  null
const exprStatus = exprRule?.status === 'locked' ? 'Locked' : exprRule?.status === 'draft' ? 'Draft' : null

// Without the specific-heritage column, the depicted column is all there is
const kind = data.hasHeritageColumn ? 'heritage' : 'race/ethnicity'

const setDate = computed(() => /\b\d{4}-\d{2}-\d{2}\b/.exec(props.agent.set)?.[0] ?? props.agent.set)

const fields = computed(() => {
  const a = props.agent
  return [
    { k: 'Race/ethnicity', q: 'as depicted', v: a.depicted },
    { k: 'Specific heritage', v: a.heritage },
    { k: 'Gender presentation', v: a.genderLabel },
    { k: 'Age band', v: a.ageLabel },
    { k: 'Hair', v: a.hair },
    { k: 'Setting/clothing', v: a.setting },
    { k: 'Set', v: a.set }
  ].filter((f) => f.v)
})

const cell = computed(() => {
  const a = props.agent
  const g = GENDERS.find((x) => x.key === a.gender)
  if (!g || !a.age) return null
  const mine = heritageOf(a).trim().toLowerCase()
  return {
    label: `${g.label} · ${a.age}`,
    peers: data.agents
      .filter((p) => p !== a && p.gender === a.gender && p.age === a.age)
      .map((p) => ({ name: p.name, slug: p.slug, value: heritageOf(p), same: heritageOf(p).trim().toLowerCase() === mine }))
  }
})
</script>

<template>
  <div class="ir-ledger-entry-top">
    <span class="ir-label">Ledger entry</span>
    <span v-if="setDate" class="ir-meta">Set {{ setDate }}</span>
  </div>

  <div class="ir-ledger-entry-media">
    <Portrait :key="agent.slug" :agent="agent" eager sizes="(max-width: 639px) 92vw, (max-width: 959px) 300px, 336px" />

    <p v-if="agent.portraitStatus === 'mismatch'" class="ir-ledger-note">
      {{ agent.name }}'s portrait changed after this ledger row was written. The new one appears here once the
      ledger is updated.
    </p>

    <div
      v-if="exprRule"
      class="ir-ledger-expr"
      role="group"
      aria-labelledby="ir-ledger-expr-label"
      aria-describedby="ir-ledger-expr-note"
    >
      <div class="ir-ledger-expr-head">
        <span id="ir-ledger-expr-label" class="ir-label ir-label-muted">Expression · rule {{ pad(exprRule.n) }}</span>
        <span v-if="exprStatus" class="ir-tag" :class="exprStatus === 'Draft' ? 'ir-tag-outline' : 'ir-tag-neutral'">
          {{ exprStatus }}
        </span>
      </div>
      <div class="ir-ledger-expr-btns">
        <button
          v-for="(e, i) in EXPRESSIONS"
          :key="e"
          type="button"
          class="ir-ledger-expr-btn"
          :aria-pressed="i === 0"
          :disabled="i > 0"
        >
          {{ e }}
        </button>
      </div>
      <p id="ir-ledger-expr-note" class="ir-ledger-expr-note">
        Only the base portrait exists. The other expressions aren't generated yet.
      </p>
    </div>
  </div>

  <div class="ir-ledger-entry-info">
    <h2 id="ir-ledger-name" class="ir-ledger-name" tabindex="-1">{{ agent.name }}</h2>

    <dl class="ir-ledger-dl">
      <template v-for="f in fields" :key="f.k">
        <dt>{{ f.k }} <span v-if="f.q" class="ir-ledger-dt-q">({{ f.q }})</span></dt>
        <dd>{{ f.v }}</dd>
      </template>
    </dl>

    <section class="ir-ledger-check" aria-labelledby="ir-ledger-check-title">
      <h3 id="ir-ledger-check-title" class="ir-label ir-label-muted">Rule 02 check · same gender and age band</h3>
      <template v-if="cell">
        <span class="ir-meta">{{ cell.label }}</span>
        <ul v-if="cell.peers.length" class="ir-ledger-peers" role="list">
          <li v-for="p in cell.peers" :key="p.slug" :class="{ 'is-same': p.same }">
            <span class="ir-ledger-peer-name">{{ p.name }}</span>
            <span class="ir-ledger-peer-diff">{{ p.same ? 'same' : 'differs by' }} {{ kind }} · {{ p.value }}</span>
          </li>
        </ul>
        <p v-else class="ir-ledger-check-none">No other agent shares this cell.</p>
      </template>
      <p v-else class="ir-ledger-check-none">
        This row's gender or age band is outside the ledger's bands, so there is no cell to check.
      </p>
    </section>

    <button type="button" class="ir-ledger-back" @click="$emit('back')">Back to the roster</button>
  </div>
</template>
