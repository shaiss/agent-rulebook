import type { App } from 'vue'
import LedgerRoster from './LedgerRoster.vue'

// Global components used by docs/ledger.md.
export function registerLedger(app: App) {
  app.component('LedgerRoster', LedgerRoster)
}
