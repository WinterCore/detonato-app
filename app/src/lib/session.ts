import { countdownNotice, endNotice } from '@/core/notice'
import type { Settings } from '@/core/settings'
import type { TimerState } from '@/core/timer'
import { buzz } from '@/lib/haptics'
import { setAwake } from '@/lib/keepAwake'
import { canNotify } from '@/lib/notifications'
import { clearSession, hideSession, onCommands, showSession, takeBackEnd, takeCommands } from '@/lib/sessionNotice'
import { playSound } from '@/lib/sound'
import { applyCommands, settleSession, useApp, type AppState } from '@/state'

/*
 * Everything a session does outside its screen, kept in step with the
 * store's timer — whichever screen is open:
 *
 * - its end, on time (`settleSession`), and again whenever the app comes
 *   back, in case the timeout slept through it;
 * - its countdown on the phone (`lib/sessionNotice`), running or held, and
 *   the end's alert with it while it runs, so it arrives with the app closed;
 *   put away when it's done or stopped;
 * - the moves made on that countdown, replayed before any end is settled:
 *   a session paused there before its end isn't over;
 * - the screen held on while it runs, if Settings says so;
 * - the sound and the buzz, when the end comes with the app in front.
 *
 * With the app in front at the end, the app tells it, not the phone: just
 * before the end the alert is taken back (or the phone would ring too), and
 * handed over again should the app leave in those last moments.
 */

/** How long before the end the app takes the alert back, when it's in front to tell the end itself. */
const TAKE_BACK_MS = 1500
/** An end the app sees later than this happened while it was away: no sound for it now. */
const FRESH_MS = 3000
/** Marks what the phone was given once its alert has been taken back. */
const TAKEN = ':taken'

let endTimer = 0
let takeBackTimer = 0
/**
 * What the phone was last given, as a key, so the same isn't sent twice:
 * null for nothing. Unknown at start, so the first state is always sent —
 * the phone may still show a session from before the app was closed.
 */
let given: string | null = 'unknown'
/** The calls to the phone, in order: a take-back never overtakes the hand-over before it. */
let queue: Promise<void> = Promise.resolve()
/** Catch-ups, one at a time, so the moves taken are replayed in the order they were made. */
let catching: Promise<void> = Promise.resolve()

const visible = () => document.visibilityState === 'visible'
const wantsNotice = (s: Settings) => canNotify() && s.notify

function enqueue(call: () => Promise<void>): void {
  queue = queue.then(call).catch((err: unknown) => console.error(err))
}

/** `call` sent to the phone, unless what it gives (`key`) is already there. */
function give(key: string | null, call: () => Promise<void>): void {
  if (given === key) {
    return
  }
  given = key
  enqueue(call)
}

type Shown = Extract<TimerState, { phase: 'running' } | { phase: 'paused' }>

function show(t: Shown, s: AppState): void {
  const countdown = countdownNotice(t, s.snap)
  const end = endNotice(t, s.snap)
  const { settings } = s
  const key = JSON.stringify([t, countdown, end, settings.sound, settings.haptics, settings.led])
  give(key, () => showSession(t, countdown, end, settings))
}

function takeBack(): void {
  if (given === null || given.endsWith(TAKEN)) {
    return
  }
  give(given + TAKEN, takeBackEnd)
}

/** The phone's countdown and alert, as the timer stands. */
function notice(s: AppState): void {
  if (!canNotify()) {
    return
  }
  const t = s.timer
  if ((t.phase === 'running' || t.phase === 'paused') && s.settings.notify) {
    show(t, s)
    return
  }
  if (t.phase === 'done') {
    // Its alert has arrived, or was taken back for the app to tell: leave it, and put the countdown away.
    give(null, hideSession)
    return
  }
  give(null, clearSession)
}

/** The notification's moves first, then the end: a session paused there before its end isn't over. */
function catchUp(): void {
  catching = catching
    .then(async () => {
      const commands = await takeCommands()
      if (commands.length > 0) {
        await applyCommands(commands)
      }
      await settleSession()
    })
    .catch((err: unknown) => console.error(err))
}

function sync(s: AppState, prev: AppState | null): void {
  const t = s.timer
  clearTimeout(endTimer)
  clearTimeout(takeBackTimer)

  if (t.phase === 'running') {
    const left = t.endsAt - Date.now()
    endTimer = window.setTimeout(catchUp, Math.max(0, left))
  }
  notice(s)
  if (t.phase === 'running' && wantsNotice(s.settings)) {
    const left = t.endsAt - Date.now()
    takeBackTimer = window.setTimeout(() => {
      if (visible()) {
        takeBack()
      }
    }, Math.max(0, left - TAKE_BACK_MS))
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
    if (s.timer !== prev.timer || s.settings !== prev.settings || s.snap !== prev.snap) {
      sync(s, prev)
    }
  })
  const stopCommands = onCommands(catchUp)
  const onVisibility = () => {
    const s = useApp.getState()
    if (visible()) {
      catchUp()
      return
    }
    // Leaving in the last moments, after the alert was taken back: hand it over again.
    if (s.timer.phase === 'running' && wantsNotice(s.settings) && s.timer.endsAt > Date.now()) {
      show(s.timer, s)
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    unsubscribe()
    stopCommands()
    document.removeEventListener('visibilitychange', onVisibility)
    clearTimeout(endTimer)
    clearTimeout(takeBackTimer)
  }
}
