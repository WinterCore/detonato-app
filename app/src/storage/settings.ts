import { DEFAULT_SETTINGS, parseSettings, serializeSettings, type Settings } from '@/core/settings'

/*
 * The settings, on this device: localStorage, read once at boot —
 * synchronously, so the first paint already has the right colour and
 * design. Best effort both ways: a store that can't be read starts on the
 * defaults, and a write that fails says so (`false`) for the caller to tell.
 */
const KEY = 'detonato.settings'

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? DEFAULT_SETTINGS : parseSettings(JSON.parse(raw))
  } catch {
    // Unreadable or not JSON: start on the defaults, and the next change writes over it.
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(s: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(serializeSettings(s)))
    return true
  } catch {
    // Private mode, a full store, or no storage at all.
    return false
  }
}
