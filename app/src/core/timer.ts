import { z } from 'zod/mini'
import { LENGTH_MAX } from '@/core/settings'
import type { DayKey } from '@/core/time/calendar'
import type { SessionRecord, TaskId } from '@/core/types'

/*
 * The session timer: one session at a time, as plain states and the moves
 * between them. Every time is an epoch millisecond, so a running session
 * survives a reload or the app being closed: what's kept is when it ends,
 * not a count that something has to keep ticking.
 *
 * Each session is a task's — logged when it ends — or a quick one, logged
 * nowhere, and keeps the day it started on: one begun before midnight
 * counts for that day.
 *
 *   idle ─start→ running ─pause→ paused ─resume→ running ─(its end passes)→ done
 *   running, paused ─reset→ paused at the full length;  any ─stop→ idle
 */

/** Whose session it is: a task's, logged when it ends, or a quick one (null), logged nowhere. And the day it started on. */
export interface SessionOf {
  taskId: TaskId | null
  day: DayKey
}

export type TimerState =
  | { phase: 'idle' }
  | ({ phase: 'running'; length: number; endsAt: number } & SessionOf)
  | ({ phase: 'paused'; length: number; left: number } & SessionOf)
  | ({ phase: 'done'; length: number; endedAt: number } & SessionOf)

export type Phase = TimerState['phase']

export const IDLE: TimerState = { phase: 'idle' }

const MINUTE = 60_000

/** A session's length in whole minutes. */
export function minutesOf(t: { length: number }): number {
  return Math.round(t.length / MINUTE)
}

/** A new session of `minutes` for `of`, running from `now`. */
export function startTimer(minutes: number, now: number, of: SessionOf): TimerState {
  const length = minutes * MINUTE
  return { phase: 'running', length, endsAt: now + length, taskId: of.taskId, day: of.day }
}

/** Whose session `t` is; null when idle. */
export function sessionOf(t: TimerState): SessionOf | null {
  return t.phase === 'idle' ? null : { taskId: t.taskId, day: t.day }
}

/** Held where it is. A session whose end has already passed is done instead. */
export function pauseTimer(t: TimerState, now: number): TimerState {
  const settled = settleTimer(t, now)
  if (settled.phase !== 'running') return settled
  return { phase: 'paused', length: settled.length, left: settled.endsAt - now, taskId: settled.taskId, day: settled.day }
}

/** Running again, with the time that was left. */
export function resumeTimer(t: TimerState, now: number): TimerState {
  if (t.phase !== 'paused') return t
  return { phase: 'running', length: t.length, endsAt: now + t.left, taskId: t.taskId, day: t.day }
}

/** Back to the full length, held: the session starts over when it's resumed. */
export function resetTimer(t: TimerState): TimerState {
  if (t.phase !== 'running' && t.phase !== 'paused') return t
  return { phase: 'paused', length: t.length, left: t.length, taskId: t.taskId, day: t.day }
}

/** What the log keeps of a finished task session; null for a quick one, which is logged nowhere. */
export function sessionRecord(t: TimerState): SessionRecord | null {
  if (t.phase !== 'done' || t.taskId === null) return null
  return { id: `${t.taskId}@${t.endedAt}`, taskId: t.taskId, day: t.day, endedAt: t.endedAt, minutes: minutesOf(t) }
}

/** A running session whose end has passed is done, ended when it was due — not when someone looked. */
export function settleTimer(t: TimerState, now: number): TimerState {
  if (t.phase !== 'running' || now < t.endsAt) return t
  return { phase: 'done', length: t.length, endedAt: t.endsAt, taskId: t.taskId, day: t.day }
}

/** Milliseconds left. An idle timer has the whole of the next session ahead of it. */
export function timeLeft(t: TimerState, now: number, idleLength: number): number {
  switch (t.phase) {
    case 'idle':
      return idleLength
    case 'running':
      return Math.max(0, t.endsAt - now)
    case 'paused':
      return t.left
    case 'done':
      return 0
  }
}

/**
 * «24:59», as the display shows it. Seconds round up: a fresh session shows
 * its full length, and 00:00 shows only once it's over.
 */
export function clockText(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const length = z.number().check(z.gt(0), z.lte(LENGTH_MAX * MINUTE))
const time = z.number().check(z.gte(0))
const of = { taskId: z.nullable(z.string()), day: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/)) }

const schema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('idle') }),
  z.object({ phase: z.literal('running'), length, endsAt: time, ...of }),
  z.object({ phase: z.literal('paused'), length, left: time, ...of }),
  z.object({ phase: z.literal('done'), length, endedAt: time, ...of }),
])

/** A timer read back from storage; idle for anything that isn't a sound one. */
export function parseTimer(raw: unknown): TimerState {
  const read = schema.safeParse(raw)
  if (!read.success) return IDLE
  const t = read.data
  if (t.phase === 'paused' && t.left > t.length) return IDLE
  return t
}
