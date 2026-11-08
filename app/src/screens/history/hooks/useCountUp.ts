import { useEffect, useState } from 'react'
import { countAt } from '@/screens/history/lib/historyView'

/** How long the figures take to count up as History opens. */
const COUNT_MS = 900

/** The phone asks for less motion: the figures just show. */
const stillPlease = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Where the count starts: from nothing, or already done. */
function startProgress(): number {
  if (stillPlease()) {
    return 1
  }
  return 0
}

/**
 * The figures counting up from nothing as the screen opens, a frame at a
 * time; once there, they follow the targets as they change.
 */
export function useCountUp(targets: number[]): number[] {
  const [progress, setProgress] = useState(startProgress)

  useEffect(() => {
    if (stillPlease()) {
      return
    }
    const start = performance.now()
    const timers = { frame: 0 }
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS)
      setProgress(p)
      if (p < 1) {
        timers.frame = requestAnimationFrame(tick)
      }
    }
    timers.frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(timers.frame)
    }
    // Once, as the screen opens: the count runs on its own clock, not on each frame's render.
  }, [])

  return targets.map((n) => countAt(n, progress))
}
