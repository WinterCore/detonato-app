import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clockText } from '@/core/timer'
import type { TaskId } from '@/core/types'
import { beginSession } from '@/lib/startSession'
import { useSecondsLeft } from '@/lib/useSecondsLeft'
import { todayView } from '@/screens/today/lib/todayView'
import { useApp } from '@/state'

/** Today's data and what its taps do. */
export function useToday() {
  const navigate = useNavigate()
  const snap = useApp((s) => s.snap)
  const today = useApp((s) => s.today)
  const timer = useApp((s) => s.timer)
  const settings = useApp((s) => s.settings)
  const view = useMemo(() => todayView(snap, today, timer, settings), [snap, today, timer, settings])
  const secondsLeft = useSecondsLeft(timer.phase === 'running' ? timer.endsAt : null)
  const [notTodayOpen, setNotTodayOpen] = useState(false)

  /** The session under way, on its card: «24:18». */
  let clock: string | null = null
  if (timer.phase === 'running' && secondsLeft !== null) clock = clockText(secondsLeft * 1000)
  else if (timer.phase === 'paused') clock = clockText(timer.left)

  const begin = (taskId: TaskId | null, minutes: number) => void beginSession(taskId, minutes).then(() => navigate('/timer'))

  return {
    ...view,
    clock,
    notTodayOpen,
    /** The streak sweeps on once the day is cleared. */
    sweep: view.progress.cleared ? 1 : undefined,

    start: (card: { id: TaskId; minutes: number }) => begin(card.id, card.minutes),
    /** The hero's button: the next task's next session. */
    startNext: () => {
      if (view.hero.kind === 'next') begin(view.hero.card.id, view.hero.card.minutes)
    },
    startQuick: () => begin(null, view.quick.minutes),
    openTimer: () => navigate('/timer'),
    openTasks: () => navigate('/tasks'),
    openHistory: () => navigate('/history'),
    addTask: () => navigate('/tasks', { state: { newTask: true } }),
    openSettings: () => navigate('/settings'),
    toggleNotToday: () => setNotTodayOpen((o) => !o),
  }
}
