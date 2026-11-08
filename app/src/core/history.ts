import { dayProgress, doneOn, firstDay } from '@/core/progress'
import { liveTasks, planOn } from '@/core/tasks'
import { addDays, weekday, type DayKey } from '@/core/time/calendar'
import type { Snapshot, Task } from '@/core/types'

/*
 * The record over many days: the best run, the full days, the minutes of
 * focus, and how each task has gone. Every day is judged by the plans it
 * had then (`dayProgress`), never by today's, so an edit or a delete never
 * rewrites the past.
 */

/** History's window: today and the 364 days before it. */
export const YEAR_DAYS = 365

export const yearFrom = (today: DayKey): DayKey => addDays(today, -(YEAR_DAYS - 1))

/** Each day from `from` to `to`, both included. */
function* days(from: DayKey, to: DayKey): Generator<DayKey> {
  for (let day = from; day <= to; day = addDays(day, 1)) {
    yield day
  }
}

/** The later of `from` and the record's first day: nothing before that counts. Null with no tasks. */
function recordFrom(snap: Snapshot, from: DayKey): DayKey | null {
  const first = firstDay(snap)
  if (first === null) {
    return null
  }
  if (first > from) {
    return first
  }
  return from
}

/**
 * The longest run of full days ever, counted as the streak is: days with
 * nothing scheduled are stepped over, and today joins a run once it's
 * cleared. (Today not over yet can't cost a run: it's the last day counted,
 * so the best is already kept.)
 */
export function bestStreak(snap: Snapshot, today: DayKey): number {
  const first = firstDay(snap)
  if (first === null) {
    return 0
  }
  let run = 0
  let best = 0
  for (const day of days(first, today)) {
    const f = dayProgress(snap, day).fraction
    if (f === null) {
      continue
    }
    if (f < 1) {
      run = 0
      continue
    }
    run++
    best = Math.max(best, run)
  }
  return best
}

/** Days from `from` to `to` with every session done; a day not over yet counts once it's cleared. */
export function perfectDays(snap: Snapshot, from: DayKey, to: DayKey): number {
  const start = recordFrom(snap, from)
  if (start === null) {
    return 0
  }
  let n = 0
  for (const day of days(start, to)) {
    if (dayProgress(snap, day).fraction === 1) {
      n++
    }
  }
  return n
}

/** Minutes logged on days from `from` to `to`, a deleted task's among them: the time was spent. */
export function focusBetween(snap: Snapshot, from: DayKey, to: DayKey): number {
  let m = 0
  for (const s of snap.sessions) {
    if (s.day >= from && s.day <= to) {
      m += s.minutes
    }
  }
  return m
}

/** A task's sessions done of those it asked for, over some days. */
export interface TaskRate {
  task: Task
  /** Each day's capped at its plan, as a day's fill is. */
  done: number
  total: number
}

/**
 * How each task still on the schedule went over the `n` days before today
 * (today isn't over, so it's left out): each day by the plan it had then.
 * A task with no day scheduled in them is left out.
 */
export function taskRates(snap: Snapshot, today: DayKey, n: number): TaskRate[] {
  const from = addDays(today, -n)
  const to = addDays(today, -1)
  const out: TaskRate[] = []
  for (const task of liveTasks(snap, today)) {
    let done = 0
    let total = 0
    for (const day of days(from, to)) {
      const plan = planOn(task, day)
      if (!plan?.days.includes(weekday(day))) {
        continue
      }
      done += Math.min(doneOn(snap, task.id, day), plan.sessions)
      total += plan.sessions
    }
    if (total > 0) {
      out.push({ task, done, total })
    }
  }
  return out
}
