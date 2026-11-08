import { doneOn, sessionOf } from '@/core/progress'
import type { Settings } from '@/core/settings'
import { clockText, minutesOf, timeLeft, type Phase, type TimerState } from '@/core/timer'
import type { Glyph, Snapshot } from '@/core/types'

/** The countdown's largest size, and what's around it at phone width: the screen's padding, and some air. */
const CLOCK_MAX_PX = 112
const CLOCK_INSET_PX = 56

/**
 * The countdown's font size: as large as it can be, shrunk on a narrow
 * phone so «25:00» fits across in a wide design (14 Segment is 0.73 wide to
 * 1 tall, Sports 0.56). Its width in em: four digits, the colon (40/240) and
 * the four gaps between them (0.1 each).
 */
export function clockSize(glyph: Glyph): string {
  const [, , w, h] = glyph.box
  const em = 4 * (w / h) + 40 / 240 + 4 * 0.1
  return `min(${CLOCK_MAX_PX}px, calc((100vw - ${CLOCK_INSET_PX}px) / ${em.toFixed(3)}))`
}

/** The phone's clock: 12-hour or 24-hour. */
export type HourCycle = 'h12' | 'h23'

/**
 * «9:41 AM» or «09:41»: in English and Western digits, like the rest of the
 * app, but on the phone's own clock — an Arabic phone's locale would
 * otherwise write «٩:٤١ م» into an English screen.
 */
export function timeOfDay(ms: number, hourCycle: HourCycle): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hourCycle })
}

/** How long after a start the timer screen still counts as opening on it: the tap, then the move to the screen. */
const FRESH_MS = 2000

/**
 * A session started just now, so the screen opening on it sweeps the display
 * on. One carrying on, reopened or resumed, just carries on.
 */
export function justStarted(t: TimerState, now: number): boolean {
  return t.phase === 'running' && t.length - (t.endsAt - now) < FRESH_MS
}

type Session = Exclude<TimerState, { phase: 'idle' }>

/** The line under the fuse, at its end. */
function statusLine(t: Session, hourCycle: HourCycle): string {
  switch (t.phase) {
    case 'running':
      return `Ends ${timeOfDay(t.endsAt, hourCycle)}`
    case 'paused':
      return 'Paused'
    case 'done':
      return `Ended ${timeOfDay(t.endedAt, hourCycle)}`
  }
}

/** The display's own motion: the colon blinks while held, everything flashes once it's over. */
const DISPLAY_CLASSES: Record<Exclude<Phase, 'idle'>, string | undefined> = { running: undefined, paused: 'blink', done: 'flash' }

const sessionsLeft = (n: number) => (n === 1 ? 'One session left today.' : `${n} sessions left today.`)

/** A task's session: which one of how many, and what's left once it's done. */
function taskPart(t: Session, snap: Snapshot, settings: Settings) {
  const place = sessionOf(t, snap)
  if (!place) return null
  const { task, plan } = place
  const done = doneOn(snap, task.id, t.day)
  const left = Math.max(0, plan.sessions - done)
  let heading = `${place.label} done`
  if (left === 0) heading = plan.sessions === 1 ? `${task.name} done` : `All ${plan.sessions} sessions done`
  return {
    id: task.id,
    title: task.name,
    label: place.label,
    pips: { total: plan.sessions, done: Math.min(done, plan.sessions) },
    heading,
    leftLine: left > 0 ? sessionsLeft(left) : 'Done for today.',
    /** The next session's button, while some are left. */
    next: left > 0 ? { label: `Start session ${done + 1}`, minutes: plan.length ?? settings.defaultLength } : null,
  }
}

/**
 * Everything the timer screen shows, for a session under way or done. `left`
 * is the time left in ms — for a running session the screen's ticking
 * clock, a whole second at a time.
 */
export function timerView(t: Session, left: number | null, snap: Snapshot, settings: Settings, glyph: Glyph, hourCycle: HourCycle) {
  const ms = left ?? timeLeft(t, Date.now(), 0)
  const minutes = minutesOf(t)
  const task = taskPart(t, snap, settings)
  return {
    phase: t.phase,
    /** Above the digits: the task, or «Quick session». */
    title: task?.title ?? 'Quick session',
    /** What the pips say: «Session 2 of 3». */
    label: task?.label ?? 'Quick session',
    pips: task?.pips ?? null,
    clock: clockText(ms),
    clockSize: clockSize(glyph),
    displayClass: DISPLAY_CLASSES[t.phase],
    status: statusLine(t, hourCycle),
    done: {
      heading: task?.heading ?? 'Session done',
      line: task ? `${minutes} minutes logged. ${task.leftLine}` : `${minutes} minutes of focus. Not logged.`,
      /** Another session: the task's next, or another quick one; null when the task is done for the day. */
      again: task ? task.next && { ...task.next, taskId: task.id } : { label: 'Start another', minutes: settings.defaultLength, taskId: null },
    },
  }
}

export type TimerView = ReturnType<typeof timerView>
