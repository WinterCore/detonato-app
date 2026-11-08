import { MinusIcon, PlusIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export interface StepperProps {
  /** The value between the buttons, already drawn. */
  children: ReactNode
  lessLabel: string
  moreLabel: string
  onLess: () => void
  onMore: () => void
  /** At an end: that button can't press. */
  atMin?: boolean
  atMax?: boolean
}

const button = 'press grid size-10 place-items-center rounded-md bg-raised text-ink disabled:text-ink-3'

/** A value with a button either side to move it a step. */
export function Stepper({ children, lessLabel, moreLabel, onLess, onMore, atMin, atMax }: StepperProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <button type="button" className={button} aria-label={lessLabel} disabled={atMin} onClick={onLess}>
        <MinusIcon size={16} weight="bold" />
      </button>
      {children}
      <button type="button" className={button} aria-label={moreLabel} disabled={atMax} onClick={onMore}>
        <PlusIcon size={16} weight="bold" />
      </button>
    </span>
  )
}
