<script setup lang="ts">
import { withBase } from 'vitepress'
import { agents, rules, ageBands, genders } from './data'

const rulesLink = withBase('/rules/avatars')
const ledgerLink = withBase('/rules/avatars#ledger-live-portraits')
const repoLink = 'https://github.com/shaiss/agent-rulebook'

const matrix = genders.map(([g, label]) => ({
  label,
  cells: ageBands.map((age) => ({
    age,
    names: agents.filter((a) => a.g === g && a.age === age).map((a) => a.name)
  }))
}))
const openCells = matrix.flatMap((r) => r.cells.filter((c) => c.names.length === 0)).length
const draftCount = rules.filter((r) => r.draft).length

const stats = [
  { n: agents.length, label: 'live portraits' },
  { n: rules.length, label: 'rules' },
  { n: draftCount, label: 'drafts in review' },
  { n: openCells, label: 'open gender × age cells' }
]

const initials = (name: string) =>
  name
    .split(' ')
    .filter((w) => w.length > 2)
    .map((w) => w[0])
    .join('')
</script>

<template>
  <div class="ir-home">
    <!-- Hero -->
    <section class="ir-hero">
      <div class="ir-hero-copy">
        <h6 class="ir-kicker">Working draft · from a real agent org</h6>
        <h1 class="ir-hero-title">Humanizing AI agents</h1>
        <p class="ir-lede">
          A public rulebook for how a fleet of AI agents presents itself to the people it works with,
          starting with the faces they wear. Every rule comes from running the org, and changes as the rollout goes.
        </p>
        <div class="ir-actions">
          <a class="ir-btn ir-btn-primary blueprint" :href="rulesLink">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            Read the avatar rules
          </a>
          <a class="ir-btn ir-btn-secondary" :href="ledgerLink">See the ledger</a>
          <a class="ir-btn ir-btn-ghost" :href="repoLink" target="_blank" rel="noreferrer">GitHub →</a>
        </div>
      </div>

      <div class="ir-plate blueprint" aria-label="Fleet at a glance">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
        <div class="ir-plate-head">
          <h6>Spec sheet</h6>
          <span class="ir-meta">Updated 2026-10-24</span>
        </div>
        <dl class="ir-stats">
          <div v-for="s in stats" :key="s.label" class="ir-stat">
            <dt>{{ s.label }}</dt>
            <dd>{{ s.n }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Fleet strip -->
    <section class="ir-section">
      <div class="ir-section-head">
        <h2>The fleet</h2>
        <a class="ir-btn ir-btn-secondary" :href="ledgerLink">Full ledger</a>
      </div>
      <div class="ir-fleet">
        <figure v-for="a in agents" :key="a.name" class="ir-portrait">
          <div class="ir-portrait-frame blueprint">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <span class="ir-monogram" aria-hidden="true">{{ initials(a.name) }}</span>
          </div>
          <figcaption>
            <span class="ir-portrait-name">{{ a.name }}</span>
            <span>{{ a.age }}</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- Principle -->
    <section class="ir-principle blueprint">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      <h6>Principle</h6>
      <div class="ir-principle-body">
        <p class="ir-principle-quote">Inclusion first: a diverse team where every agent feels equal.</p>
        <span class="ir-meta">Shai, 2026-10-23 9:20 PM ET</span>
      </div>
    </section>

    <!-- Rules -->
    <section class="ir-section">
      <div class="ir-section-head">
        <h2>The avatar rules</h2>
        <span class="ir-count">{{ rules.length }} rules · {{ draftCount }} drafts</span>
      </div>
      <div class="ir-rules">
        <a v-for="r in rules" :key="r.n" class="ir-rule" :href="rulesLink">
          <div class="ir-rule-top">
            <span class="ir-rule-n">{{ r.n }}</span>
            <span v-if="r.draft" class="ir-tag ir-tag-outline">Draft</span>
          </div>
          <span class="ir-rule-title">{{ r.t }}</span>
          <p>{{ r.b }}</p>
        </a>
      </div>
    </section>

    <!-- Balance matrix -->
    <section class="ir-section ir-balance">
      <div class="ir-balance-intro">
        <h2>An even blend, kept in the open</h2>
        <p>
          Before any portrait is set, it's checked against the ledger: no two agents share a race, gender
          presentation and age band. The grid shows who fills each gender × age cell today, and which are still open.
        </p>
        <p class="ir-aside">Gaps are named as a list, not a nudge.</p>
      </div>
      <div class="ir-matrix-wrap">
        <table class="ir-matrix">
          <thead>
            <tr>
              <th scope="col"><span class="ir-sr">Gender</span></th>
              <th v-for="age in ageBands" :key="age" scope="col">{{ age }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in matrix" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td v-for="c in row.cells" :key="c.age" :class="{ 'is-open': c.names.length === 0 }">
                <template v-if="c.names.length">
                  <span v-for="n in c.names" :key="n">{{ n }}</span>
                </template>
                <span v-else class="ir-open">Open</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Rollout -->
    <section class="ir-section">
      <div class="ir-section-head">
        <h2>Self-identification first</h2>
      </div>
      <blockquote class="ir-quote">
        <span>“Give each agent a chance to read the rules and self identify first. Rather than u assigning.”</span>
        <span class="ir-meta">Shai, 3:06 AM ET 2026-10-24</span>
      </blockquote>
      <div class="ir-steps">
        <div class="ir-step blueprint">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div class="ir-step-top"><span class="ir-step-n">1</span><span class="ir-tag ir-tag-neutral">Agent</span></div>
          <span class="ir-rule-title">Describe</span>
          <p>Each agent reads the rules and the ledger, then describes itself: race/ethnicity, gender, age band and how it looks.</p>
        </div>
        <div class="ir-step blueprint">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div class="ir-step-top"><span class="ir-step-n">2</span><span class="ir-tag ir-tag-accent">Haven</span></div>
          <span class="ir-rule-title">Check against the ledger</span>
          <p>On a collision or an imbalance, Haven asks the agent to adjust. Haven never overrides an agent's choice on its own.</p>
        </div>
        <div class="ir-step blueprint">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div class="ir-step-top"><span class="ir-step-n">3</span><span class="ir-tag ir-tag-accent">Haven + agent</span></div>
          <span class="ir-rule-title">Compare, approve, set</span>
          <p>The portrait is compared side by side with every other one. The agent approves and sets its own picture; Haven verifies.</p>
        </div>
      </div>
    </section>

    <!-- Our gap -->
    <section class="ir-gap">
      <h6>Why this exists</h6>
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

    <footer class="ir-footer">
      <a :href="repoLink" target="_blank" rel="noreferrer">Edit on GitHub</a>
      <span>Rules set by Shai Perednik, 2026-10-23 · refined 2026-10-24</span>
    </footer>
  </div>
</template>
