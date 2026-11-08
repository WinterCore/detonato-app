import type { Icon } from '@phosphor-icons/react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: Icon
  /** What it does, for a screen reader. */
  label: string
  /** The icon's size in px. */
  size?: number
}

/** A bare icon that presses: back, close. 44px, the smallest a thumb hits. */
export function IconButton({ icon: I, label, size = 22, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn('press grid size-11 place-items-center rounded-lg text-ink-2 hover:bg-raised hover:text-ink', className)}
      {...rest}
    >
      <I size={size} />
    </button>
  )
}
