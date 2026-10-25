import type { App } from 'vue'
import LedgerStrip from './LedgerStrip.vue'

// Global components the rule-page markdown plugin can emit into avatars.md.
export function registerRulePage(app: App) {
  app.component('LedgerStrip', LedgerStrip)
}
