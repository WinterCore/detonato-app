import { cn } from './cn'

export interface ChipProps {
  label: string
  on: boolean
  /** A chip that toggles; without it, the chip only shows. */
  onToggle?: () => void
  /** Its whole name, for a screen reader: «Thursday». */
  name?: string
  className?: string
}

const look = (on: boolean) => (on ? 'bg-led-fill text-led shadow-chip-on' : 'bg-raised text-ink-3')

/** A weekday, on or off: shown on a task, toggled in the editor. */
export function Chip({ label, on, onToggle, name, className }: ChipProps) {
  if (!onToggle) {
    return (
      <span className={cn('inline-grid h-6 w-9.5 place-items-center rounded-[7px] font-mono text-[11px]', look(on), className)}>
        {label}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={name}
      className={cn('press inline-grid h-7.5 min-w-8.5 place-items-center rounded-sm px-1.5 font-mono text-[12px]', look(on), className)}
      onClick={onToggle}
    >
      {label}
    </button>
  )
}
