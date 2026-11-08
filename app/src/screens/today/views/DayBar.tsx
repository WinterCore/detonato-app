import type { TodayView } from '@/screens/today/lib/todayView'
import { cn } from '@/ui'

/** The day so far: «2 of 7 · 50 min», and a bar of one segment per session, lit for each done. */
export function DayBar({ progress }: { progress: TodayView['progress'] }) {
  return (
    <div className="grid gap-2 px-1">
      <div className="flex justify-between gap-3 text-small">
        <span className="text-ink-2">Today</span>
        <span className="font-mono text-ink-3">{progress.line}</span>
      </div>
      <div className="flex gap-1" role="img" aria-label={progress.label}>
        {Array.from({ length: progress.total }, (_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < progress.done ? 'glow-lit bg-led' : 'bg-lvl-0')} />
        ))}
      </div>
    </div>
  )
}
