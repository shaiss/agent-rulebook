<script setup lang="ts">
import { data } from '../../data/rulebook.data'
import { balance } from '../../data/parse'
import { RULES, ruleLink, sectionHref } from './links'

// Balance tallies under the roster. Heritage is never counted or rolled up
// into regional groups here: the page links to the rule page's own fleet
// tally instead. The columns are plain blocks with headings, inside the one
// "Fleet balance" region.

const total = data.agents.length
const { genderTally, ageTally, open } = balance(data.agents)
const pct = (n: number) => `${total ? Math.round((n / total) * 100) : 0}%`

const unbanded = (n: number) => total - n
const genderOther = unbanded(genderTally.reduce((s, g) => s + g.n, 0))
const ageOther = unbanded(ageTally.reduce((s, a) => s + a.n, 0))

const blend = ruleLink(...RULES.blend)
const gender = ruleLink(...RULES.gender)
const age = ruleLink(...RULES.age)

const fleetTally = data.sections.find((s) => /^Fleet tally/i.test(s.title)) ?? null
const heritageLink = fleetTally
  ? { href: sectionHref(/^Fleet tally/i), text: fleetTally.title }
  : { href: blend.href, text: `Rule ${blend.label} on the rule page` }
</script>

<template>
  <section class="ir-ledger-tallies" aria-labelledby="ir-ledger-tallies-title">
    <h2 id="ir-ledger-tallies-title" class="ir-sr">Fleet balance</h2>

    <div class="ir-ledger-tally">
      <h3 class="ir-label ir-label-muted">
        {{ data.hasHeritageColumn ? 'Heritage' : 'Race/ethnicity' }} · <a :href="blend.href">rule {{ blend.label }}</a>
      </h3>
      <p class="ir-ledger-tally-text">
        <template v-if="data.hasHeritageColumn">
          Each entry names its specific heritage as the ledger records it.
          <template v-if="fleetTally">
            The rule page's fleet tally counts each heritage on its own and never rolls them into regions.
          </template>
          <template v-else>This page doesn't count or group them.</template>
        </template>
        <template v-else>
          Each entry names race/ethnicity as its portrait depicts it. This page doesn't count or group them.
        </template>
      </p>
      <a class="ir-ledger-tally-link" :href="heritageLink.href">{{ heritageLink.text }} →</a>
    </div>

    <div class="ir-ledger-tally">
      <h3 class="ir-label ir-label-muted">Gender · <a :href="gender.href">rule {{ gender.label }}</a></h3>
      <ul class="ir-ledger-bars" role="list">
        <li v-for="g in genderTally" :key="g.key">
          <span>{{ g.label }}</span>
          <span class="ir-ledger-bar" aria-hidden="true"><span :style="{ width: pct(g.n) }"></span></span>
          <span class="ir-ledger-bar-n">{{ g.n }}</span>
        </li>
        <li v-if="genderOther > 0">
          <span>Other, as written</span>
          <span class="ir-ledger-bar" aria-hidden="true"><span :style="{ width: pct(genderOther) }"></span></span>
          <span class="ir-ledger-bar-n">{{ genderOther }}</span>
        </li>
      </ul>
    </div>

    <div class="ir-ledger-tally">
      <h3 class="ir-label ir-label-muted">Age band · <a :href="age.href">rule {{ age.label }}</a></h3>
      <ul class="ir-ledger-bars" role="list">
        <li v-for="a in ageTally" :key="a.key">
          <span>{{ a.label }}</span>
          <span class="ir-ledger-bar" aria-hidden="true"><span :style="{ width: pct(a.n) }"></span></span>
          <span class="ir-ledger-bar-n">{{ a.n }}</span>
        </li>
        <li v-if="ageOther > 0">
          <span>Other, as written</span>
          <span class="ir-ledger-bar" aria-hidden="true"><span :style="{ width: pct(ageOther) }"></span></span>
          <span class="ir-ledger-bar-n">{{ ageOther }}</span>
        </li>
      </ul>
    </div>

    <div class="ir-ledger-tally">
      <h3 class="ir-label ir-label-muted">Open gender × age cells · {{ open.length }}</h3>
      <ul v-if="open.length" class="ir-ledger-gaps">
        <li v-for="g in open" :key="g">{{ g }}</li>
      </ul>
      <p v-else class="ir-ledger-tally-text">None. Every gender × age cell has at least one agent.</p>
      <span class="ir-meta">Gaps are named as a list, not a nudge.</span>
    </div>
  </section>
</template>
