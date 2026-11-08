import { sessionOf } from '@/core/progress'
import { minutesOf, type Phase, type SessionOf } from '@/core/timer'
import type { Snapshot } from '@/core/types'

/** What a session's end notification says. */
export interface EndNotice {
  title: string
  body: string
}

/**
 * «Deep work» · «Session 2 of 3 done · 50 minutes» for a task's session —
 * the one under way, counted from the log — or «Session done» for a quick one.
 */
export function endNotice(t: SessionOf & { phase: Phase; length: number }, snap: Snapshot): EndNotice {
  const minutes = minutesOf(t)
  const place = sessionOf(t, snap)
  if (!place) return { title: 'Session done', body: `${minutes} minutes of focus.` }
  return { title: place.task.name, body: `${place.label} done · ${minutes} minutes` }
}
