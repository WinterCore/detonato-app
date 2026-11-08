import type { DayKey } from '@/core/time/calendar'
import type { SessionRecord, Snapshot, Task, TaskPlan } from '@/core/types'

/*
 * Test helpers only: tasks, plans and sessions in a line each.
 * 2026-11-05 is a Thursday.
 */

export const EVERY = [0, 1, 2, 3, 4, 5, 6]

export const plan = (from: DayKey, sessions = 1, days = EVERY, length: number | null = null): TaskPlan => ({ from, days, sessions, length })

export const task = (id: string, ...plans: TaskPlan[]): Task => ({ id, name: id, plans, createdAt: 0 })

/** `n` sessions of `taskId` on `day`, 25 minutes each. */
export function sessions(taskId: string, day: DayKey, n = 1): SessionRecord[] {
  return Array.from({ length: n }, (_, i) => {
    const endedAt = Date.parse(`${day}T12:00:00Z`) + i * 60_000
    return { id: `${taskId}@${endedAt}`, taskId, day, endedAt, minutes: 25 }
  })
}

export const snap = (tasks: Task[], log: SessionRecord[] = []): Snapshot => ({ tasks, sessions: log })
