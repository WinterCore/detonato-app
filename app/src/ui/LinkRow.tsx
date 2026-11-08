import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import { RowText } from './RowText'

export interface LinkRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: ReactNode
  meta?: ReactNode
  /** What sits at the row's end: a value and a caret, an icon. */
  end?: ReactNode
}

/** A row that opens something or does something: the whole row is the button. */
export function LinkRow({ label, meta, end, className, type = 'button', ...rest }: LinkRowProps) {
  return (
    <button
      type={type}
      className={cn('press-wide flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-start', className)}
      {...rest}
    >
      <RowText label={label} meta={meta} />
      {end && <span className="flex shrink-0 items-center gap-2 text-ink-2">{end}</span>}
    </button>
  )
}
