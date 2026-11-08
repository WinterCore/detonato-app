import { IDLE, parseTimer, type TimerState } from '@/core/timer'

/*
 * The session under way, on this device: localStorage, like the settings,
 * so a running session outlives a reload or the app being closed — it holds
 * when the session ends, and boot settles it against the clock. Best effort:
 * a store that won't keep it just loses the session on a reload.
 */
const KEY = 'detonato.timer'

export function readTimer(): TimerState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? IDLE : parseTimer(JSON.parse(raw))
  } catch {
    return IDLE
  }
}

export function writeTimer(t: TimerState): void {
  try {
    if (t.phase === 'idle') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    // best effort; see above
  }
}
