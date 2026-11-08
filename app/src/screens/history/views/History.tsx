import { CaretLeftIcon } from '@phosphor-icons/react'
import { useHistory } from '@/screens/history/hooks/useHistory'
import { IconButton, TopBar } from '@/ui'
import { DaySheet } from './DaySheet'
import { Readout } from './Readout'
import { TaskRates } from './TaskRates'
import { YearMap } from './YearMap'

/** «History»: the streak and the best, the last 12 months day by day, and each task's last 30 days. */
export function History() {
  const h = useHistory()

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col pb-[calc(32px+env(safe-area-inset-bottom))]">
      <TopBar start={<IconButton icon={CaretLeftIcon} label="Back" onClick={h.back} />} title="History" />

      {h.empty && <p className="px-5 py-6 text-ink-3">Your days show up here once you add a task.</p>}
      {!h.empty && (
        <div className="grid grid-cols-1 gap-4 px-4">
          <Readout r={h.readout} figures={h.figures} sizes={h.sizes} meter={h.meter} />
          <YearMap columns={h.columns} months={h.months} weekdays={h.weekdays} mapRef={h.mapRef} onOpen={h.openDay} />
          {h.rates.length > 0 && <TaskRates rates={h.rates} />}
        </div>
      )}

      <DaySheet detail={h.detail} onClose={h.closeDay} />
    </main>
  )
}
