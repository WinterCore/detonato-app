import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import { RowText } from './RowText'

export interface SwitchRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  checked: boolean
  label: ReactNode
  meta?: ReactNode
}

/** A setting that's on or off: the whole row is the switch, its knob at the end, LED-lit when on. */
export function SwitchRow({ checked, label, meta, className, type = 'button', ...rest }: SwitchRowProps) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      className={cn('press-wide flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-start', className)}
      {...rest}
    >
      <RowText label={label} meta={meta} />
      <span
        aria-hidden
        className={cn(
          'flex h-7.5 w-12.5 shrink-0 items-center rounded-full transition-colors duration-150',
          checked ? 'bg-led-track' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'size-6 rounded-full transition-[translate,background-color] duration-150 ease-soft',
            checked ? 'translate-x-5.5 bg-on-led' : 'translate-x-0.75 bg-ink-2',
          )}
        />
      </span>
    </button>
  )
}
