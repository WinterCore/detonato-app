import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export interface SwatchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'color'> {
  /** The colour shown, as CSS. */
  color: string
  /** Its name, for a screen reader. */
  label: string
  checked: boolean
}

/** One colour to choose. Put it inside `role="radiogroup"`. */
export function Swatch({ color, label, checked, className, type = 'button', ...rest }: SwatchProps) {
  return (
    <button
      type={type}
      role="radio"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'press grid size-9 place-items-center rounded-md border bg-bg',
        checked ? 'border-ink-2' : 'border-line',
        className,
      )}
      {...rest}
    >
      <span className="size-4 rounded-[5px]" style={{ background: color }} />
    </button>
  )
}
