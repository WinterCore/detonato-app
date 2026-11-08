import { Display } from '@/components/segments'
import { METER_SEGMENTS, type Readout as ReadoutView } from '@/screens/history/lib/historyView'
import { cn } from '@/ui'

export interface ReadoutProps {
  r: ReadoutView
  /** The figures as drawn mid-count. */
  figures: { current: string; best: string; perfect: string; focus: string }
  /** The streak's size and Best's, as CSS lengths. */
  sizes: { current: string; best: string }
  /** The record meter's lit segments. */
  meter: number
}

function Figure({ label, value, unit, a11y, className }: { label: string; value: string; unit: string; a11y: string; className?: string }) {
  return (
    <div className={cn('grid content-start justify-items-start gap-2 py-4', className)}>
      <span className="eyebrow text-ink-3">{label}</span>
      <Display text={value} size="40px" label={a11y} />
      <span className="font-mono text-caption text-ink-3">{unit}</span>
    </div>
  )
}

/**
 * History's header, straight on the ground: the streak large, the best
 * beside it, a meter filling toward the best, then the year's full days
 * and focus. The figures count up as the screen opens.
 */
export function Readout({ r, figures, sizes, meter }: ReadoutProps) {
  return (
    <section aria-label="Streaks" className="grid gap-5 px-1 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="grid gap-2">
          <span className="eyebrow text-ink-3">Current streak</span>
          <span className="flex items-end gap-2.5">
            <Display text={figures.current} size={sizes.current} label={r.labels.current} />
            <span className="pb-2 font-mono text-meta text-ink-3">{r.currentUnit}</span>
          </span>
        </div>
        <div className="grid justify-items-end gap-2 pb-1">
          <span className="eyebrow text-ink-3">Best</span>
          <Display text={figures.best} size={sizes.best} label={r.labels.best} />
        </div>
      </div>

      <div className="grid gap-2.5">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: METER_SEGMENTS }, (_, i) => (
            <span key={i} className={cn('h-2 flex-1 rounded-xs transition-colors duration-150', i < meter && 'glow-lit bg-led', i >= meter && 'bg-lvl-0')} />
          ))}
        </div>
        <span className="text-small text-ink-2">{r.record}</span>
      </div>

      <div className="grid grid-cols-2 border-y border-line">
        <Figure label="Perfect days" value={figures.perfect} unit={`${r.perfectUnit} in 12 months`} a11y={r.labels.perfect} />
        <Figure label="Focus" value={figures.focus} unit={`${r.focusUnit} in 12 months`} a11y={r.labels.focus} className="border-s border-line ps-4" />
      </div>
    </section>
  )
}
