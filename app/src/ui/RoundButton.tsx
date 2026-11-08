import type { Icon } from '@phosphor-icons/react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

const tones = {
  /** The one thing to do: big, lit in the LED colour. */
  led: 'size-21 bg-led text-on-led shadow-led',
  /** Beside it: smaller, quiet. */
  quiet: 'size-14 bg-raised text-ink-2',
} as const

export interface RoundButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: Icon
  tone?: keyof typeof tones
  /** Under the button; also its name. Without it, `aria-label` names it. */
  caption?: string
}

/** A round control: the timer's start, pause, reset and stop. */
export function RoundButton({ icon: I, tone = 'quiet', caption, className, type = 'button', ...rest }: RoundButtonProps) {
  return (
    <button type={type} className={cn('press grid justify-items-center gap-1 text-ink-2', className)} {...rest}>
      <span className={cn('grid place-items-center rounded-full', tones[tone])}>
        <I size={tone === 'led' ? 34 : 22} weight="fill" />
      </span>
      {caption && <span className="text-meta">{caption}</span>}
    </button>
  )
}
