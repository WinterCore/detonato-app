import { planOn, scheduledOn, type Scheduled } from '@/core/tasks'
import { addDays, type DayKey } from '@/core/time/calendar'
import type { Phase, SessionOf } from '@/core/timer'
import type { SessionRecord, Snapshot, Task, TaskId, TaskPlan } from '@/core/types'

/*
 * How much of a day got done: Σ min(done, N) / Σ N over the tasks scheduled
 * that day, each by the plan it had then. Counted
 * from the session log every time; nothing derived is stored.
 */

/** Sessions done by task and day, counted once per log. */
const COUNTS = new WeakMap<readonly SessionRecord[], Map<string, number>>()

function counts(sessions: readonly SessionRecord[]): Map<string, number> {
  let map = COUNTS.get(sessions)
  if (!map) {
    map = new Map()
    for (const s of sessions) {
      const k = `${s.taskId}|${s.day}`
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    COUNTS.set(sessions, map)
  }
  return map
}

/** Sessions of `taskId` finished on `day`. */
export function doneOn(snap: Snapshot, taskId: TaskId, day: DayKey): number {
  return counts(snap.sessions).get(`${taskId}|${day}`) ?? 0
}

/** A task's session among its day's: its task, its plan, which one it is, and that as words. */
export interface SessionPlace {
  task: Task
  plan: TaskPlan
  number: number
  /** «Session 2 of 3»; past the plan (cut while one ran), «Extra session». */
  label: string
}

/**
 * Which of its day's sessions a task's session is, by the day it counts for
 * (one begun before midnight is that day's): under way, the one after those
 * logged; done, it's logged, so the last of them. Null for a quick session,
 * or a task with no plan that day.
 */
export function sessionOf(t: SessionOf & { phase: Phase }, snap: Snapshot): SessionPlace | null {
  const task = t.taskId === null ? undefined : snap.tasks.find((x) => x.id === t.taskId)
  const plan = task && planOn(task, t.day)
  if (!task || !plan) return null
  const done = doneOn(snap, task.id, t.day)
  const number = t.phase === 'done' ? done : done + 1
  const label = number > plan.sessions ? 'Extra session' : `Session ${number} of ${plan.sessions}`
  return { task, plan, number, label }
}

export interface DayRow extends Scheduled {
  done: number
}

export interface DayProgress {
  rows: DayRow[]
  /** Sessions that count, each task's capped at its plan. */
  done: number
  total: number
  /** done / total; null on a day with nothing scheduled. */
  fraction: number | null
}

export function dayProgress(snap: Snapshot, day: DayKey): DayProgress {
  const rows = scheduledOn(snap, day).map((s) => ({ ...s, done: doneOn(snap, s.task.id, day) }))
  let done = 0
  let total = 0
  for (const r of rows) {
    done += Math.min(r.done, r.plan.sessions)
    total += r.plan.sessions
  }
  return { rows, done, total, fraction: total ? done / total : null }
}

/** A day's shade: nothing scheduled, or five steps from none done to all. */
export type Level = 'rest' | 'l0' | 'l1' | 'l2' | 'l3' | 'l4'

export function levelOf(fraction: number | null): Level {
  if (fraction === null) return 'rest'
  if (fraction <= 0) return 'l0'
  if (fraction < 1 / 3) return 'l1'
  if (fraction < 2 / 3) return 'l2'
  if (fraction < 1) return 'l3'
  return 'l4'
}

/** The first day any task was planned from, whatever order its plans are in; null with no tasks. */
export function firstDay(snap: Snapshot): DayKey | null {
  let first: DayKey | null = null
  for (const t of snap.tasks) {
    for (const p of t.plans) if (first === null || p.from < first) first = p.from
  }
  return first
}

/**
 * Full days in a row, back from yesterday — and today once it's cleared; a
 * day not over yet doesn't break the run. Days with nothing scheduled are
 * stepped over.
 */
export function streak(snap: Snapshot, today: DayKey): number {
  const first = firstDay(snap)
  if (first === null) return 0
  let run = dayProgress(snap, today).fraction === 1 ? 1 : 0
  for (let day = addDays(today, -1); day >= first; day = addDays(day, -1)) {
    const f = dayProgress(snap, day).fraction
    if (f === null) continue
    if (f < 1) break
    run++
  }
  return run
}

/** Minutes of focus logged on `day`. */
export function focusMinutes(snap: Snapshot, day: DayKey): number {
  let m = 0
  for (const s of snap.sessions) if (s.day === day) m += s.minutes
  return m
}
