// What the reader opened on the rule page (the portrait strip's "Show all",
// the ledger table's disclosure), kept for the tab in sessionStorage, keyed
// by path. Back to the page remounts it, and VitePress restores the old
// scroll position right after the components mount: they read this on mount,
// so the page is as tall as the reader left it by then. (history.state can't
// hold it: VitePress replaces the state object on every navigation.)

type UiState = Partial<Record<'strip' | 'table', boolean>>

const key = () => `ir-rulepage:${location.pathname}`

export function readUi(): UiState {
  try {
    const v = JSON.parse(sessionStorage.getItem(key()) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {} // storage blocked, or a value we didn't write
  }
}

export function writeUi(name: keyof UiState, value: boolean) {
  try {
    sessionStorage.setItem(key(), JSON.stringify({ ...readUi(), [name]: value }))
  } catch {
    // storage blocked: the page still works, it just won't remember
  }
}
