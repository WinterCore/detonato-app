import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

const tones = {
  /** The one thing to do: lit in the LED colour. */
  led: 'bg-led font-semibold text-on-led shadow-led',
  /** Anything else. */
  quiet: 'bg-raised font-medium text-ink',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: keyof typeof tones
}

export function Button({ tone = 'quiet', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cn('press min-h-13 rounded-xl px-5.5', tones[tone], className)} {...rest} />
}
