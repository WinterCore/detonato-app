import { endNotice } from '@/core/notice'
import type { Settings } from '@/core/settings'
import type { TimerState } from '@/core/timer'
import { buzz } from '@/lib/haptics'
import { setAwake } from '@/lib/keepAwake'
import { canNotify, cancelEnd, scheduleEnd } from '@/lib/notifications'
import { playSound } from '@/lib/sound'
import { settleSession, useApp, type AppState } from '@/state'

/*
 * Everything a session does outside its screen, kept in step with the
 * store's timer — whichever screen is open:
 *
 * - its end, on time (`settleSession`), and again whenever the app comes
 *   back, in case the timeout slept through it;
 * - the notification for that end, handed to the phone while it runs, so it
 *   arrives with the app closed; taken back on pause, reset and stop;
 * - the screen held on while it runs, if Settings says so;
 * - the sound and the buzz, when the end comes with the app in front.
 *
 * With the app in front at the end, the app tells it, not the phone: just
 * before the end the notification is taken back (or the phone would ring
 * too), and handed over again should the app leave in those last moments.
 */

/** How long before the end the app takes the notification back, when it's in front to tell the end itself. */
const TAKE_BACK_MS = 1500
/** An end the app sees later than this happened while it was away: no sound for it now. */
const FRESH_MS = 3000

let endTimer = 0
let takeBackTimer = 0
/** What the phone holds a notification for: the end and the settings it rings with. Null for none. */
let handed: string | null = null
/** The notification calls, in order: a take-back never overtakes the hand-over before it. */
let queue: Promise<void> = Promise.resolve()

const visible = () => document.visibilityState === 'visible'
const wantsNotice = (s: Settings) => canNotify() && s.notify

function enqueue(call: () => Promise<void>): void {
  queue = queue.then(call).catch((err: unknown) => console.error(err))
}

type Running = Extract<TimerState, { phase: 'running' }>

function handOver(t: Running, s: AppState): void {
  const notice = endNotice(t, s.snap)
  const { settings } = s
  const key = `${t.endsAt}:${notice.title}:${notice.body}:${settings.sound}:${settings.haptics}:${settings.led}`
  if (handed === key) return
  handed = key
  enqueue(() => scheduleEnd(t.endsAt, notice, settings))
}

function takeBack(): void {
  if (handed === null) return
  handed = null
  enqueue(cancelEnd)
}

function sync(s: AppState, prev: AppState | null): void {
  const t = s.timer
  clearTimeout(endTimer)
  clearTimeout(takeBackTimer)

  if (t.phase === 'running') {
    const left = t.endsAt - Date.now()
    endTimer = window.setTimeout(settleSession, Math.max(0, left))
    if (wantsNotice(s.settings)) {
      handOver(t, s)
      takeBackTimer = window.setTimeout(() => visible() && takeBack(), Math.max(0, left - TAKE_BACK_MS))
    } else {
      takeBack()
    }
  } else if (t.phase === 'done') {
    // Arrived, or taken back for the app to tell: either way the phone holds nothing now.
    handed = null
  } else {
    takeBack()
  }
  setAwake(t.phase === 'running' && s.settings.keepAwake)

  const justEnded = prev?.timer.phase === 'running' && t.phase === 'done'
  if (justEnded && visible() && Date.now() - t.endedAt < FRESH_MS) {
    playSound(s.settings.sound)
    buzz()
  }
}

/** Follow the timer from now on. Called once, after boot. Returns a stop function. */
export function followSession(): () => void {
  sync(useApp.getState(), null)
  const unsubscribe = useApp.subscribe((s, prev) => {
    if (s.timer !== prev.timer || s.settings !== prev.settings || s.snap !== prev.snap) sync(s, prev)
  })
  const onVisibility = () => {
    const s = useApp.getState()
    if (visible()) {
      settleSession()
      return
    }
    // Leaving in the last moments, after the notification was taken back: hand it over again.
    if (s.timer.phase === 'running' && wantsNotice(s.settings) && s.timer.endsAt > Date.now()) handOver(s.timer, s)
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisibility)
    clearTimeout(endTimer)
    clearTimeout(takeBackTimer)
  }
}
