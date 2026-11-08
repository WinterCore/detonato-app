import { sessionOf } from '@/core/progress'
import { minutesLabel, minutesOf, type Phase, type SessionOf } from '@/core/timer'
import type { Snapshot } from '@/core/types'

/** What one of a session's notifications says. */
export interface Notice {
  title: string
  body: string
}

type Session = SessionOf & { phase: Phase; length: number }

/**
 * «Deep work» · «Session 2 of 3 done · 50 minutes» for a task's session —
 * the one under way, counted from the log — or «Session done» for a quick one.
 */
export function endNotice(t: Session, snap: Snapshot): Notice {
  const minutes = minutesLabel(minutesOf(t))
  const place = sessionOf(t, snap)
  if (!place) {
    return { title: 'Session done', body: `${minutes} of focus.` }
  }
  return { title: place.task.name, body: `${place.label} done · ${minutes}` }
}

/**
 * What the phone shows beside the countdown while a session is under way:
 * «Deep work» · «Session 2 of 3», or «Quick session» · «25 minutes».
 */
export function countdownNotice(t: Session, snap: Snapshot): Notice {
  const place = sessionOf(t, snap)
  if (!place) {
    return { title: 'Quick session', body: minutesLabel(minutesOf(t)) }
  }
  return { title: place.task.name, body: place.label }
}
