import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { glyphById } from '@/core/segments/glyphs'
import type { TaskId } from '@/core/types'
import { tick } from '@/lib/haptics'
import { primeAudio } from '@/lib/sound'
import { beginSession } from '@/lib/startSession'
import { useSecondsLeft } from '@/lib/useSecondsLeft'
import { useBack, useLeaveWhen } from '@/navigation/back'
import { justStarted, timerView, type HourCycle } from '@/screens/timer/lib/timerView'
import { closeSession, pauseSession, resetSession, resumeSession, stopSession, useApp } from '@/state'

/** The phone's clock, 12- or 24-hour, as its locale has it. */
const HOUR_CYCLE: HourCycle = /h1[12]/.test(new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle ?? 'h12')
  ? 'h12'
  : 'h23'

/**
 * The timer screen's data and what its taps do; null with no session. Then
 * the screen leaves, back the way it came: stopped, put away, stopped from
 * the notification, or opened with none.
 */
export function useTimer() {
  const navigate = useNavigate()
  const back = useBack('/')
  const timer = useApp((s) => s.timer)
  const snap = useApp((s) => s.snap)
  const settings = useApp((s) => s.settings)
  const secondsLeft = useSecondsLeft(timer.phase === 'running' ? timer.endsAt : null)
  // A new session sweeps the display on, segment by segment: the screen opening on one just started, and
  // each started from the done screen. Resumed or reopened, a session carries on as it was.
  const [sweep, setSweep] = useState<number | undefined>(() => (justStarted(timer, Date.now()) ? 0 : undefined))
  const swept = () => setSweep((n) => (n ?? 0) + 1)
  useLeaveWhen(timer.phase === 'idle', '/')

  if (timer.phase === 'idle') return null
  const view = timerView(timer, secondsLeft === null ? null : secondsLeft * 1000, snap, settings, glyphById(settings.styleId), HOUR_CYCLE)

  return {
    ...view,
    sweep,
    /** The screen is being held on: shown in the top bar. */
    awake: timer.phase === 'running' && settings.keepAwake,

    /** Back where it was opened from, Today as a rule; the session carries on. */
    back,
    openSettings: () => navigate('/settings'),
    pause: () => {
      void pauseSession()
      tick()
    },
    /** Carries on where it was held: the display keeps its digits. */
    resume: () => {
      primeAudio()
      void resumeSession()
      tick()
    },
    reset: () => {
      void resetSession()
      tick()
    },
    /** Called off, nothing kept; the screen leaves with it. */
    stop: () => {
      void stopSession()
      tick()
    },
    /** The done screen's next session, right here. */
    again: (again: { taskId: TaskId | null; minutes: number }) => {
      void beginSession(again.taskId, again.minutes).then(swept)
    },
    /** The done screen put away; the screen leaves with it. */
    close: () => void closeSession(),
  }
}
