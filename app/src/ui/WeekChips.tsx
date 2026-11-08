import { Chip } from './Chip'
import { cn } from './cn'

export interface WeekDay {
  /** 0 = Sunday … 6 = Saturday. */
  day: number
  label: string
  name: string
  on: boolean
}

/** A task's weekdays in the week's order: shown, or toggled when `onToggle` is given. */
export function WeekChips({ days, onToggle, className }: { days: WeekDay[]; onToggle?: (day: number) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1.25', className)} role={onToggle ? 'group' : undefined} aria-label={onToggle ? 'Days' : undefined}>
      {days.map((d) => (
        <Chip
          key={d.day}
          label={d.label}
          name={d.name}
          on={d.on}
          onToggle={onToggle && (() => onToggle(d.day))}
          className={onToggle ? 'flex-1' : undefined}
        />
      ))}
    </div>
  )
}
