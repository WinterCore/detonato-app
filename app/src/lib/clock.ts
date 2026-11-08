import { msToMidnight } from '@/core/time/calendar'
import { setToday } from '@/state'

/**
 * Keeps the store's `today` the day it is: moved on at midnight, and again
 * when the app comes back — a phone asleep past midnight runs no timeout.
 * Called once, after boot. Returns a stop function.
 */
export function followDay(): () => void {
  let timer = 0
  const arm = () => {
    clearTimeout(timer)
    // A beat past midnight, so the new day has surely begun.
    timer = window.setTimeout(() => {
      setToday()
      arm()
    }, msToMidnight(new Date()) + 50)
  }
  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return
    setToday()
    arm()
  }
  arm()
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
