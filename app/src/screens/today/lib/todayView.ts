import { dayProgress, focusMinutes, sessionOf, streak } from '@/core/progress'
import type { Settings } from '@/core/settings'
import { liveTasks, planOn, scheduledOn } from '@/core/tasks'
import { longDate, weekdayName, type DayKey } from '@/core/time/calendar'
import { minutesOf, type TimerState } from '@/core/timer'
import type { Snapshot, TaskId } from '@/core/types'
import { weekDays } from '@/lib/weekDays'
import type { WeekDay } from '@/ui'

/** One of today's tasks, as its card shows it. */
export interface TaskCardView {
  id: TaskId
  name: string
  /** Sessions done today, and the plan's count. */
  done: number
  total: number
  /** «3 × 50 min». */
  meta: string
  /** A session's minutes. */
  minutes: number
  complete: boolean
  /** Its session for today is under way: running or held. One begun yesterday counts for yesterday. */
  session: 'running' | 'paused' | null
  /** Its play button presses: not done, and no session of anything under way. */
  canStart: boolean
}

/**
 * The big card up top: the session under way; else the task to do next;
 * else how the day stands.
 */
export type Hero =
  | { kind: 'session'; phase: 'running' | 'paused'; title: string; line: string }
  | { kind: 'next'; card: TaskCardView; line: string; start: string; startLabel: string }
  | { kind: 'cleared'; line: string }
  | { kind: 'rest' }
  | { kind: 'empty' }

const pad2 = (n: number) => String(n).padStart(2, '0')

/** A quick session's line: «25 min · not logged». */
const quickLine = (minutes: number) => `${minutes} min · not logged`

type Active = Extract<TimerState, { phase: 'running' | 'paused' }>

/** The session under way, by the day it counts for: «Session 2 of 3 · 50 min». */
function sessionHero(t: Active, snap: Snapshot): Hero {
  const minutes = minutesOf(t)
  if (t.taskId === null) return { kind: 'session', phase: t.phase, title: 'Quick session', line: quickLine(minutes) }
  const place = sessionOf(t, snap)
  if (!place) return { kind: 'session', phase: t.phase, title: 'Session', line: `${minutes} min` }
  return { kind: 'session', phase: t.phase, title: place.task.name, line: `${place.label} · ${minutes} min` }
}

/** «2 h 05 min», «45 min». */
export function focusLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${pad2(minutes % 60)} min`
}

/** Everything Today shows, from the log, the clock, the session under way and the settings. */
export function todayView(snap: Snapshot, today: DayKey, timer: TimerState, settings: Settings) {
  const progress = dayProgress(snap, today)
  const active = timer.phase === 'running' || timer.phase === 'paused' ? timer : null
  const cards: TaskCardView[] = progress.rows.map(({ task, plan, done }) => {
    const minutes = plan.length ?? settings.defaultLength
    const complete = done >= plan.sessions
    const session = active?.taskId === task.id && active.day === today ? active.phase : null
    return {
      id: task.id,
      name: task.name,
      done: Math.min(done, plan.sessions),
      total: plan.sessions,
      meta: `${plan.sessions} × ${minutes} min`,
      minutes,
      complete,
      session,
      canStart: !complete && active === null,
    }
  })
  const scheduled = new Set(scheduledOn(snap, today).map((s) => s.task.id))
  const live = liveTasks(snap, today)
  const notToday = live
    .filter((t) => !scheduled.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, days: weekDays(planOn(t, today)?.days ?? [], settings.weekStart) as WeekDay[] }))
  const empty = live.length === 0
  const rest = progress.total === 0
  const cleared = !rest && progress.done >= progress.total
  const focus = focusLabel(focusMinutes(snap, today))
  const days = streak(snap, today)
  // Still to do, the one under way first — even if the task was cut to fewer sessions while it ran.
  const todo = cards.filter((c) => !c.complete || c.session !== null).sort((a, b) => Number(b.session !== null) - Number(a.session !== null))
  const done = cards.filter((c) => c.complete && c.session === null)

  let hero: Hero
  if (active) hero = sessionHero(active, snap)
  else if (empty) hero = { kind: 'empty' }
  else if (rest) hero = { kind: 'rest' }
  else if (cleared) hero = { kind: 'cleared', line: `${focus} of focus` }
  else {
    const card = todo[0]
    const start = `Start session ${card.done + 1}`
    hero = { kind: 'next', card, line: `Session ${card.done + 1} of ${card.total} · ${card.minutes} min`, start, startLabel: `${start} of ${card.name}` }
  }

  return {
    weekday: weekdayName(today),
    date: longDate(today),
    /** No tasks at all: no streak to show. */
    empty,
    streak: { text: String(days), label: `${days} day streak` },
    hero,
    /** The day's bar, under the hero; none on a rest day. */
    progress: {
      label: `${progress.done} of ${progress.total} sessions done today`,
      line: `${progress.done} of ${progress.total} · ${focus}`,
      done: progress.done,
      total: progress.total,
      rest,
      cleared,
    },
    /** A tile each: still to do, then done. */
    tasks: [...todo, ...done],
    /** The tiles' heading, for a screen reader: «3 to do, 1 done». */
    tally: `${todo.length} to do, ${done.length} done`,
    notToday,
    quick: active?.taskId === null
      ? { minutes: minutesOf(active), line: quickLine(minutesOf(active)), canStart: false, session: active.phase }
      : { minutes: settings.defaultLength, line: quickLine(settings.defaultLength), canStart: active === null, session: null },
  }
}

export type TodayView = ReturnType<typeof todayView>
