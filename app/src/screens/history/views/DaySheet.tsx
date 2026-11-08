import { Display } from '@/components/segments'
import type { DayDetail } from '@/screens/history/lib/historyView'
import { Button, Pips, Sheet } from '@/ui'

/** A day from the map: its sessions done in segments, then each task's part, by the plan it had then. */
export function DaySheet({ detail, onClose }: { detail: DayDetail | null; onClose: () => void }) {
  if (!detail) {
    return null
  }
  return (
    <Sheet open onClose={onClose} title={detail.date} line={detail.weekday}>
      <div className="grid gap-4">
        {detail.rest && <p className="text-ink-2">Nothing was scheduled this day.</p>}
        {!detail.rest && (
          <div className="flex items-center justify-between rounded-xl bg-window px-4 py-4 shadow-window">
            <Display text={detail.text} size="40px" dimMarks label={detail.label} />
            <span className="grid justify-items-end">
              <span className="eyebrow text-ink-3">Sessions</span>
              <span className="font-mono text-lead text-led">{detail.percent}</span>
            </span>
          </div>
        )}
        <ul>
          {detail.rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-t border-line py-3">
              <span className="grid min-w-0 gap-1.5">
                <span className="truncate">{r.name}</span>
                <Pips total={r.total} done={r.done} />
              </span>
              <span className="shrink-0 font-mono text-meta text-ink-2">{r.line}</span>
            </li>
          ))}
          {detail.others.map((o) => (
            <li key={o.id} className="grid gap-0.5 border-t border-line py-3 text-ink-3">
              <span className="truncate">{o.name}</span>
              <span className="font-mono text-meta">{o.line}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button className="mt-2 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  )
}
