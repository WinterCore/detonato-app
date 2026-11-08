import { LENGTH_MAX, LENGTH_MIN, stepLength } from '@/core/settings'
import { draftOf, EVERY_DAY, SESSIONS_MAX, SESSIONS_MIN, type TaskDraft } from '@/core/tasks'
import type { DayKey } from '@/core/time/calendar'
import type { Task } from '@/core/types'
import { weekDays } from '@/lib/weekDays'

/**
 * The editor's draft: a task as it's being made or changed. The length is
 * kept even while it's off (`custom` false), so switching back on finds it.
 */
export interface EditorDraft {
  name: string
  every: boolean
  days: number[]
  sessions: number
  custom: boolean
  length: number
}

/** A new task's draft: every day, one session, the default length. */
export function blankDraft(defaultLength: number): EditorDraft {
  return { name: '', every: true, days: EVERY_DAY, sessions: 1, custom: false, length: defaultLength }
}

/** An existing task's draft, from its plan today. */
export function draftFrom(task: Task, today: DayKey, defaultLength: number): EditorDraft {
  const d = draftOf(task, today)
  return {
    name: d.name,
    every: d.days.length === 7,
    days: d.days,
    sessions: d.sessions,
    custom: d.length !== null,
    length: d.length ?? defaultLength,
  }
}

export function toggleDay(draft: EditorDraft, day: number): EditorDraft {
  const days = draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day]
  return { ...draft, days }
}

export function stepSessions(draft: EditorDraft, dir: 1 | -1): EditorDraft {
  return { ...draft, sessions: Math.min(SESSIONS_MAX, Math.max(SESSIONS_MIN, draft.sessions + dir)) }
}

export function stepDraftLength(draft: EditorDraft, dir: 1 | -1): EditorDraft {
  return { ...draft, length: stepLength(draft.length, dir) }
}

/** What Save would save: none until it has a name and at least one day. */
export function toTaskDraft(draft: EditorDraft): TaskDraft | null {
  const name = draft.name.trim()
  const days = draft.every ? EVERY_DAY : draft.days
  if (!name || !days.length) return null
  return { name, days, sessions: draft.sessions, length: draft.custom ? draft.length : null }
}

/** Everything the editor shows of its draft. */
export function editorView(draft: EditorDraft, weekStart: number, defaultLength: number) {
  return {
    name: draft.name,
    every: draft.every,
    days: weekDays(draft.days, weekStart),
    sessions: { text: String(draft.sessions), atMin: draft.sessions <= SESSIONS_MIN, atMax: draft.sessions >= SESSIONS_MAX },
    custom: draft.custom,
    lengthNote: draft.custom ? 'Custom for this task' : `Uses the default, ${defaultLength} min`,
    length: { text: String(draft.length).padStart(2, '0'), atMin: draft.length <= LENGTH_MIN, atMax: draft.length >= LENGTH_MAX },
    canSave: toTaskDraft(draft) !== null,
  }
}
