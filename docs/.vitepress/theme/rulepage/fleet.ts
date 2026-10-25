import { balance, type Agent } from '../../data/parse'

// The fleet facts the rule page states twice: in the aside's Fleet box
// (FleetAside.vue, wide screens) and in the line under the Ledger heading
// (FleetLine.vue, where the aside is hidden). A row without a matching
// portrait is counted as pending, not as a live portrait.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function fleetFacts(agents: Agent[]) {
  const total = agents.length
  const live = agents.filter((a) => a.portrait).length
  const pending = total - live
  const open = balance(agents).open.length
  return {
    total,
    live,
    pending,
    open,
    agentsText: total === 1 ? 'agent' : 'agents',
    /** "7 portraits live · 4 pending", or "All 11 portraits live" */
    portraitsText:
      pending === 0 && total > 1 ? `all ${total} portraits live` : `${plural(live, 'portrait')} live${pending ? ` · ${pending} pending` : ''}`,
    openText: `${open} open gender × age cell${open === 1 ? '' : 's'}`
  }
}
