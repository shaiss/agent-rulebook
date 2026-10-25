<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import { balance } from '../../data/parse'

// Balance tallies under the roster. Heritage is never rolled up into regional
// groups here: the page links to the rule page's own fleet tally instead.

const total = data.agents.length
const { genderTally, ageTally, open } = balance(data.agents)
const pct = (n: number) => `${total ? Math.round((n / total) * 100) : 0}%`

const unbanded = (n: number) => total - n
const genderOther = unbanded(genderTally.reduce((s, g) => s + g.n, 0))
const ageOther = unbanded(ageTally.reduce((s, a) => s + a.n, 0))

const section = (re: RegExp) => data.sections.find((s) => re.test(s.title)) ?? null
const fleetTally = section(/^Fleet tally/i)
const rules = section(/^Rules\b/i)
const heritageLink = fleetTally
  ? { href: withBase(`/rules/avatars#${fleetTally.slug}`), text: fleetTally.title }
  : { href: withBase(`/rules/avatars${rules ? `#${rules.slug}` : ''}`), text: 'Rule 03 on the rule page' }
</script>

<template>
  <section class="ir-ledger-tallies" aria-labelledby="ir-ledger-tallies-title">
    <h2 id="ir-ledger-tallies-title" class="ir-sr">Fleet balance</h2>

    <section class="ir-ledger-tally" aria-labelledby="ir-ledger-tally-heritage">
      <h3 id="ir-ledger-tally-heritage" class="ir-label ir-label-muted">
        {{ data.hasHeritageColumn ? 'Heritage' : 'Race/ethnicity' }} · rule 03
      </h3>
      <p class="ir-ledger-tally-text">
        <template v-if="data.hasHeritageColumn">
          Each entry names its specific heritage as the ledger records it. Heritages are counted one by one,
          never rolled up into regions.
        </template>
        <template v-else>
          Each entry names race/ethnicity as its portrait depicts it. This page doesn't group those into regions.
        </template>
      </p>
      <a class="ir-ledger-tally-link" :href="heritageLink.href">{{ heritageLink.text }} →</a>
    </section>

    <section class="ir-ledger-tally" aria-labelledby="ir-ledger-tally-gender">
      <h3 id="ir-ledger-tally-gender" class="ir-label ir-label-muted">Gender · rule 06</h3>
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
    </section>

    <section class="ir-ledger-tally" aria-labelledby="ir-ledger-tally-age">
      <h3 id="ir-ledger-tally-age" class="ir-label ir-label-muted">Age band · rule 07</h3>
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
    </section>

    <section class="ir-ledger-tally" aria-labelledby="ir-ledger-tally-open">
      <h3 id="ir-ledger-tally-open" class="ir-label ir-label-muted">Open gender × age cells · {{ open.length }}</h3>
      <ul v-if="open.length" class="ir-ledger-gaps">
        <li v-for="g in open" :key="g">{{ g }}</li>
      </ul>
      <p v-else class="ir-ledger-tally-text">None. Every gender × age cell has at least one agent.</p>
      <span class="ir-meta">Gaps are named as a list, not a nudge.</span>
    </section>
  </section>
</template>
