// The theme's per-history-entry UI state: what the reader opened or chose on
// a page (the landing's fleet toggle, the rule page's portrait strip and
// ledger table, the ledger's filter and selection), so Back and Forward bring
// the page back as it was left. Each page keeps its state under its own name
// in history.state.ir, next to VitePress's own { scrollPosition }.
//
// It belongs to the history entry, not to the page's address: a typed URL or
// a link from elsewhere opens a new entry, with nothing to restore. Readers
// call readEntry() on mount, so the page is as tall as it was left by the time
// VitePress restores the scroll position (just after the components mount).
//
// VitePress replaces the whole state object as it navigates; index.ts
// installs the one history wrapper that carries `ir` across those
// replacements, and into the new entry of an in-page #anchor jump (the same
// document, so the same UI state).

/** The key under history.state that holds every page's UI state */
export const ENTRY_KEY = 'ir'

type State = Record<string, unknown>

function currentState(): State {
  const s = typeof history === 'undefined' ? null : history.state
  return s && typeof s === 'object' ? (s as State) : {}
}

function currentIr(): State {
  const ir = currentState()[ENTRY_KEY]
  return ir && typeof ir === 'object' ? (ir as State) : {}
}

/**
 * This entry's UI state for `name`, as last written. History state can come
 * from another version of the site, so callers check its shape.
 */
export function readEntry<T>(name: string): T | undefined {
  return currentIr()[name] as T | undefined
}

/**
 * Record `value` as this entry's UI state for `name`: a replaceState on the
 * current entry (never a push), keeping its URL, VitePress's keys and the
 * other names under `ir`.
 */
export function writeEntry<T>(name: string, value: T) {
  try {
    history.replaceState({ ...currentState(), [ENTRY_KEY]: { ...currentIr(), [name]: value } }, '')
  } catch {
    // a value the browser can't clone, or history blocked: the page still works, it just won't remember
  }
}
