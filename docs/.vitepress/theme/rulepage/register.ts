import type { App } from 'vue'
import LedgerStrip from './LedgerStrip.vue'
import RuleLedgerTable from './RuleLedgerTable.vue'
import FleetLine from './FleetLine.vue'
import RuleCrumbs from './RuleCrumbs.vue'

// Global components the rule-page markdown plugin can emit into avatars.md
// (and SiteFooter, the site's page foot, which index.ts registers).
export function registerRulePage(app: App) {
  app.component('LedgerStrip', LedgerStrip)
  app.component('RuleLedgerTable', RuleLedgerTable)
  app.component('FleetLine', FleetLine)
  app.component('RuleCrumbs', RuleCrumbs)
}
