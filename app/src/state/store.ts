import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { DEFAULT_SETTINGS, type Settings } from '@/core/settings'
import { dayKey, type DayKey } from '@/core/time/calendar'
import { IDLE, type TimerState } from '@/core/timer'
import { EMPTY_SNAPSHOT, type Snapshot } from '@/core/types'

/*
 * All of the app's state, in one store. Screens read it with `useApp(select)`
 * and change it only through the actions in this folder (`@/state`).
 *
 * A selector returns something already in the store — `s.settings`,
 * `s.settings.led` — never a new object or array: Zustand compares by
 * identity, and a fresh object every render loops.
 *
 * In dev, every change shows up by name in Redux DevTools.
 */

export interface AppState {
  /** Tasks and every session finished: the in-memory copy of IndexedDB. Changed only through `writes.ts`. */
  snap: Snapshot
  /** The day it is, moved on at midnight and when the app comes back (`lib/clock`). Every screen's "today". */
  today: DayKey
  /** Everything Settings sets. In localStorage (`storage/settings`), and in a backup. */
  settings: Settings
  /**
   * The session under way, if any (`core/timer`). In localStorage
   * (`storage/timer`), so it outlives a reload; `lib/session` follows it with
   * everything a session does outside the screen — its end, the notification,
   * the screen kept on.
   */
  timer: TimerState
  toast: { id: number; text: string } | null
}

export const initialState = (): AppState => ({
  snap: EMPTY_SNAPSHOT,
  today: dayKey(new Date()),
  settings: DEFAULT_SETTINGS,
  timer: IDLE,
  toast: null,
})

const hasDevtools = typeof window !== 'undefined' && '__REDUX_DEVTOOLS_EXTENSION__' in window

export const useApp = create<AppState>()(
  devtools(initialState, { name: 'detonato', enabled: import.meta.env.DEV && hasDevtools }),
)

/** The current state, outside React. */
export const get = useApp.getState

/** Change the state. `action` names the change in DevTools: `settings/led`, `app/boot`, … */
export function set(action: string, patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  useApp.setState(patch, false, action)
}
