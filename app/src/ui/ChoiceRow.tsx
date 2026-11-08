import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export interface ChoiceRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  checked: boolean
  label: ReactNode
}

/** One option of a list where one is on. Put it inside `role="radiogroup"`. */
export function ChoiceRow({ checked, label, className, type = 'button', ...rest }: ChoiceRowProps) {
  return (
    <button
      type={type}
      role="radio"
      aria-checked={checked}
      className={cn(
        'press-wide flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-start',
        checked ? 'bg-led-fill text-ink' : 'text-ink-2 hover:bg-raised',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'size-4 shrink-0 rounded-full border-[1.5px] transition-[border-color,box-shadow] duration-200',
          checked ? 'border-led bg-led shadow-[inset_0_0_0_3px_var(--led-fill)]' : 'border-ink-3',
        )}
      />
      <span className="text-body">{label}</span>
    </button>
  )
}
