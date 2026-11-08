import type { Settings } from '@/core/settings'
import { liveTasks, planOn } from '@/core/tasks'
import type { DayKey } from '@/core/time/calendar'
import type { Snapshot, TaskId } from '@/core/types'
import { weekDays } from '@/lib/weekDays'
import type { WeekDay } from '@/ui'

export interface TaskRowView {
  id: TaskId
  name: string
  /** «3 × 50 min», and « · default» for a task on Settings' length. */
  meta: string
  days: WeekDay[]
}

/** The Tasks list: every task not deleted, as it's planned today. */
export function taskRows(snap: Snapshot, today: DayKey, settings: Settings): TaskRowView[] {
  return liveTasks(snap, today).map((t) => {
    const plan = planOn(t, today)!
    const minutes = plan.length ?? settings.defaultLength
    return {
      id: t.id,
      name: t.name,
      meta: `${plan.sessions} × ${minutes} min${plan.length === null ? ' · default' : ''}`,
      days: weekDays(plan.days, settings.weekStart),
    }
  })
}
