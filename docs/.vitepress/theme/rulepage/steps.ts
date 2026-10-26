// The rollout's three steps as 2a heads them: who acts (a tag) and a short
// title over each step's text. The rulebook's markdown words each step as a
// sentence or three, with no title, so the titles are the site's own; each
// is used only while the step it heads still says what the title does
// (`says`), and only when the list is exactly these steps, in this order.
// Otherwise the step cards keep their numerals alone (markdown.ts).
// The landing's step cards (Home.vue) carry the same tags and titles.

export interface RolloutStep {
  title: string
  /** Who acts at this step: the tag in the card's top row */
  actor: string
  /** Haven's steps on the accent tint, the agent's own on the neutral one (2a) */
  tag: 'neutral' | 'accent'
  says: RegExp
}

export const ROLLOUT_STEPS: RolloutStep[] = [
  { title: 'Describe', actor: 'Agent', tag: 'neutral', says: /\bagent\b[^.]*\bdescribes\b/i },
  { title: 'Check against the ledger', actor: 'Haven', tag: 'accent', says: /\bHaven checks\b[^.]*\bagainst the ledger\b/i },
  { title: 'Compare, approve, set', actor: 'Haven + agent', tag: 'accent', says: /\bcompares\b[\s\S]*\bagent approves\b[\s\S]*\bsets\b/i }
]

/** The heads for these step texts, in order, or null if the list is not 2a's three steps */
export function rolloutHeads(texts: string[]): RolloutStep[] | null {
  return texts.length === ROLLOUT_STEPS.length && ROLLOUT_STEPS.every((s, k) => s.says.test(texts[k]))
    ? ROLLOUT_STEPS
    : null
}
