import { RATE_SEGMENTS, type Rate } from '@/screens/history/lib/historyView'
import { cn, panel } from '@/ui'

/** Each task still on the schedule: how much of its last 30 days got done, as a figure and a bar. */
export function TaskRates({ rates }: { rates: Rate[] }) {
  return (
    <section aria-labelledby="rates" className={cn('grid grid-cols-1 gap-3 p-4', panel())}>
      <h2 id="rates" className="eyebrow text-ink-3">
        Last 30 days by task
      </h2>
      {rates.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
          <span className="truncate">{r.name}</span>
          <span className="font-mono text-meta text-ink-2">{r.text}</span>
          <span className="col-span-2 flex gap-0.75" aria-hidden>
            {Array.from({ length: RATE_SEGMENTS }, (_, i) => (
              <span key={i} className={cn('h-1.5 flex-1 rounded-xs', i < r.lit && 'glow-lit bg-led', i >= r.lit && 'bg-lvl-0')} />
            ))}
          </span>
        </div>
      ))}
    </section>
  )
}
