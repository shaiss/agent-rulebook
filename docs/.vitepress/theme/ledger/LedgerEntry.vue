<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../../data/rulebook.data'
import { GENDERS, type Agent } from '../../data/parse'
import { RULES, ruleLink, sectionHref } from './links'
import { heritageMatch, notesFor } from './notes'

// One ledger row in full: portrait and name, the rule-09 expression switch,
// the rule-02 check against agents in the same gender × age cell (with the
// ledger's own notes on documented exceptions), then the row's fields as
// written. Side by side with the roster (ledger.css) the portrait and name
// share a row and the fields pack two to a line, so the entry fits beside
// the roster on common screens.

const props = defineProps<{ agent: Agent }>()
defineEmits<{ back: [] }>()

const heritageOf = (a: Agent) => a.heritage || a.depicted
const genderName = (a: Agent) => GENDERS.find((g) => g.key === a.gender)?.label ?? a.genderLabel

// Only the base portrait exists, so the switch shows its states without faking any
const EXPRESSIONS = ['Steady', 'Focused', 'Concerned', 'Quietly proud']
const expr = ruleLink(/expression variants?|dynamic avatar/i, 9, true)
const exprStatus = expr.rule?.status === 'locked' ? 'Locked' : expr.rule?.status === 'draft' ? 'Draft' : null
const distinct = ruleLink(...RULES.distinct)
const ledgerHref = sectionHref(/^Ledger/i)

// Without the specific-heritage column, the depicted column is all there is
const kind = data.hasHeritageColumn ? 'heritage' : 'race/ethnicity'
const names = data.agents.map((a) => a.name)

const setDate = computed(() => /\b\d{4}-\d{2}-\d{2}\b/.exec(props.agent.set)?.[0] ?? props.agent.set)

// Side by side the fields pack two across; a value longer than this (about
// two half-width lines) or a qualified label takes a full line
const LONG = 36

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
  ]
    .filter((f) => f.v)
    .map((f) => ({ ...f, long: !!f.q || (f.v ?? '').length > LONG }))
})

const FLAG = { same: 'same', overlap: 'check' } as const

const cell = computed(() => {
  const a = props.agent
  const g = GENDERS.find((x) => x.key === a.gender)
  if (!g || !a.age) return null
  const mine = heritageOf(a)
  const peers = data.agents
    .filter((p) => p !== a && p.gender === a.gender && p.age === a.age)
    .map((p) => {
      const m = heritageMatch(mine, heritageOf(p))
      return { name: p.name, slug: p.slug, value: heritageOf(p), match: m, flag: m ? FLAG[m] : null }
    })
  return { label: `${g.label} · ${a.age}`, peers }
})
const others = computed(() => {
  const n = cell.value?.peers.length ?? 0
  return n === 1 ? '1 other agent' : `${n} other agents`
})

// The ledger's notes that name this agent, quoted as written
const notes = computed(() => notesFor(props.agent.name, data.ledgerNotes, names))
const rule2Notes = computed(() => notes.value.filter((q) => q.rule2))
const otherNotes = computed(() => notes.value.filter((q) => !q.rule2))
</script>

<template>
  <div class="ir-ledger-entry-top">
    <span class="ir-label">Ledger entry</span>
    <span v-if="setDate" class="ir-meta">Set {{ setDate }}</span>
  </div>

  <div class="ir-ledger-entry-media">
    <!-- Full width on phones up to 360px (ledger.css caps it there: the largest
         file is 720px), 300px stacked from 640px, about 150px beside the roster -->
    <Portrait
      :key="agent.slug"
      :agent="agent"
      eager
      sizes="(max-width: 408px) calc(100vw - 48px), (max-width: 639px) 360px, (max-width: 959px) 300px, 160px"
    />

    <p v-if="agent.portraitStatus === 'mismatch'" class="ir-ledger-note">
      {{ agent.name }}'s portrait changed after this ledger row was written. The new one appears here once the
      ledger is updated.
    </p>

    <div
      v-if="expr.rule"
      class="ir-ledger-expr"
      role="group"
      aria-labelledby="ir-ledger-expr-label"
      aria-describedby="ir-ledger-expr-note"
    >
      <div class="ir-ledger-expr-head">
        <span id="ir-ledger-expr-label" class="ir-label ir-label-muted">
          Expression · <a :href="expr.href">rule {{ expr.label }}</a>
        </span>
        <span v-if="exprStatus" class="ir-tag" :class="exprStatus === 'Draft' ? 'ir-tag-outline' : 'ir-tag-neutral'">
          {{ exprStatus }}
        </span>
      </div>
      <div class="ir-ledger-expr-opts">
        <!-- The one state that exists: an indicator, not a toggle -->
        <span class="ir-ledger-expr-opt" :class="agent.portrait ? 'is-current' : 'is-off'">
          <span class="ir-ledger-expr-text">{{ EXPRESSIONS[0] }}</span
          ><span v-if="agent.portrait" class="ir-sr">, shown</span>
        </span>
        <button v-for="e in EXPRESSIONS.slice(1)" :key="e" type="button" class="ir-ledger-expr-opt is-off" disabled>
          <span class="ir-ledger-expr-text">{{ e }}</span>
        </button>
      </div>
      <p id="ir-ledger-expr-note" class="ir-ledger-expr-note">
        <template v-if="agent.portrait">Only the base portrait exists so far.</template>
        <template v-else>No portrait is shown yet, so no expression is.</template>
      </p>
    </div>
  </div>

  <div class="ir-ledger-entry-info">
    <div class="ir-ledger-ident">
      <h2 id="ir-ledger-name" class="ir-ledger-name" tabindex="-1">{{ agent.name }}</h2>
      <p class="ir-ledger-tags">
        <span class="ir-tag ir-tag-accent">{{ genderName(agent) }}</span>
        <span class="ir-tag ir-tag-neutral">{{ agent.age ?? agent.ageLabel }}</span>
      </p>
      <p class="ir-ledger-ident-heritage">{{ heritageOf(agent) }}</p>
    </div>

    <div class="ir-ledger-check">
      <h3 class="ir-label ir-label-muted">
        <a :href="distinct.href">Rule {{ distinct.label }}</a> check · same gender and age band
      </h3>
      <template v-if="cell">
        <span class="ir-meta">{{ cell.label }} · {{ others }}<template v-if="cell.peers.length">, compared by {{ kind }}</template></span>
        <ul class="ir-ledger-peers" role="list">
          <li class="is-self">
            <span class="ir-ledger-peer-name">{{ agent.name }} <span class="ir-ledger-peer-self">(this entry)</span></span>
            <span class="ir-ledger-peer-val">{{ heritageOf(agent) }}</span>
          </li>
          <li v-for="p in cell.peers" :key="p.slug" :class="p.match && `is-${p.match}`">
            <span class="ir-ledger-peer-name">{{ p.name }}</span>
            <span class="ir-ledger-peer-val">
              <strong v-if="p.flag" class="ir-ledger-peer-flag">{{ p.flag }} ·</strong> {{ p.value }}
            </span>
          </li>
        </ul>
        <p v-if="!cell.peers.length" class="ir-ledger-check-none">No other agent shares this cell.</p>
      </template>
      <p v-else class="ir-ledger-check-none">
        This row's gender or age band is outside the ledger's bands, so there is no cell to check.
      </p>

      <figure v-for="(q, i) in rule2Notes" :key="i" class="ir-ledger-quote">
        <blockquote><p>{{ q.text }}</p></blockquote>
        <figcaption>From the <a :href="ledgerHref">ledger notes</a></figcaption>
      </figure>
    </div>

    <dl class="ir-ledger-dl">
      <div v-for="f in fields" :key="f.k" :class="{ 'is-long': f.long }">
        <dt>{{ f.k }} <span v-if="f.q" class="ir-ledger-dt-q">({{ f.q }})</span></dt>
        <dd>{{ f.v }}</dd>
      </div>
    </dl>

    <figure v-for="(q, i) in otherNotes" :key="i" class="ir-ledger-quote">
      <blockquote><p>{{ q.text }}</p></blockquote>
      <figcaption>From the <a :href="ledgerHref">ledger notes</a></figcaption>
    </figure>

    <button type="button" class="ir-ledger-back" @click="$emit('back')">Back to the roster</button>
  </div>
</template>
