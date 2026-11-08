import type { ReactNode } from 'react'
import { cn } from './cn'
import { RowText } from './RowText'

export interface RowProps {
  label: ReactNode
  meta?: ReactNode
  /** The label's id, for a control that names itself by it (`aria-labelledby`). */
  labelId?: string
  /** The control at the row's end. */
  children: ReactNode
  className?: string
}

/** A setting in a card: its words at the start, its control at the end. The row itself doesn't press. */
export function Row({ label, meta, labelId, children, className }: RowProps) {
  return (
    <div className={cn('flex min-h-14 items-center justify-between gap-3 px-4 py-2', className)}>
      <RowText label={label} meta={meta} id={labelId} />
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}
