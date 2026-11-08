import { weekdayShort, weekOrder } from '@/core/time/calendar'
import type { WeekDay } from '@/ui'

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** A task's weekdays as chips, in the week's order from Settings' week start. */
export function weekDays(on: readonly number[], weekStart: number): WeekDay[] {
  return weekOrder(weekStart).map((day) => ({ day, label: weekdayShort(day), name: NAMES[day], on: on.includes(day) }))
}
