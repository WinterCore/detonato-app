import { cn } from './cn'

export interface SegmentedOption<T> {
  value: T
  label: string
  checked: boolean
}

export interface SegmentedProps<T> {
  options: SegmentedOption<T>[]
  onPick: (value: T) => void
  /** The id of the label that names the group. */
  labelledBy: string
  /** Across the whole width, the choices sharing it. */
  wide?: boolean
}

/** A few choices side by side, one of them on. */
export function Segmented<T extends string | number>({ options, onPick, labelledBy, wide }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn('gap-0.75 rounded-md border border-line bg-bg p-0.75', wide ? 'flex w-full' : 'inline-flex')}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.checked}
          className={cn(
            'press min-h-8 rounded-sm px-3 text-small',
            wide && 'flex-1',
            o.checked ? 'bg-raised text-ink shadow-pressed' : 'text-ink-2',
          )}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
