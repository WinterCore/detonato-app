import type { InputHTMLAttributes } from 'react'
import { cn } from './cn'

/** A line of text to type: a task's name. */
export function Field({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('h-12.5 w-full rounded-lg border border-line bg-bg px-3.5 text-body text-ink placeholder:text-ink-3', className)}
      {...rest}
    />
  )
}
