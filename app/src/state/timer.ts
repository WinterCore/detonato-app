import { dayKey } from '@/core/time/calendar'
import {
  IDLE,
  pauseTimer,
  resetTimer,
  resumeTimer,
  sessionRecord,
  settleTimer,
  startTimer,
  type TimerState,
} from '@/core/timer'
import type { TaskId } from '@/core/types'
import { writeTimer } from '@/storage/timer'
import { SAVE_FAILED, toast } from './feedback'
import { get, set } from './store'
import { db, serial } from './writes'

/*
 * The session timer's moves. Each runs in the write queue: a task session
 * that a move finds ended (its end passed — say a pause tapped just after)
 * is logged first, then the timer is saved and put in the store. The screen
 * draws from it, and `lib/session` does the rest — the end on time, the
 * notification, the screen kept on, the sound.
 */

/**
 * The timer as `next`, after logging its session if it has just ended. The
 * log's id is the task and the end, so a session logged twice — a crash
 * between the two writes, then boot settling it again — is still one.
 */
export async function logEnded(next: TimerState, action = 'timer/end'): Promise<void> {
  const record = get().timer.phase === 'done' ? null : sessionRecord(next)
  if (record) {
    try {
      await db().putSession(record)
    } catch (err) {
      console.error(err)
      toast(SAVE_FAILED)
      return // still running past its end: the next settle tries again
    }
  }
  writeTimer(next)
  set(action, (s) => {
    if (!record || s.snap.sessions.some((r) => r.id === record.id)) return { timer: next }
    return { timer: next, snap: { ...s.snap, sessions: [...s.snap.sessions, record] } }
  })
}

function move(action: string, next: (t: TimerState, now: number) => TimerState): Promise<void> {
  return serial(async () => {
    const prev = get().timer
    const t = next(prev, Date.now())
    if (t !== prev) await logEnded(t, `timer/${action}`)
  })
}

/** A new session of `minutes`: a task's, or a quick one (`taskId` null). It counts for the day it starts on. */
export const startSession = (taskId: TaskId | null, minutes: number) =>
  move('start', (_, now) => startTimer(minutes, now, { taskId, day: dayKey(new Date(now)) }))
export const pauseSession = () => move('pause', pauseTimer)
export const resumeSession = () => move('resume', resumeTimer)
export const resetSession = () => move('reset', resetTimer)
/** Called off: nothing is kept of it. */
export const stopSession = () => move('stop', () => IDLE)
/** A session whose end has passed is done, and a task's is logged. Run on time by `lib/session`, and whenever the app comes back. */
export const settleSession = () => move('end', settleTimer)
/** The done screen put away. */
export const closeSession = () => move('close', () => IDLE)
