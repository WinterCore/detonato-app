import { CaretDownIcon } from '@phosphor-icons/react'
import type { TodayView } from '@/screens/today/lib/todayView'
import { cn, panel, WeekChips } from '@/ui'

/** The tasks that rest today, folded away: their names and days when opened. */
export function NotToday({ tasks, open, onToggle }: { tasks: TodayView['notToday']; open: boolean; onToggle: () => void }) {
  if (!tasks.length) return null
  return (
    <div className={panel()}>
      <button
        type="button"
        aria-expanded={open}
        className="press-wide flex h-13 w-full items-center justify-between px-4 text-ink-2"
        onClick={onToggle}
      >
        <span>Not today · {tasks.length}</span>
        <CaretDownIcon size={20} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {tasks.map((t) => (
            <li key={t.id} className="grid gap-2 px-4 py-3">
              <span className="text-ink-2">{t.name}</span>
              <WeekChips days={t.days} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
