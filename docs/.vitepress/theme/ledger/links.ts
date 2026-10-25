import { withBase } from 'vitepress'
import { data } from '../../data/rulebook.data'
import type { Rule } from '../../data/parse'

// Links from the ledger page into the rule page. Each rule cell there carries
// id="rule-N"; a rule this page can't find falls back to the Rules section.
// Call these from component setup (withBase needs the site data).

const RULE_PAGE = '/rules/avatars'
const pad = (n: number) => String(n).padStart(2, '0')

/** The rule whose lead (or, with `whole`, whole text) matches, else rule `n` if it exists */
export function findRule(re: RegExp, n: number, whole = false): Rule | null {
  const text = (r: Rule) => (whole ? `${r.lead ?? ''} ${r.body}` : r.lead ?? '')
  return data.rules.find((r) => re.test(text(r))) ?? data.rules.find((r) => r.n === n) ?? null
}

/** A section of the rule page by its heading, or the page itself */
export function sectionHref(re: RegExp) {
  const s = data.sections.find((x) => re.test(x.title))
  return withBase(`${RULE_PAGE}${s ? `#${s.slug}` : ''}`)
}

/** "02" and a link to that rule's cell, or to the Rules section when the rule is missing */
export function ruleLink(re: RegExp, n: number, whole = false) {
  const r = findRule(re, n, whole)
  return {
    rule: r,
    label: pad(r?.n ?? n),
    href: r ? withBase(`${RULE_PAGE}#rule-${r.n}`) : sectionHref(/^Rules\b/i)
  }
}

// The rules this page names, found by their leads so a renumbering follows along
export const RULES = {
  invented: [/invented person|real person/i, 1],
  distinct: [/look\s*-?\s*alike/i, 2],
  blend: [/even blend|balanced/i, 3],
  gender: [/^gender\b/i, 6],
  age: [/^age\b/i, 7]
} as const satisfies Record<string, readonly [RegExp, number]>
