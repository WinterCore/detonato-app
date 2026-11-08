import { useCallback, useSyncExternalStore } from 'react'

/**
 * A running session's seconds left, moved on at each whole second before
 * `endsAt` — the moment the display changes, not a second late. Null when
 * nothing runs.
 */
export function useSecondsLeft(endsAt: number | null): number | null {
  const subscribe = useCallback(
    (changed: () => void) => {
      if (endsAt === null) return () => {}
      let timer = 0
      const next = () => {
        const left = endsAt - Date.now()
        if (left <= 0) return
        timer = window.setTimeout(() => {
          changed()
          next()
        }, left % 1000 || 1000)
      }
      next()
      return () => clearTimeout(timer)
    },
    [endsAt],
  )
  return useSyncExternalStore(subscribe, () => (endsAt === null ? null : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))))
}
