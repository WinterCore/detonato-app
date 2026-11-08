/*
 * The app's state and everything that changes it. Screens import from here
 * only — `@/state`, never a file inside it.
 *
 *   store.ts       the one store: what's in it, useApp
 *   app.ts         boot: everything kept on this device, read before the first render; the day moving on
 *   writes.ts      the write queue: IndexedDB one write at a time, persisted before memory
 *   tasks.ts       a task made, edited (from today on) or deleted (from today on)
 *   timer.ts       the session timer's moves, and logging a task's session when it ends
 *   settings.ts    every setting, saved then applied
 *   backup.ts      a backup of everything, and restoring one
 *   feedback.ts    toasts
 */

export { boot, setToday } from './app'
export { backupNow, checkBackup, restoreBackup } from './backup'
export { dismissToast, toast } from './feedback'
export {
  replaceSettings,
  setDefaultLength,
  setGhost,
  setGlow,
  setHaptics,
  setKeepAwake,
  setLed,
  setNotify,
  setSound,
  setStyle,
  setWeekStart,
} from './settings'
export { get, useApp, type AppState } from './store'
export { removeTask, saveTask } from './tasks'
export { closeSession, pauseSession, resetSession, resumeSession, settleSession, startSession, stopSession } from './timer'
