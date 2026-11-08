import { weekday, type DayKey } from '@/core/time/calendar'
import type { Snapshot, Task, TaskId, TaskPlan } from '@/core/types'

/** A task as the editor holds it: what a new plan will ask. */
export interface TaskDraft {
  name: string
  days: number[]
  sessions: number
  length: number | null
}

export const SESSIONS_MIN = 1
export const SESSIONS_MAX = 8
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

/**
 * The plan a task had on `day`: the latest to start on or before it, whatever
 * order the plans are in (a restored file's, say). None before the task was
 * made, or from the day it was deleted.
 */
export function planOn(task: Task, day: DayKey): TaskPlan | undefined {
  if (task.deletedOn !== undefined && day >= task.deletedOn) return undefined
  let found: TaskPlan | undefined
  for (const p of task.plans) {
    if (p.from <= day && (found === undefined || p.from >= found.from)) found = p
  }
  return found
}

/** A task scheduled on `day`, with the plan it had then. */
export interface Scheduled {
  task: Task
  plan: TaskPlan
}

/** The tasks scheduled on `day`, in the order they were made. */
export function scheduledOn(snap: Snapshot, day: DayKey): Scheduled[] {
  const wd = weekday(day)
  const out: Scheduled[] = []
  for (const task of snap.tasks) {
    const plan = planOn(task, day)
    if (plan?.days.includes(wd)) out.push({ task, plan })
  }
  return out
}

/** The tasks not deleted by `day`, in the order they were made: the Tasks list. */
export function liveTasks(snap: Snapshot, day: DayKey): Task[] {
  return snap.tasks.filter((t) => planOn(t, day) !== undefined)
}

/** The plan a draft makes, from `day`: days in weekday order, once each. */
function planFrom(draft: TaskDraft, day: DayKey): TaskPlan {
  return {
    from: day,
    days: [...new Set(draft.days)].sort((a, b) => a - b),
    sessions: Math.min(SESSIONS_MAX, Math.max(SESSIONS_MIN, Math.round(draft.sessions))),
    length: draft.length,
  }
}

/** A new task, scheduled from today. */
export function createTask(draft: TaskDraft, id: TaskId, today: DayKey, now: number): Task {
  return { id, name: draft.name.trim(), plans: [planFrom(draft, today)], createdAt: now }
}

/**
 * An edit: a new plan from today on, so past days keep the plan they had. It
 * replaces any plan from today or later: a second edit the same day, or one
 * made while the phone's clock ran ahead. The name changes for the whole
 * history.
 */
export function editTask(task: Task, draft: TaskDraft, today: DayKey): Task {
  const kept = task.plans.filter((p) => p.from < today)
  return { ...task, name: draft.name.trim(), plans: [...kept, planFrom(draft, today)] }
}

/** Off the schedule from today; days already past keep it. */
export function deleteTask(task: Task, today: DayKey): Task {
  return { ...task, deletedOn: today }
}

/** A task's current plan as an editor draft. */
export function draftOf(task: Task, day: DayKey): TaskDraft {
  const plan = planOn(task, day) ?? task.plans[task.plans.length - 1]
  return { name: task.name, days: plan.days, sessions: plan.sessions, length: plan.length }
}
