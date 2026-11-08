import type { RefObject } from 'react'
import type { DayKey } from '@/core/time/calendar'
import type { HeatCell, HistoryView } from '@/screens/history/lib/historyView'
import { Cell, cn, panel, type CellLevel } from '@/ui'

const SHADES: CellLevel[] = ['l0', 'l1', 'l2', 'l3', 'l4']

/** A day on the map: a button the size of its square and the gap around it, when it opens a day. */
function Day({ cell, onOpen }: { cell: HeatCell; onOpen: (day: DayKey) => void }) {
  const square = <Cell level={cell.level} today={cell.today} size={13} />
  if (!cell.open) {
    return <span className="grid size-4 place-items-center">{square}</span>
  }
  return (
    <button type="button" className="press grid size-4 place-items-center" aria-label={cell.label} onClick={() => onOpen(cell.day)}>
      {square}
    </button>
  )
}

function Legend() {
  return (
    <div className="flex items-center justify-between font-mono text-caption text-ink-3">
      <span className="flex items-center gap-1.25">
        Less
        {SHADES.map((l) => (
          <Cell key={l} level={l} size={11} />
        ))}
        More
      </span>
      <span className="flex items-center gap-1.25">
        <Cell level="rest" size={11} />
        Rest day
      </span>
    </div>
  )
}

/** The last 12 months: a column a week, a square a day; it scrolls sideways and opens at today. */
export function YearMap({
  columns,
  months,
  weekdays,
  mapRef,
  onOpen,
}: Pick<HistoryView, 'columns' | 'months' | 'weekdays'> & { mapRef: RefObject<HTMLDivElement | null>; onOpen: (day: DayKey) => void }) {
  return (
    <section aria-labelledby="year" className={cn('grid grid-cols-1 gap-3 p-4', panel())}>
      <div className="flex items-baseline justify-between">
        <h2 id="year" className="eyebrow text-ink-3">
          Last 12 months
        </h2>
        <span className="font-mono text-caption text-ink-3">Tap a day</span>
      </div>
      <div className="flex gap-1.5">
        <div className="grid shrink-0 grid-rows-[16px_repeat(7,16px)]" aria-hidden>
          <span />
          {weekdays.map((l, i) => (
            <span key={i} className="font-mono text-micro leading-4 text-ink-3">
              {l}
            </span>
          ))}
        </div>
        <div ref={mapRef} className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max">
            {columns.map((col, c) => (
              <div key={col[0].day} className="grid grid-rows-[16px_repeat(7,16px)]">
                <span className="w-4 font-mono text-micro leading-4 whitespace-nowrap text-ink-3" aria-hidden>
                  {months[c]}
                </span>
                {col.map((cell) => (
                  <Day key={cell.day} cell={cell} onOpen={onOpen} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Legend />
    </section>
  )
}
