<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { readEntry, writeEntry } from '../entry-state'

// The canonical ledger table behind a disclosure, under the portrait strip
// (rulepage/markdown.ts wraps the markdown table in this). The table is wider
// than the column, so it scrolls inside a named, focusable region (keys can
// scroll it too) with its header row and Agent column held in place
// (rulepage.css). Whether it is open is this history entry's UI state, so
// Back brings it back open (entry-state.ts), and it opens for printing.
const props = defineProps<{ rows: number }>()
/** The rule page's UI state, shared with LedgerStrip.vue: history.state.ir.rulepage */
const ENTRY = 'rulepage'
type RulepageUi = { strip?: boolean; table?: boolean }
const open = ref(false)
const details = ref<HTMLDetailsElement>()
/** The reader's state while a print has the table forced open */
let beforePrint: boolean | null = null

function onToggle() {
  if (!details.value) return
  open.value = details.value.open
  if (beforePrint === null) writeEntry<RulepageUi>(ENTRY, { ...readEntry<RulepageUi>(ENTRY), table: open.value })
}
function printOpen() {
  beforePrint = open.value
  open.value = true
  // set it now too: printing lays out before Vue's next update would land
  if (details.value) details.value.open = true
}
function printDone() {
  if (beforePrint === null) return
  open.value = beforePrint
  if (details.value) details.value.open = beforePrint
  beforePrint = null
}

onMounted(() => {
  if (readEntry<RulepageUi>(ENTRY)?.table === true) open.value = true
  addEventListener('beforeprint', printOpen)
  addEventListener('afterprint', printDone)
})
onBeforeUnmount(() => {
  removeEventListener('beforeprint', printOpen)
  removeEventListener('afterprint', printDone)
})
</script>

<template>
  <details ref="details" class="ir-ledger-table" :open="open" @toggle="onToggle">
    <summary>
      <span id="ir-ledger-table-title" class="ir-summary-title">Ledger table</span>
      <span class="ir-count">{{ props.rows }} {{ props.rows === 1 ? 'row' : 'rows' }}</span>
    </summary>
    <div class="ir-table-scroll" role="region" aria-labelledby="ir-ledger-table-title" tabindex="0">
      <slot />
    </div>
  </details>
</template>
